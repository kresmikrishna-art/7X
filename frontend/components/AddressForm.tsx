"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Modal from "./Modal";
import type { Grid } from "./MapPanel";
import { api } from "@/lib/api";

const MapPanel = dynamic(() => import("./MapPanel"), { ssr: false });

export type Address = {
  id?: number;
  address_id: string;
  recipient_name: string;
  organization_name: string;
  unit_type: string;
  unit_number: string;
  building_name: string;
  building_number: string;
  street_name: string;
  street_type: string;
  area_locality: string;
  emirate_admin_area: string;
  postal_code: string;
  country_code: string;
  country_name: string;
  latitude: number;
  longitude: number;
  grid_id: string;
  zone_id: string;
  makani_number: string;
  onwani_reference: string;
  search_aliases: string;
  template_version: string;
  status: string;
  formatted_address?: string;
  canonical_s42?: {
    line1: string;
    line2: string;
    line3: string;
    line4: string;
    line5: string;
    template_version: string;
  };
};

function emptyAddress(): Address {
  return {
    address_id: "",
    recipient_name: "",
    organization_name: "",
    unit_type: "Apartment",
    unit_number: "",
    building_name: "",
    building_number: "",
    street_name: "",
    street_type: "Street",
    area_locality: "Dubai Silicon Oasis",
    emirate_admin_area: "Dubai",
    postal_code: "",
    country_code: "AE",
    country_name: "UNITED ARAB EMIRATES",
    latitude: 25.121,
    longitude: 55.384,
    grid_id: "",
    zone_id: "",
    makani_number: "",
    onwani_reference: "",
    search_aliases: "",
    template_version: "UAE-DEMO-v1.0",
    status: "Verified",
  };
}

export default function AddressForm({
  open,
  onClose,
  grids,
  existing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  grids: Grid[];
  existing?: Address | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Address>(emptyAddress());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [geocodeQuery, setGeocodeQuery] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (existing) {
      setForm({ ...existing });
    } else {
      setForm({
        ...emptyAddress(),
        address_id: `ADD-${String(Date.now()).slice(-6)}`,
      });
    }

    setGeocodeQuery("");
    setError("");
    setNotice("");
  }, [open, existing]);

  function update<K extends keyof Address>(key: K, value: Address[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function resolvePoint(lat: number, lng: number) {
    setForm((current) => ({ ...current, latitude: lat, longitude: lng }));
    setNotice("");
    setError("");

    let gridFound = false;

    try {
      const result = await api<any>(`/api/v1/spatial/resolve?lat=${lat}&lng=${lng}`);

      if (result.found) {
        gridFound = true;
        setForm((current) => ({
          ...current,
          grid_id: result.grid_id,
          zone_id: result.zone_id,
          postal_code: result.postal_code,
          area_locality: result.area || current.area_locality,
        }));
      } else {
        setForm((current) => ({ ...current, grid_id: "", zone_id: "", postal_code: "" }));
        setError("The selected location is outside the configured postal grid.");
      }
    } catch (e: any) {
      setError(e.message || "Could not resolve map location.");
    }

    // Street/area/emirate come from Google independently of whether the point falls
    // inside one of our seeded pilot grids, so this still runs even when it doesn't --
    // only grid_id/zone_id/postal_code require being inside a configured grid.
    try {
      const rg = await api<any>(`/api/v1/reverse-geocode?lat=${lat}&lng=${lng}`);
      setForm((current) => ({
        ...current,
        street_name: rg.components.route,
        area_locality: rg.components.sublocality || rg.components.locality || current.area_locality,
        emirate_admin_area: rg.components.administrative_area || current.emirate_admin_area,
        // Google's Geocoding API never returns a POI's name itself -- rg.place_name
        // comes from a separate Places API lookup the backend only does when the
        // point resolves to a business/POI, so a plain street point leaves these alone.
        building_name: rg.place_name || current.building_name,
        organization_name: rg.place_name || current.organization_name,
      }));
      if (gridFound) {
        setNotice(
          rg.place_name
            ? `Detected "${rg.place_name}" at this location via Google — review before saving.`
            : "Fields below marked from Google reverse geocoding — review before saving."
        );
      }
    } catch {
      // Google geocoding is optional (needs GOOGLE_MAPS_API_KEY on the backend) -- skip silently.
    }
  }

  async function locateAddress() {
    if (!geocodeQuery.trim()) return;
    setLocating(true);
    setError("");
    setNotice("");

    try {
      const result = await api<any>(`/api/v1/geocode?address=${encodeURIComponent(geocodeQuery)}`);
      await resolvePoint(result.latitude, result.longitude);

      setForm((current) => ({
        ...current,
        building_name: geocodeQuery.trim(),
        organization_name: result.is_business ? geocodeQuery.trim() : "",
      }));

      setNotice(
        result.is_business
          ? `Located "${geocodeQuery.trim()}" as a business via Google: ${result.formatted_address}`
          : `Located via Google: ${result.formatted_address}`
      );
    } catch (e: any) {
      setError(e.message || "Could not geocode that address.");
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    setError("");

    if (!form.address_id.trim()) {
      setError("Address ID is required.");
      return;
    }

    if (!form.building_name.trim()) {
      setError("Building name is required.");
      return;
    }

    if (!form.grid_id) {
      setError("Select a location inside a configured postal grid.");
      return;
    }

    setSaving(true);

    try {
      const method = existing ? "PUT" : "POST";
      const path = existing
        ? `/api/v1/addresses/${encodeURIComponent(existing.address_id)}`
        : "/api/v1/addresses";

      await api(path, {
        method,
        body: JSON.stringify(form),
      });

      await onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message || "Could not save address.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={existing ? "Edit Address" : "Add Address"} open={open} onClose={onClose} wide>
      <div className="formsection">Canonical address components</div>

      <div className="formgrid">
        <div className="formgroup">
          <label>Address ID</label>
          <input value={form.address_id} disabled={!!existing} onChange={(e) => update("address_id", e.target.value)} />
        </div>

        <div className="formgroup">
          <label>Status</label>
          <select value={form.status} onChange={(e) => update("status", e.target.value)}>
            <option>Verified</option>
            <option>Draft</option>
            <option>Inactive</option>
          </select>
        </div>

        <div className="formgroup"><label>Recipient Name</label><input value={form.recipient_name} onChange={(e) => update("recipient_name", e.target.value)} /></div>
        <div className="formgroup"><label>Organization Name</label><input value={form.organization_name} onChange={(e) => update("organization_name", e.target.value)} /></div>

        <div className="formgroup">
          <label>Unit Type</label>
          <select value={form.unit_type} onChange={(e) => update("unit_type", e.target.value)}>
            <option>Apartment</option>
            <option>Office</option>
            <option>Shop</option>
            <option>Villa</option>
            <option>Warehouse</option>
            <option>Building</option>
          </select>
        </div>

        <div className="formgroup"><label>Unit Number</label><input value={form.unit_number} onChange={(e) => update("unit_number", e.target.value)} /></div>
        <div className="formgroup"><label>Building Name</label><input value={form.building_name} onChange={(e) => update("building_name", e.target.value)} /></div>
        <div className="formgroup"><label>Building Number</label><input value={form.building_number} onChange={(e) => update("building_number", e.target.value)} /></div>
        <div className="formgroup"><label>Street Name</label><input value={form.street_name} onChange={(e) => update("street_name", e.target.value)} /></div>
        <div className="formgroup"><label>Street Type</label><input value={form.street_type} onChange={(e) => update("street_type", e.target.value)} /></div>
        <div className="formgroup"><label>Area / Locality</label><input value={form.area_locality} onChange={(e) => update("area_locality", e.target.value)} /></div>
        <div className="formgroup"><label>Emirate</label><input value={form.emirate_admin_area} onChange={(e) => update("emirate_admin_area", e.target.value)} /></div>
        <div className="formgroup"><label>Makani Number</label><input value={form.makani_number} onChange={(e) => update("makani_number", e.target.value)} /></div>
        <div className="formgroup"><label>Onwani Reference</label><input value={form.onwani_reference} onChange={(e) => update("onwani_reference", e.target.value)} /></div>
        <div className="formgroup full"><label>Search Aliases (comma-separated)</label><input value={form.search_aliases} onChange={(e) => update("search_aliases", e.target.value)} placeholder="e.g. Blue Tower, BT" /></div>
      </div>

      <div className="formsection topgap">Locate on map</div>
      <p className="hint">
        Type a place or address and click Locate to forward-geocode it via Google, or click directly on the map. Either way, PostGIS resolves the containing Grid ID, Zone ID and Postcode, and Google reverse geocoding (if configured) fills in the street/area fields for review.
      </p>

      <div className="geocodeRow">
        <input
          value={geocodeQuery}
          onChange={(e) => setGeocodeQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && locateAddress()}
          placeholder="e.g. Dubai Silicon Oasis, Dubai"
        />
        <button className="btn btn-ghost btn-sm" disabled={locating} onClick={locateAddress}>
          {locating ? "Locating..." : "Locate"}
        </button>
      </div>

      <MapPanel
        grids={grids}
        selectedGrid={form.grid_id}
        point={{ lat: Number(form.latitude), lng: Number(form.longitude) }}
        onMapClick={resolvePoint}
        height={340}
      />

      <div className="formgrid topgap">
        <div className="formgroup"><label>Latitude</label><input value={form.latitude} readOnly /></div>
        <div className="formgroup"><label>Longitude</label><input value={form.longitude} readOnly /></div>
        <div className="formgroup"><label>Grid ID</label><input value={form.grid_id} readOnly /></div>
        <div className="formgroup"><label>Zone ID</label><input value={form.zone_id} readOnly /></div>
        <div className="formgroup"><label>Postcode</label><input value={form.postal_code} readOnly /></div>
        <div className="formgroup"><label>Template Version</label><input value={form.template_version} readOnly /></div>
      </div>

      {notice && <p className="smallnote">{notice}</p>}
      {error && <div className="errorBox">{error}</div>}

      <div className="formactions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save Address"}
        </button>
      </div>
    </Modal>
  );
}
