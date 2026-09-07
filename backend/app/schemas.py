from pydantic import BaseModel, ConfigDict
from typing import Optional, Any

class ZoneBase(BaseModel):
    zone_id: str
    zone_name: str
    postal_code: str
    emirate: str = "Dubai"
    status: str = "Active"

class ZoneCreate(ZoneBase):
    pass

class ZoneAutoCreate(BaseModel):
    """zone_id and postal_code are server-generated; the caller only supplies
    the human-facing fields."""
    zone_name: str
    emirate: str = "Dubai"
    status: str = "Active"

class ZoneOut(ZoneBase):
    id: int
    grid_count: int = 0
    address_count: int = 0
    model_config = ConfigDict(from_attributes=True)

class GridBase(BaseModel):
    grid_id: str
    zone_id: str
    area: str
    status: str = "Active"
    center_lat: float
    center_lng: float
    geometry: Optional[dict[str, Any]] = None

class GridCreate(GridBase):
    pass

class GridOut(GridBase):
    id: int
    postal_code: str = ""
    address_count: int = 0
    model_config = ConfigDict(from_attributes=True)

class AddressBase(BaseModel):
    address_id: str
    recipient_name: str = ""
    organization_name: str = ""
    unit_type: str = ""
    unit_number: str = ""
    building_name: str
    building_number: str = ""
    street_name: str = ""
    street_type: str = "Street"
    area_locality: str = ""
    emirate_admin_area: str = "Dubai"
    postal_code: str
    country_code: str = "AE"
    country_name: str = "UNITED ARAB EMIRATES"
    latitude: float
    longitude: float
    grid_id: str
    zone_id: str
    makani_number: str = ""
    onwani_reference: str = ""
    search_aliases: str = ""
    template_version: str = "UAE-DEMO-v1.0"
    status: str = "Verified"

class AddressCreate(AddressBase):
    pass

class CanonicalS42Out(BaseModel):
    """UPU S42-aligned canonical rendition, kept separate from the raw structured fields.
    Not a claim of formal UAE S42 certification -- see project docs."""
    line1: str = ""
    line2: str = ""
    line3: str = ""
    line4: str = ""
    line5: str = ""
    template_version: str = "UAE-DEMO-v1.0"

class AddressOut(AddressBase):
    id: int
    formatted_address: str = ""
    canonical_s42: CanonicalS42Out
    model_config = ConfigDict(from_attributes=True)

class SpatialResolveOut(BaseModel):
    found: bool
    grid_id: str | None = None
    zone_id: str | None = None
    postal_code: str | None = None
    area: str | None = None

class GeocodeComponents(BaseModel):
    street_number: str = ""
    route: str = ""
    sublocality: str = ""
    locality: str = ""
    administrative_area: str = ""
    postal_code: str = ""
    country: str = ""

class GeocodeOut(BaseModel):
    formatted_address: str
    latitude: float
    longitude: float
    components: GeocodeComponents
    place_id: str | None = None
    is_business: bool = False

class ReverseGeocodeOut(BaseModel):
    formatted_address: str
    latitude: float
    longitude: float
    components: GeocodeComponents
    place_id: str | None = None
    is_business: bool = False
    place_name: str | None = None
    grid_id: str | None = None
    zone_id: str | None = None
    postal_code: str | None = None
    area: str | None = None

class AddressMatchOut(BaseModel):
    """Result of dropping a pin: either a verified address already in our system
    near that point, or Google's raw reverse-geocoded address with a warning
    that it isn't in the system yet."""
    matched: bool
    address: AddressOut | None = None
    distance_meters: float | None = None
    google_formatted_address: str | None = None
    google_components: GeocodeComponents | None = None
    grid_id: str | None = None
    zone_id: str | None = None
    postal_code: str | None = None
    area: str | None = None
    warning: str | None = None
