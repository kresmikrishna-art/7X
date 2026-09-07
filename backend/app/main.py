import os
import re
import json
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, or_
from sqlalchemy.orm import Session

from . import geocoding
from .database import get_db
from .models import PostalZone, PostalGrid, Address
from .schemas import (
    ZoneCreate, ZoneAutoCreate, ZoneOut, GridCreate, GridOut, AddressCreate, AddressOut, SpatialResolveOut,
    CanonicalS42Out, GeocodeOut, ReverseGeocodeOut, GeocodeComponents, AddressMatchOut,
)

EMIRATE_CODES = {
    "Dubai": "DXB",
    "Abu Dhabi": "AUH",
    "Sharjah": "SHJ",
    "Ajman": "AJM",
    "Umm Al Quwain": "UAQ",
    "Ras Al Khaimah": "RAK",
    "Fujairah": "FUJ",
}

def generate_zone_identifiers(db: Session, emirate: str) -> tuple[str, str]:
    """Auto-generate a unique zone_id (Z-<emirate code>-<NN>) and postal_code
    (<emirate code>-<NNNNN>), following the same structured, emirate-coded
    pattern used throughout the seed data, rather than free-typed values."""
    code = EMIRATE_CODES.get(emirate.strip(), (emirate.strip()[:3] or "GEN").upper())

    zone_nums = []
    for (zid,) in db.query(PostalZone.zone_id).filter(PostalZone.zone_id.like(f"Z-{code}-%")).all():
        m = re.match(rf"^Z-{re.escape(code)}-(\d+)$", zid)
        if m:
            zone_nums.append(int(m.group(1)))
    next_zone_num = max(zone_nums, default=0) + 1

    pc_nums = []
    for (pc,) in db.query(PostalZone.postal_code).filter(PostalZone.postal_code.like(f"{code}-%")).all():
        m = re.match(rf"^{re.escape(code)}-(\d+)$", pc)
        if m:
            pc_nums.append(int(m.group(1)))
    next_pc_num = max(pc_nums, default=9999) + 1

    zone_id = f"Z-{code}-{next_zone_num:02d}"
    while db.query(PostalZone).filter(PostalZone.zone_id == zone_id).first():
        next_zone_num += 1
        zone_id = f"Z-{code}-{next_zone_num:02d}"

    postal_code = f"{code}-{next_pc_num}"
    while db.query(PostalZone).filter(PostalZone.postal_code == postal_code).first():
        next_pc_num += 1
        postal_code = f"{code}-{next_pc_num}"

    return zone_id, postal_code

app = FastAPI(title="UAE Address & Postal Code API", version="1.0.0")

origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if x.strip()]
origin_regex = os.getenv("CORS_ORIGIN_REGEX", "").strip() or None
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def canonical_s42(a: Address) -> CanonicalS42Out:
    """Build the UPU S42-aligned canonical rendition from structured fields.
    Lines follow the S42 addressee / delivery-point / locality / country pattern.
    This is an S42-aligned demo rendition, not a certified UAE S42 Part B template."""
    unit = " ".join(x for x in [a.unit_type, a.unit_number] if x).strip()
    building = " ".join(x for x in [a.building_number, a.building_name] if x).strip()
    street = " ".join(x for x in [a.street_name, a.street_type] if x).strip()
    return CanonicalS42Out(
        line1=" ".join(x for x in [a.recipient_name, a.organization_name] if x).strip(),
        line2=", ".join(x for x in [unit, building] if x),
        line3=street,
        line4=", ".join(x for x in [a.area_locality, a.emirate_admin_area, a.postal_code] if x),
        line5=a.country_name,
        template_version=a.template_version,
    )

def formatted_address(a: Address) -> str:
    s42 = canonical_s42(a)
    return "\n".join(x for x in [s42.line1, s42.line2, s42.line3, s42.line4, s42.line5] if x)

def address_out(a: Address) -> AddressOut:
    data = {c.name: getattr(a, c.name) for c in a.__table__.columns}
    return AddressOut(**data, formatted_address=formatted_address(a), canonical_s42=canonical_s42(a))

def nearest_address(db: Session, lat: float, lng: float) -> Address | None:
    row = db.execute(text("""
        SELECT id FROM address
        ORDER BY point <-> ST_SetSRID(ST_Point(:lng,:lat),4326)
        LIMIT 1
    """), {"lat": lat, "lng": lng}).mappings().first()
    if not row:
        return None
    return db.query(Address).filter(Address.id == row["id"]).first()

PIN_MATCH_RADIUS_METERS = 100

def nearest_address_within(db: Session, lat: float, lng: float, radius_meters: float) -> tuple[Address | None, float | None]:
    """Nearest address row, but only if it's within radius_meters -- unlike
    nearest_address(), which always returns the closest row regardless of how
    far away it actually is."""
    row = db.execute(text("""
        SELECT id, ST_Distance(point::geography, ST_SetSRID(ST_Point(:lng,:lat),4326)::geography) AS distance_m
        FROM address
        ORDER BY point <-> ST_SetSRID(ST_Point(:lng,:lat),4326)
        LIMIT 1
    """), {"lat": lat, "lng": lng}).mappings().first()
    if not row or row["distance_m"] > radius_meters:
        return None, None
    a = db.query(Address).filter(Address.id == row["id"]).first()
    return a, row["distance_m"]

COORD_PATTERN = re.compile(r"^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$")

def resolve_point(db: Session, lat: float, lng: float):
    return db.execute(text("""
        SELECT g.grid_id, g.zone_id, g.area, z.postal_code
        FROM postal_grid g
        JOIN postal_zone z ON z.zone_id = g.zone_id
        WHERE g.status = 'Active'
          AND ST_Covers(g.geom, ST_SetSRID(ST_Point(:lng,:lat),4326))
        LIMIT 1
    """), {"lat": lat, "lng": lng}).mappings().first()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/v1/postcodes", response_model=list[ZoneOut])
def list_postcodes(db: Session = Depends(get_db)):
    zones = db.query(PostalZone).order_by(PostalZone.zone_id).all()
    out = []
    for z in zones:
        out.append(ZoneOut(
            id=z.id,
            zone_id=z.zone_id,
            zone_name=z.zone_name,
            postal_code=z.postal_code,
            emirate=z.emirate,
            status=z.status,
            grid_count=db.query(PostalGrid).filter(PostalGrid.zone_id == z.zone_id).count(),
            address_count=db.query(Address).filter(Address.zone_id == z.zone_id).count(),
        ))
    return out

@app.post("/api/v1/postcodes", response_model=ZoneOut)
def create_postcode(payload: ZoneAutoCreate, db: Session = Depends(get_db)):
    zone_id, postal_code = generate_zone_identifiers(db, payload.emirate)
    z = PostalZone(
        zone_id=zone_id, zone_name=payload.zone_name, postal_code=postal_code,
        emirate=payload.emirate, status=payload.status,
    )
    db.add(z)
    db.commit()
    db.refresh(z)
    return ZoneOut(
        id=z.id, zone_id=zone_id, zone_name=payload.zone_name, postal_code=postal_code,
        emirate=payload.emirate, status=payload.status, grid_count=0, address_count=0,
    )

@app.put("/api/v1/postcodes/{postal_code}", response_model=ZoneOut)
def update_postcode(postal_code: str, payload: ZoneCreate, db: Session = Depends(get_db)):
    z = db.query(PostalZone).filter(PostalZone.postal_code == postal_code).first()
    if not z:
        raise HTTPException(404, "Postcode not found")
    old_zone, old_postcode = z.zone_id, z.postal_code
    for k, v in payload.model_dump().items():
        setattr(z, k, v)
    db.flush()
    db.execute(text("UPDATE postal_grid SET zone_id=:new_zone WHERE zone_id=:old_zone"),
               {"new_zone": payload.zone_id, "old_zone": old_zone})
    db.execute(text("""
        UPDATE address
        SET zone_id=:new_zone, postal_code=:new_postcode
        WHERE zone_id=:old_zone OR postal_code=:old_postcode
    """), {
        "new_zone": payload.zone_id, "new_postcode": payload.postal_code,
        "old_zone": old_zone, "old_postcode": old_postcode
    })
    db.commit()
    db.refresh(z)
    return ZoneOut(
        id=z.id, **payload.model_dump(),
        grid_count=db.query(PostalGrid).filter(PostalGrid.zone_id == z.zone_id).count(),
        address_count=db.query(Address).filter(Address.zone_id == z.zone_id).count()
    )

@app.get("/api/v1/grids", response_model=list[GridOut])
def list_grids(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT g.id, g.grid_id, g.zone_id, g.area, g.status, g.center_lat, g.center_lng,
               z.postal_code,
               ST_AsGeoJSON(g.geom)::json AS geometry,
               COUNT(a.id)::int AS address_count
        FROM postal_grid g
        JOIN postal_zone z ON z.zone_id = g.zone_id
        LEFT JOIN address a ON a.grid_id = g.grid_id
        GROUP BY g.id, z.postal_code
        ORDER BY g.grid_id
    """)).mappings().all()
    return [GridOut(**dict(r)) for r in rows]

@app.post("/api/v1/grids", response_model=GridOut)
def create_grid(payload: GridCreate, db: Session = Depends(get_db)):
    if db.query(PostalGrid).filter(PostalGrid.grid_id == payload.grid_id).first():
        raise HTTPException(409, "Grid ID already exists")
    z = db.query(PostalZone).filter(PostalZone.zone_id == payload.zone_id).first()
    if not z:
        raise HTTPException(400, "Unknown zone")
    if not payload.geometry:
        raise HTTPException(400, "geometry is required")
    new_id = db.execute(text("""
        INSERT INTO postal_grid(grid_id, zone_id, area, status, center_lat, center_lng, geom)
        VALUES (:grid_id,:zone_id,:area,:status,:lat,:lng,ST_SetSRID(ST_GeomFromGeoJSON(:geom),4326))
        RETURNING id
    """), {
        "grid_id":payload.grid_id, "zone_id":payload.zone_id, "area":payload.area,
        "status":payload.status, "lat":payload.center_lat, "lng":payload.center_lng,
        "geom":json.dumps(payload.geometry)
    }).scalar_one()
    db.commit()
    return GridOut(id=new_id, **payload.model_dump(), postal_code=z.postal_code, address_count=0)

@app.put("/api/v1/grids/{grid_id}", response_model=GridOut)
def update_grid(grid_id: str, payload: GridCreate, db: Session = Depends(get_db)):
    z = db.query(PostalZone).filter(PostalZone.zone_id == payload.zone_id).first()
    if not z:
        raise HTTPException(400, "Unknown zone")
    if not payload.geometry:
        raise HTTPException(400, "geometry is required")
    row_id = db.execute(text("""
        UPDATE postal_grid
        SET grid_id=:new_grid_id, zone_id=:zone_id, area=:area, status=:status,
            center_lat=:lat, center_lng=:lng,
            geom=ST_SetSRID(ST_GeomFromGeoJSON(:geom),4326)
        WHERE grid_id=:old_grid_id
        RETURNING id
    """), {
        "new_grid_id":payload.grid_id, "zone_id":payload.zone_id, "area":payload.area,
        "status":payload.status, "lat":payload.center_lat, "lng":payload.center_lng,
        "geom":json.dumps(payload.geometry), "old_grid_id":grid_id
    }).scalar()
    if not row_id:
        raise HTTPException(404, "Grid not found")
    db.execute(text("UPDATE address SET grid_id=:new_grid WHERE grid_id=:old_grid"),
               {"new_grid":payload.grid_id,"old_grid":grid_id})
    db.commit()
    return GridOut(
        id=row_id, **payload.model_dump(), postal_code=z.postal_code,
        address_count=db.query(Address).filter(Address.grid_id == payload.grid_id).count()
    )

@app.get("/api/v1/spatial/resolve", response_model=SpatialResolveOut)
def spatial_resolve(lat: float = Query(...), lng: float = Query(...), db: Session = Depends(get_db)):
    r = resolve_point(db, lat, lng)
    if not r:
        return SpatialResolveOut(found=False)
    return SpatialResolveOut(found=True, **dict(r))

@app.get("/api/v1/addresses", response_model=list[AddressOut])
def list_addresses(db: Session = Depends(get_db)):
    return [address_out(a) for a in db.query(Address).order_by(Address.address_id).all()]

@app.get("/api/v1/addresses/search", response_model=list[AddressOut])
def search_addresses(q: str, db: Session = Depends(get_db)):
    coord = COORD_PATTERN.match(q)
    if coord:
        a = nearest_address(db, float(coord.group(1)), float(coord.group(2)))
        return [address_out(a)] if a else []

    like = f"%{q}%"
    rows = db.query(Address).filter(or_(
        Address.address_id.ilike(like),
        Address.building_name.ilike(like),
        Address.street_name.ilike(like),
        Address.area_locality.ilike(like),
        Address.postal_code.ilike(like),
        Address.makani_number.ilike(like),
        Address.onwani_reference.ilike(like),
        Address.organization_name.ilike(like),
        Address.search_aliases.ilike(like),
    )).order_by(Address.address_id).limit(50).all()
    return [address_out(a) for a in rows]

@app.get("/api/v1/addresses/match", response_model=AddressMatchOut)
def match_address(lat: float = Query(...), lng: float = Query(...), db: Session = Depends(get_db)):
    """Drop-a-pin lookup: returns the verified system address if one exists
    within PIN_MATCH_RADIUS_METERS of the point, otherwise Google's raw
    reverse-geocoded address plus a warning that it isn't in the system yet."""
    spatial = resolve_point(db, lat, lng)
    matched_address, distance_m = nearest_address_within(db, lat, lng, PIN_MATCH_RADIUS_METERS)

    google_formatted = None
    google_components = None
    google_place_name = None
    try:
        g = geocoding.reverse_geocode(lat, lng)
        google_formatted = g["formatted_address"]
        google_components = GeocodeComponents(**g["components"])
        google_place_name = g.get("place_name")
    except HTTPException:
        pass  # Google reverse geocoding is optional (needs GOOGLE_MAPS_API_KEY) -- degrade gracefully.

    common = dict(
        google_formatted_address=google_formatted,
        google_place_name=google_place_name,
        google_components=google_components,
        grid_id=spatial["grid_id"] if spatial else None,
        zone_id=spatial["zone_id"] if spatial else None,
        postal_code=spatial["postal_code"] if spatial else None,
        area=spatial["area"] if spatial else None,
    )

    if matched_address:
        return AddressMatchOut(
            matched=True,
            address=address_out(matched_address),
            distance_meters=round(distance_m, 1),
            **common,
        )

    return AddressMatchOut(
        matched=False,
        warning="Address not listed in system",
        **common,
    )

@app.get("/api/v1/addresses/{address_id}", response_model=AddressOut)
def get_address(address_id: str, db: Session = Depends(get_db)):
    a = db.query(Address).filter(Address.address_id == address_id).first()
    if not a:
        raise HTTPException(404, "Address not found")
    return address_out(a)

@app.post("/api/v1/addresses", response_model=AddressOut)
def create_address(payload: AddressCreate, db: Session = Depends(get_db)):
    if db.query(Address).filter(Address.address_id == payload.address_id).first():
        raise HTTPException(409, "Address ID already exists")
    r = resolve_point(db, payload.latitude, payload.longitude)
    if not r:
        raise HTTPException(400, "Selected point is outside the configured postal grid")
    data = payload.model_dump()
    data.update(grid_id=r["grid_id"], zone_id=r["zone_id"], postal_code=r["postal_code"])
    a = Address(**data)
    db.add(a)
    db.flush()
    db.execute(text("""
        UPDATE address
        SET point=ST_SetSRID(ST_Point(:lng,:lat),4326)
        WHERE id=:id
    """), {"lng":data["longitude"],"lat":data["latitude"],"id":a.id})
    db.commit()
    db.refresh(a)
    return address_out(a)

@app.put("/api/v1/addresses/{address_id}", response_model=AddressOut)
def update_address(address_id: str, payload: AddressCreate, db: Session = Depends(get_db)):
    a = db.query(Address).filter(Address.address_id == address_id).first()
    if not a:
        raise HTTPException(404, "Address not found")
    r = resolve_point(db, payload.latitude, payload.longitude)
    if not r:
        raise HTTPException(400, "Selected point is outside the configured postal grid")
    data = payload.model_dump()
    data.update(grid_id=r["grid_id"], zone_id=r["zone_id"], postal_code=r["postal_code"])
    for k, v in data.items():
        setattr(a, k, v)
    db.flush()
    db.execute(text("""
        UPDATE address
        SET point=ST_SetSRID(ST_Point(:lng,:lat),4326)
        WHERE id=:id
    """), {"lng":data["longitude"],"lat":data["latitude"],"id":a.id})
    db.commit()
    db.refresh(a)
    return address_out(a)

@app.delete("/api/v1/addresses/{address_id}", status_code=204)
def delete_address(address_id: str, db: Session = Depends(get_db)):
    a = db.query(Address).filter(Address.address_id == address_id).first()
    if not a:
        raise HTTPException(404, "Address not found")
    db.delete(a)
    db.commit()

@app.delete("/api/v1/grids/{grid_id}", status_code=204)
def delete_grid(grid_id: str, db: Session = Depends(get_db)):
    g = db.query(PostalGrid).filter(PostalGrid.grid_id == grid_id).first()
    if not g:
        raise HTTPException(404, "Grid not found")
    if db.query(Address).filter(Address.grid_id == grid_id).count() > 0:
        raise HTTPException(409, "Cannot delete a grid that still has linked addresses")
    db.delete(g)
    db.commit()

@app.delete("/api/v1/postcodes/{postal_code}", status_code=204)
def delete_postcode(postal_code: str, db: Session = Depends(get_db)):
    z = db.query(PostalZone).filter(PostalZone.postal_code == postal_code).first()
    if not z:
        raise HTTPException(404, "Postcode not found")
    if db.query(PostalGrid).filter(PostalGrid.zone_id == z.zone_id).count() > 0:
        raise HTTPException(409, "Cannot delete a postcode that still has linked grids")
    if db.query(Address).filter(Address.zone_id == z.zone_id).count() > 0:
        raise HTTPException(409, "Cannot delete a postcode that still has linked addresses")
    db.delete(z)
    db.commit()

@app.get("/api/v1/geocode", response_model=GeocodeOut)
def geocode(address: str = Query(...)):
    result = geocoding.forward_geocode(address)
    return GeocodeOut(**{**result, "components": GeocodeComponents(**result["components"])})

@app.get("/api/v1/reverse-geocode", response_model=ReverseGeocodeOut)
def reverse_geocode(lat: float = Query(...), lng: float = Query(...), db: Session = Depends(get_db)):
    result = geocoding.reverse_geocode(lat, lng)
    spatial = resolve_point(db, lat, lng)
    return ReverseGeocodeOut(
        **{**result, "components": GeocodeComponents(**result["components"])},
        grid_id=spatial["grid_id"] if spatial else None,
        zone_id=spatial["zone_id"] if spatial else None,
        postal_code=spatial["postal_code"] if spatial else None,
        area=spatial["area"] if spatial else None,
    )

@app.get("/api/v1/address-identifiers/{id_type}/{value}", response_model=AddressOut)
def resolve_identifier(id_type: str, value: str, db: Session = Depends(get_db)):
    if id_type == "makani":
        a = db.query(Address).filter(Address.makani_number == value).first()
    elif id_type == "onwani":
        a = db.query(Address).filter(Address.onwani_reference == value).first()
    else:
        raise HTTPException(400, "id_type must be 'makani' or 'onwani'")
    if not a:
        raise HTTPException(404, "No address is mapped to this identifier")
    return address_out(a)
