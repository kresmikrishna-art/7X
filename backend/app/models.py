from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class PostalZone(Base):
    __tablename__ = "postal_zone"
    id: Mapped[int] = mapped_column(primary_key=True)
    zone_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    zone_name: Mapped[str] = mapped_column(String(150))
    postal_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    emirate: Mapped[str] = mapped_column(String(100), default="Dubai")
    status: Mapped[str] = mapped_column(String(30), default="Active")

class PostalGrid(Base):
    __tablename__ = "postal_grid"
    id: Mapped[int] = mapped_column(primary_key=True)
    grid_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    zone_id: Mapped[str] = mapped_column(String(50), ForeignKey("postal_zone.zone_id"))
    area: Mapped[str] = mapped_column(String(150))
    status: Mapped[str] = mapped_column(String(30), default="Active")
    center_lat: Mapped[float] = mapped_column(Float)
    center_lng: Mapped[float] = mapped_column(Float)

class Address(Base):
    __tablename__ = "address"
    id: Mapped[int] = mapped_column(primary_key=True)
    address_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    recipient_name: Mapped[str] = mapped_column(String(150), default="")
    organization_name: Mapped[str] = mapped_column(String(150), default="")
    unit_type: Mapped[str] = mapped_column(String(50), default="")
    unit_number: Mapped[str] = mapped_column(String(50), default="")
    building_name: Mapped[str] = mapped_column(String(150))
    building_number: Mapped[str] = mapped_column(String(50), default="")
    street_name: Mapped[str] = mapped_column(String(150), default="")
    street_type: Mapped[str] = mapped_column(String(50), default="Street")
    area_locality: Mapped[str] = mapped_column(String(150), default="")
    emirate_admin_area: Mapped[str] = mapped_column(String(100), default="Dubai")
    postal_code: Mapped[str] = mapped_column(String(30), index=True)
    country_code: Mapped[str] = mapped_column(String(2), default="AE")
    country_name: Mapped[str] = mapped_column(String(100), default="UNITED ARAB EMIRATES")
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    grid_id: Mapped[str] = mapped_column(String(50), ForeignKey("postal_grid.grid_id"))
    zone_id: Mapped[str] = mapped_column(String(50), ForeignKey("postal_zone.zone_id"))
    makani_number: Mapped[str] = mapped_column(String(50), default="")
    onwani_reference: Mapped[str] = mapped_column(String(100), default="")
    search_aliases: Mapped[str] = mapped_column(String(300), default="")
    template_version: Mapped[str] = mapped_column(String(50), default="UAE-DEMO-v1.0")
    status: Mapped[str] = mapped_column(String(30), default="Verified")
