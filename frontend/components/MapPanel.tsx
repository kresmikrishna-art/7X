"use client";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo } from "react";

const DEFAULT_CENTER: [number, number] = [25.121, 55.384];

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);
  return null;
}

export type Grid = {
  id: number;
  grid_id: string;
  zone_id: string;
  area: string;
  status: string;
  center_lat: number;
  center_lng: number;
  postal_code: string;
  address_count: number;
  geometry: any;
};

function ClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function MapPanel({
  grids,
  selectedGrid,
  point,
  onMapClick,
  height = 420,
  showLegend = false,
}: {
  grids: Grid[];
  selectedGrid?: string;
  point?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  height?: number;
  showLegend?: boolean;
}) {
  const icon = useMemo(() => L.divIcon({
    className: "customPin",
    html: '<div class="pinDot"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  }), []);

  const center: [number, number] = point
    ? [point.lat, point.lng]
    : grids.length
      ? [
          grids.reduce((sum, g) => sum + g.center_lat, 0) / grids.length,
          grids.reduce((sum, g) => sum + g.center_lng, 0) / grids.length,
        ]
      : DEFAULT_CENTER;
  const zoom = point ? 15 : grids.length > 1 ? 13 : 14;

  return (
    <div style={{ height }} className="mapWrap">
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <Recenter center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {grids.map((g) => (
          // Grid polygons bind their own click-to-open-popup handler, which stops
          // the click from ever reaching the map's own click handler below --
          // so whenever onMapClick is active (pin-drop / click-to-place), the
          // grids must be non-interactive or clicking inside one silently does
          // nothing instead of registering the point.
          <GeoJSON
            key={`${g.grid_id}-${selectedGrid}-${onMapClick ? "click" : "view"}`}
            data={g.geometry}
            interactive={!onMapClick}
            style={{
              weight: g.grid_id === selectedGrid ? 4 : 2,
              opacity: 0.9,
              fillOpacity: g.grid_id === selectedGrid ? 0.35 : 0.12,
            }}
          >
            {!onMapClick && (
              <Popup>
                <b>{g.grid_id}</b><br />
                {g.zone_id}<br />
                {g.postal_code}
              </Popup>
            )}
          </GeoJSON>
        ))}

        {point && <Marker position={[point.lat, point.lng]} icon={icon} />}
        <ClickHandler onClick={onMapClick} />
      </MapContainer>

      {showLegend && (
        <div className="legend">
          <span><i style={{ background: "rgba(0,108,223,.07)", border: "1px solid #406b91" }} />Grid cell</span>
          <span><i style={{ background: "rgba(0,108,223,.25)", border: "1px solid #006cdf" }} />Selected grid</span>
          <span><i style={{ background: "#ef4d3f", borderRadius: "50%" }} />Address</span>
        </div>
      )}
    </div>
  );
}
