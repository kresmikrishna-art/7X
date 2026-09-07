"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import Modal from "@/components/Modal";
import AddressForm, { Address } from "@/components/AddressForm";
import type { Grid } from "@/components/MapPanel";

const MapPanel = dynamic(() => import("@/components/MapPanel"), { ssr: false });

type Zone = {
  id: number;
  zone_id: string;
  zone_name: string;
  postal_code: string;
  emirate: string;
  status: string;
  grid_count: number;
  address_count: number;
};

type Screen = "search" | "grids" | "postcodes" | "addresses";
type SearchMode = "all" | "address" | "postcode" | "makani" | "onwani" | "coordinates";

type PinDropResult = {
  lat: number;
  lng: number;
  matched: boolean;
  distance_meters: number | null;
  google_formatted_address: string | null;
  warning: string | null;
};

const screenTitles: Record<Screen, string> = {
  search: "Address Search",
  grids: "Grid Engine",
  postcodes: "Postcode Management",
  addresses: "Address Registry",
};

function rectanglePolygon(lat: number, lng: number, width = 0.008, height = 0.006) {
  const halfW = width / 2;
  const halfH = height / 2;

  return {
    type: "Polygon",
    coordinates: [[
      [lng - halfW, lat - halfH],
      [lng + halfW, lat - halfH],
      [lng + halfW, lat + halfH],
      [lng - halfW, lat + halfH],
      [lng - halfW, lat - halfH],
    ]],
  };
}

function normalize(s: any) {
  return String(s ?? "").toLowerCase().trim();
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("search");
  const [grids, setGrids] = useState<Grid[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedGrid, setSelectedGrid] = useState<Grid | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const [gridModalOpen, setGridModalOpen] = useState(false);
  const [gridEditId, setGridEditId] = useState<string | null>(null);
  const [gridForm, setGridForm] = useState<any>({
    grid_id: "",
    zone_id: "",
    area: "Dubai Silicon Oasis",
    status: "Active",
    center_lat: 25.121,
    center_lng: 55.384,
  });

  const [postcodeModalOpen, setPostcodeModalOpen] = useState(false);
  const [postcodeEditCode, setPostcodeEditCode] = useState<string | null>(null);
  const [postcodeForm, setPostcodeForm] = useState<any>({
    zone_id: "",
    zone_name: "",
    postal_code: "",
    emirate: "Dubai",
    status: "Active",
  });

  const [query, setQuery] = useState("");
  const [topQuery, setTopQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [searchResults, setSearchResults] = useState<Address[]>([]);
  const [pickMode, setPickMode] = useState(false);
  const [pinDrop, setPinDrop] = useState<PinDropResult | null>(null);
  const [error, setError] = useState("");

  const [gridFilter, setGridFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [addrFilter, setAddrFilter] = useState("");

  async function loadAll() {
    try {
      setError("");

      const [gridData, zoneData, addressData] = await Promise.all([
        api<Grid[]>("/api/v1/grids"),
        api<Zone[]>("/api/v1/postcodes"),
        api<Address[]>("/api/v1/addresses"),
      ]);

      setGrids(gridData);
      setZones(zoneData);
      setAddresses(addressData);

      setSelectedAddress((current) => addressData.find((a) => a.address_id === current?.address_id) || addressData[0] || null);
      setSelectedGrid((current) => gridData.find((g) => g.grid_id === current?.grid_id) || gridData[0] || null);
      setSelectedZone((current) => zoneData.find((z) => z.postal_code === current?.postal_code) || zoneData[0] || null);
    } catch {
      setError("Could not connect to the API. Make sure the database and backend are running.");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function runSearch(term?: string, modeOverride?: SearchMode) {
    const q = (term ?? query).trim();
    const mode = modeOverride ?? searchMode;

    if (!q) {
      setSearchResults([]);
      return;
    }

    setError("");
    setPinDrop(null);

    const coordMatch = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (coordMatch || mode === "coordinates") {
      if (!coordMatch) {
        setSearchResults([]);
        setSelectedAddress(null);
        setError('Enter coordinates as "lat,lng" to search by coordinates.');
        return;
      }
      await pickOnMap(parseFloat(coordMatch[1]), parseFloat(coordMatch[2]));
      return;
    }

    try {
      let results = await api<Address[]>(`/api/v1/addresses/search?q=${encodeURIComponent(q)}`);

      if (mode === "postcode") results = results.filter((a) => normalize(a.postal_code).includes(normalize(q)));
      if (mode === "makani") results = results.filter((a) => normalize(a.makani_number).includes(normalize(q)));
      if (mode === "onwani") results = results.filter((a) => normalize(a.onwani_reference).includes(normalize(q)));

      if (results.length) {
        setSearchResults(results);
        setSelectedAddress(results[0]);
        return;
      }

      setSearchResults([]);
      setSelectedAddress(null);

      // Free-text/place searches also fall back to Google + a dropped map pin when
      // nothing in the system matches; ID lookups (postcode/Makani/Onwani) don't --
      // a reference number isn't something Google can geocode to a location.
      if (mode === "all" || mode === "address") {
        try {
          const geo = await api<any>(`/api/v1/geocode?address=${encodeURIComponent(q)}`);
          await pickOnMap(geo.latitude, geo.longitude);
        } catch {
          setError("No address found in the system or via Google for this search.");
        }
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  function selectSearchMode(mode: SearchMode) {
    setSearchMode(mode);
    if (query.trim()) runSearch(query, mode);
  }

  function submitTopSearch() {
    if (!topQuery.trim()) return;
    setQuery(topQuery);
    setSearchMode("all");
    setScreen("search");
    runSearch(topQuery, "all");
  }

  function viewAddress(address: Address) {
    setSelectedAddress(address);
    setPinDrop(null);
    setQuery("");
    setSearchMode("all");
    setSearchResults([]);
    setScreen("search");
  }

  async function pickOnMap(lat: number, lng: number) {
    setError("");
    setPinDrop(null);
    try {
      const result = await api<any>(`/api/v1/addresses/match?lat=${lat}&lng=${lng}`);

      if (result.matched && result.address) {
        setSelectedAddress(result.address);
        setSearchResults([result.address]);
      } else {
        setSelectedAddress(null);
        setSearchResults([]);
      }

      setPinDrop({
        lat,
        lng,
        matched: result.matched,
        distance_meters: result.distance_meters ?? null,
        google_formatted_address: result.google_formatted_address ?? null,
        warning: result.warning ?? null,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPickMode(false);
    }
  }

  function addAddress() {
    setEditingAddress(null);
    setAddressFormOpen(true);
  }

  function editAddress(address: Address) {
    setEditingAddress(address);
    setAddressFormOpen(true);
  }

  async function deleteAddress(address: Address) {
    if (!confirm(`Delete address ${address.address_id}? This cannot be undone.`)) return;
    try {
      await api(`/api/v1/addresses/${encodeURIComponent(address.address_id)}`, { method: "DELETE" });
      setSearchResults((current) => current.filter((a) => a.address_id !== address.address_id));
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function openGridForm(grid?: Grid) {
    if (grid) {
      setGridEditId(grid.grid_id);
      setGridForm({
        grid_id: grid.grid_id,
        zone_id: grid.zone_id,
        area: grid.area,
        status: grid.status,
        center_lat: grid.center_lat,
        center_lng: grid.center_lng,
      });
    } else {
      setGridEditId(null);
      setGridForm({
        grid_id: `GRD-${String(grids.length + 1).padStart(3, "0")}`,
        zone_id: zones[0]?.zone_id || "",
        area: "Dubai Silicon Oasis",
        status: "Active",
        center_lat: 25.121,
        center_lng: 55.384,
      });
    }

    setGridModalOpen(true);
  }

  async function saveGrid() {
    try {
      setError("");
      const payload = {
        ...gridForm,
        center_lat: Number(gridForm.center_lat),
        center_lng: Number(gridForm.center_lng),
        geometry: rectanglePolygon(Number(gridForm.center_lat), Number(gridForm.center_lng)),
      };

      await api(gridEditId ? `/api/v1/grids/${gridEditId}` : "/api/v1/grids", {
        method: gridEditId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      setGridModalOpen(false);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deleteGrid(grid: Grid) {
    if (!confirm(`Delete grid ${grid.grid_id}?`)) return;
    try {
      setError("");
      await api(`/api/v1/grids/${grid.grid_id}`, { method: "DELETE" });
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function openPostcodeForm(zone?: Zone) {
    if (zone) {
      setPostcodeEditCode(zone.postal_code);
      setPostcodeForm({
        zone_id: zone.zone_id,
        zone_name: zone.zone_name,
        postal_code: zone.postal_code,
        emirate: zone.emirate,
        status: zone.status,
      });
    } else {
      setPostcodeEditCode(null);
      setPostcodeForm({
        zone_id: "",
        zone_name: "",
        postal_code: "",
        emirate: "Dubai",
        status: "Active",
      });
    }

    setPostcodeModalOpen(true);
  }

  async function savePostcode() {
    try {
      setError("");
      const body = postcodeEditCode
        ? postcodeForm
        : { zone_name: postcodeForm.zone_name, emirate: postcodeForm.emirate, status: postcodeForm.status };

      await api(
        postcodeEditCode
          ? `/api/v1/postcodes/${encodeURIComponent(postcodeEditCode)}`
          : "/api/v1/postcodes",
        {
          method: postcodeEditCode ? "PUT" : "POST",
          body: JSON.stringify(body),
        }
      );

      setPostcodeModalOpen(false);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function deletePostcode(zone: Zone) {
    if (!confirm(`Delete postcode ${zone.postal_code}?`)) return;
    try {
      setError("");
      await api(`/api/v1/postcodes/${encodeURIComponent(zone.postal_code)}`, { method: "DELETE" });
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    }
  }

  const results = searchResults.length || query ? searchResults : addresses;

  const filteredGrids = useMemo(
    () => grids.filter((g) => normalize(`${g.grid_id} ${g.zone_id} ${g.postal_code} ${g.area}`).includes(normalize(gridFilter))),
    [grids, gridFilter]
  );
  const filteredZones = useMemo(
    () => zones.filter((z) => normalize(`${z.postal_code} ${z.zone_id} ${z.zone_name}`).includes(normalize(codeFilter))),
    [zones, codeFilter]
  );
  const filteredAddresses = useMemo(
    () => addresses.filter((a) => normalize(`${a.address_id} ${a.building_name} ${a.postal_code} ${a.makani_number} ${a.onwani_reference}`).includes(normalize(addrFilter))),
    [addresses, addrFilter]
  );

  const areaCount = new Set(grids.map((g) => g.area)).size;
  const zoneGridIds = selectedZone ? grids.filter((g) => g.zone_id === selectedZone.zone_id).map((g) => g.grid_id) : [];
  const zoneAddresses = selectedZone ? addresses.filter((a) => a.zone_id === selectedZone.zone_id) : [];

  return (
    <div className="app">
      <aside className="side">
        <div className="sbrand">
          <div className="mark">
            <svg viewBox="0 0 68 40" fill="none">
              <path d="M43.318 20.4212H38.2005L26.4935 39.9317H38.2911L45.2881 28.7308L51.7869 39.9317H63.4939L51.1755 19.4878H56.2931L68 0H56.2025L49.4319 11.4058L42.7066 0H30.9997L43.318 20.4212Z" fill="currentColor" />
              <path d="M32.9923 11.7245L16.281 39.9317H5.00433L22.6214 10.1764L6.09124 10.1992L0 0H25.9953L32.9923 11.7245Z" fill="currentColor" />
            </svg>
          </div>
          <div className="t">7X Postcode<small>Showcase Console</small></div>
        </div>

        <nav className="side-nav">
          <NavItem active={screen === "search"} onClick={() => setScreen("search")} icon="⌕" label="Address Search" />
          <NavItem active={screen === "addresses"} onClick={() => setScreen("addresses")} icon="≡" label="Address Registry" badge={addresses.length} />

          <div className="navgrp">Configuration</div>
          <NavItem active={screen === "grids"} onClick={() => setScreen("grids")} icon="▦" label="Grid Engine" badge={grids.length} />
          <NavItem active={screen === "postcodes"} onClick={() => setScreen("postcodes")} icon="⌖" label="Postcode Management" badge={zones.length} />
        </nav>

        <div className="sfoot"><b>For a world in motion</b><br />UAE Postcode Digital Addressing · showcase prototype</div>
      </aside>

      <div className="mainapp">
        <header className="top">
          <div className="crumb">Showcase Console<b>{screenTitles[screen]}</b></div>

          <label className="topsearch">
            <span>⌕</span>
            <input
              value={topQuery}
              onChange={(e) => setTopQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitTopSearch()}
              placeholder="Search showcase data…"
            />
          </label>

          <span className="env">● PROTOTYPE</span>
          <div className="me">
            <div className="av">7X</div>
            <div className="nm">Showcase User<small>Evaluation environment</small></div>
          </div>
        </header>

        <main className="content">
          <div className="ribbon">
            ⚠ Concept prototype — illustrative / predefined data only. Postal codes, grids and external identifier mappings (Makani/Onwani) are for showcase unless officially supplied by the authority.
          </div>

          {error && <div className="errorBox">{error}</div>}

          {screen === "search" && (
            <>
              <div className="pagehead">
                <div>
                  <h1>Address Search</h1>
                  <p>Search a verified address and view its map location, containing postal grid, zone, postcode and complete canonical fields on the same screen.</p>
                </div>
                <span className="pill">● UPU S42 · canonical components</span>
              </div>

              <section className="card searchbar">
                <div className="tabs">
                  {(["all", "address", "postcode", "makani", "onwani", "coordinates"] as SearchMode[]).map((m) => (
                    <button key={m} className={`tab ${searchMode === m ? "on" : ""}`} onClick={() => selectSearchMode(m)}>
                      {m === "all" ? "All" : m === "address" ? "Address / Place" : m[0].toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="searchrow">
                  <label className="field">
                    <span>⌕</span>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runSearch()}
                      placeholder="Try ADD-001246, DXB-10450, a Makani number, or 25.1127,55.3668"
                    />
                  </label>
                  <button className="btn btn-primary" onClick={() => runSearch()}>Search</button>
                </div>

                <div className="hint">Database-backed search across address text, Address ID, postcode, Makani/Onwani references and search aliases. Sample Makani/Onwani and postcode values are demonstration data.</div>
              </section>

              <div className="layout">
                <section className="card mapcard">
                  <div className="maphead">
                    <div>
                      <b>Address location &amp; postal grid</b>
                      <div className="hint" style={{ margin: 0 }}>
                        {pickMode
                          ? "Reverse-geocode mode active: click the map."
                          : selectedAddress
                          ? `${selectedAddress.building_name} · ${selectedAddress.area_locality} · ${selectedAddress.grid_id} · ${selectedAddress.postal_code}`
                          : pinDrop && !pinDrop.matched
                          ? `Pin at ${pinDrop.lat.toFixed(5)}, ${pinDrop.lng.toFixed(5)} · not in system`
                          : "Select an address"}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPickMode((v) => !v)}>
                      {pickMode ? "Cancel pin drop" : "Drop pin / reverse geocode"}
                    </button>
                  </div>
                  <MapPanel
                    grids={grids}
                    selectedGrid={selectedAddress?.grid_id}
                    point={
                      selectedAddress
                        ? { lat: selectedAddress.latitude, lng: selectedAddress.longitude }
                        : pinDrop
                        ? { lat: pinDrop.lat, lng: pinDrop.lng }
                        : null
                    }
                    onMapClick={pickMode ? pickOnMap : undefined}
                    height={525}
                    showLegend
                  />
                </section>

                <section className="card details">
                  {selectedAddress
                    ? <AddressDetails address={selectedAddress} pinDistance={pinDrop?.matched ? pinDrop.distance_meters : null} />
                    : pinDrop && !pinDrop.matched
                    ? <PinDropWarning pin={pinDrop} />
                    : <div className="empty">Select an address.</div>}
                </section>
              </div>

              <section className="card" style={{ marginTop: 18 }}>
                <div className="toolbar" style={{ paddingBottom: 15 }}>
                  <div>
                    <h2>Search results</h2>
                    <p>{results.length} records</p>
                  </div>
                </div>

                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Address ID</th>
                        <th>Address</th>
                        <th>Postcode</th>
                        <th>Grid</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((address) => (
                        <tr key={address.address_id} onClick={() => { setSelectedAddress(address); setPinDrop(null); }}>
                          <td className="mono strong">{address.address_id}</td>
                          <td>{address.building_name}, {address.street_name}</td>
                          <td className="mono">{address.postal_code}</td>
                          <td className="mono">{address.grid_id}</td>
                          <td><Badge text={address.status} /></td>
                          <td>
                            <div className="actions">
                              <button className="iconbtn" onClick={(e) => { e.stopPropagation(); setSelectedAddress(address); setPinDrop(null); }}>View</button>
                              <button className="iconbtn" onClick={(e) => { e.stopPropagation(); editAddress(address); }}>Edit</button>
                              <button className="iconbtn danger" onClick={(e) => { e.stopPropagation(); deleteAddress(address); }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!results.length && <tr><td colSpan={6} className="empty">No addresses found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {screen === "grids" && (
            <>
              <div className="pagehead">
                <div>
                  <h1>Grid Engine</h1>
                  <p>Browse the predefined postal grid used for the showcase. Select a cell to inspect its zone, postcode and address coverage.</p>
                </div>
                <span className="pill">{grids.length} grid cells</span>
              </div>

              <div className="stats">
                <Stat label="Grid cells" value={grids.length} detail="Predefined showcase cells" />
                <Stat label="Postal zones" value={zones.length} detail="Configured" />
                <Stat label="Addresses" value={addresses.length} detail="Linked across all cells" />
                <Stat label="Pilot areas" value={areaCount} detail="Dubai Silicon Oasis, Al Barsha" />
              </div>

              <div className="split">
                <section className="card tablecard">
                  <div className="toolbar">
                    <div>
                      <h2>Grid list</h2>
                      <p>Predefined cells for the pilot area.</p>
                    </div>
                    <div className="toolbarRight">
                      <div className="filter"><input value={gridFilter} onChange={(e) => setGridFilter(e.target.value)} placeholder="Search Grid ID, zone or postcode…" /></div>
                      <button className="btn btn-primary btn-sm" onClick={() => openGridForm()}>+ Add Grid</button>
                    </div>
                  </div>

                  <div className="tablewrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Grid ID</th>
                          <th>Zone</th>
                          <th>Postcode</th>
                          <th>Area</th>
                          <th>Addresses</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGrids.map((grid) => (
                          <tr key={grid.grid_id} className={selectedGrid?.grid_id === grid.grid_id ? "selected" : ""} onClick={() => setSelectedGrid(grid)}>
                            <td className="mono strong">{grid.grid_id}</td>
                            <td className="mono">{grid.zone_id}</td>
                            <td className="mono">{grid.postal_code}</td>
                            <td>{grid.area}</td>
                            <td>{grid.address_count}</td>
                            <td><span className="chip c-green">{grid.status}</span></td>
                            <td>
                              <div className="actions">
                                <button className="iconbtn" onClick={(e) => { e.stopPropagation(); setSelectedGrid(grid); }}>View</button>
                                <button className="iconbtn" onClick={(e) => { e.stopPropagation(); openGridForm(grid); }}>Edit</button>
                                <button className="iconbtn danger" onClick={(e) => { e.stopPropagation(); deleteGrid(grid); }}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!filteredGrids.length && <tr><td colSpan={7} className="empty">No grids found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="card sideinfo">
                  <h3>{selectedGrid?.grid_id || "Grid details"}</h3>
                  <p>{selectedGrid ? `${selectedGrid.area} · predefined showcase grid cell` : "Select a grid row."}</p>

                  <div style={{ marginTop: 12 }}>
                    <MapPanel
                      grids={grids}
                      selectedGrid={selectedGrid?.grid_id}
                      point={selectedGrid ? { lat: selectedGrid.center_lat, lng: selectedGrid.center_lng } : null}
                      height={380}
                    />
                  </div>

                  {selectedGrid && (
                    <dl className="kv" style={{ marginTop: 12 }}>
                      <dt>Grid ID</dt><dd className="mono">{selectedGrid.grid_id}</dd>
                      <dt>Zone</dt><dd className="mono">{selectedGrid.zone_id}</dd>
                      <dt>Postcode</dt><dd className="mono">{selectedGrid.postal_code}</dd>
                      <dt>Centre</dt><dd className="mono">{selectedGrid.center_lat.toFixed(5)}, {selectedGrid.center_lng.toFixed(5)}</dd>
                      <dt>Addresses</dt><dd>{selectedGrid.address_count}</dd>
                      <dt>Status</dt><dd><span className="chip c-green">{selectedGrid.status}</span></dd>
                    </dl>
                  )}
                </section>
              </div>
            </>
          )}

          {screen === "postcodes" && (
            <>
              <div className="pagehead">
                <div>
                  <h1>Postcode Management</h1>
                  <p>Manage predefined postal zones and postcodes, and browse their grid coverage and linked addresses.</p>
                </div>
                <span className="pill">{zones.length} postcodes</span>
              </div>

              <div className="split">
                <section className="card tablecard">
                  <div className="toolbar">
                    <div>
                      <h2>Postcode list</h2>
                      <p>Prototype values for the showcase.</p>
                    </div>
                    <div className="toolbarRight">
                      <div className="filter"><input value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} placeholder="Search postcode, zone or area…" /></div>
                      <button className="btn btn-primary btn-sm" onClick={() => openPostcodeForm()}>+ Add Postcode</button>
                    </div>
                  </div>

                  <div className="tablewrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Postcode</th>
                          <th>Zone ID</th>
                          <th>Zone / Area</th>
                          <th>Grids</th>
                          <th>Addresses</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredZones.map((zone) => (
                          <tr key={zone.postal_code} className={selectedZone?.postal_code === zone.postal_code ? "selected" : ""} onClick={() => setSelectedZone(zone)}>
                            <td className="mono strong">{zone.postal_code}</td>
                            <td className="mono">{zone.zone_id}</td>
                            <td>{zone.zone_name}</td>
                            <td>{zone.grid_count}</td>
                            <td>{zone.address_count}</td>
                            <td><span className="chip c-green">{zone.status}</span></td>
                            <td>
                              <div className="actions">
                                <button className="iconbtn" onClick={(e) => { e.stopPropagation(); setSelectedZone(zone); }}>View</button>
                                <button className="iconbtn" onClick={(e) => { e.stopPropagation(); openPostcodeForm(zone); }}>Edit</button>
                                <button className="iconbtn danger" onClick={(e) => { e.stopPropagation(); deletePostcode(zone); }}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!filteredZones.length && <tr><td colSpan={7} className="empty">No postcodes found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="card sideinfo">
                  {selectedZone ? (
                    <>
                      <div className="statusline"><span className="status">✓ {selectedZone.status}</span><span className="demo">Showcase postcode</span></div>
                      <h2 className="mono" style={{ fontSize: 24 }}>{selectedZone.postal_code}</h2>
                      <p>{selectedZone.zone_name} · {selectedZone.emirate}</p>

                      <div style={{ margin: "12px 0" }}>
                        <MapPanel
                          grids={grids.filter((g) => zoneGridIds.includes(g.grid_id) || g.zone_id === selectedZone.zone_id)}
                          height={280}
                        />
                      </div>

                      <dl className="kv">
                        <dt>Zone ID</dt><dd className="mono">{selectedZone.zone_id}</dd>
                        <dt>Grid coverage</dt><dd>{zoneGridIds.length ? zoneGridIds.join(", ") : "No grid assigned yet"}</dd>
                        <dt>Addresses</dt><dd>{selectedZone.address_count}</dd>
                        <dt>Status</dt><dd>{selectedZone.status}</dd>
                      </dl>

                      <div className="sectitle">Linked addresses</div>
                      {zoneAddresses.length
                        ? zoneAddresses.map((a) => (
                          <div className="linkedRow" key={a.address_id}>
                            <b>{a.building_name}{a.unit_number ? `, ${a.unit_type} ${a.unit_number}` : ""}</b>
                            <div className="hint" style={{ margin: 0 }}>{a.address_id} · {a.grid_id}</div>
                          </div>
                        ))
                        : <p className="hint">No addresses linked to this postcode yet.</p>}
                    </>
                  ) : <div className="empty">Select a postcode.</div>}
                </section>
              </div>
            </>
          )}

          {screen === "addresses" && (
            <section className="card tablecard">
              <div className="pagehead" style={{ padding: "16px 16px 0", margin: 0 }}>
                <div>
                  <h1 style={{ fontSize: 22 }}>Address Registry</h1>
                  <p>Canonical addresses linked to Grid ID, Zone ID and Postcode.</p>
                </div>
                <span className="pill">{addresses.length} verified addresses</span>
              </div>

              <div className="toolbar">
                <div>
                  <h2>Address list</h2>
                  <p>{filteredAddresses.length} records</p>
                </div>
                <div className="toolbarRight">
                  <div className="filter"><input value={addrFilter} onChange={(e) => setAddrFilter(e.target.value)} placeholder="Search address, building, postcode, Makani…" /></div>
                  <button className="btn btn-primary btn-sm" onClick={addAddress}>+ Add Address</button>
                </div>
              </div>

              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Address ID</th>
                      <th>Address</th>
                      <th>Postcode</th>
                      <th>Grid</th>
                      <th>Zone</th>
                      <th>External Ref</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAddresses.map((address) => (
                      <tr key={address.address_id}>
                        <td className="mono strong">{address.address_id}</td>
                        <td>{address.building_name}, {address.street_name}</td>
                        <td className="mono">{address.postal_code}</td>
                        <td className="mono">{address.grid_id}</td>
                        <td className="mono">{address.zone_id}</td>
                        <td className="mono">{address.makani_number || address.onwani_reference || "—"}</td>
                        <td><Badge text={address.status} /></td>
                        <td>
                          <div className="actions">
                            <button className="iconbtn" onClick={() => viewAddress(address)}>View</button>
                            <button className="iconbtn" onClick={() => editAddress(address)}>Edit</button>
                            <button className="iconbtn danger" onClick={() => deleteAddress(address)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredAddresses.length && <tr><td colSpan={8} className="empty">No addresses found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

      <AddressForm
        open={addressFormOpen}
        onClose={() => setAddressFormOpen(false)}
        grids={grids}
        existing={editingAddress}
        onSaved={loadAll}
      />

      <Modal title={gridEditId ? "Edit Grid" : "Add Grid"} open={gridModalOpen} onClose={() => setGridModalOpen(false)} wide>
        <div className="formgrid">
          <div className="formgroup">
            <label>Grid ID</label>
            <input value={gridForm.grid_id} disabled={!!gridEditId} onChange={(e) => setGridForm({ ...gridForm, grid_id: e.target.value })} />
          </div>

          <div className="formgroup">
            <label>Zone</label>
            <select value={gridForm.zone_id} onChange={(e) => setGridForm({ ...gridForm, zone_id: e.target.value })}>
              {zones.map((zone) => <option key={zone.zone_id} value={zone.zone_id}>{zone.zone_id} · {zone.zone_name}</option>)}
            </select>
          </div>

          <div className="formgroup full">
            <label>Area</label>
            <input value={gridForm.area} onChange={(e) => setGridForm({ ...gridForm, area: e.target.value })} />
          </div>

          <div className="formgroup">
            <label>Status</label>
            <select value={gridForm.status} onChange={(e) => setGridForm({ ...gridForm, status: e.target.value })}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

          <div className="formgroup">
            <label>Centre Latitude</label>
            <input type="number" step="0.00001" value={gridForm.center_lat} onChange={(e) => setGridForm({ ...gridForm, center_lat: e.target.value })} />
          </div>

          <div className="formgroup">
            <label>Centre Longitude</label>
            <input type="number" step="0.00001" value={gridForm.center_lng} onChange={(e) => setGridForm({ ...gridForm, center_lng: e.target.value })} />
          </div>
        </div>

        <p className="smallnote">
          Add/Edit Grid creates a rectangular polygon around the centre point. A production version can replace this with a polygon drawing tool.
        </p>

        <div className="formactions">
          <button className="btn btn-ghost" onClick={() => setGridModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveGrid}>Save Grid</button>
        </div>
      </Modal>

      <Modal title={postcodeEditCode ? "Edit Postcode" : "Add Postcode"} open={postcodeModalOpen} onClose={() => setPostcodeModalOpen(false)}>
        <div className="formgrid">
          {postcodeEditCode && (
            <>
              <div className="formgroup">
                <label>Postcode</label>
                <input value={postcodeForm.postal_code} disabled />
              </div>

              <div className="formgroup">
                <label>Zone ID</label>
                <input value={postcodeForm.zone_id} onChange={(e) => setPostcodeForm({ ...postcodeForm, zone_id: e.target.value })} />
              </div>
            </>
          )}

          <div className="formgroup full">
            <label>Zone / Area Name</label>
            <input value={postcodeForm.zone_name} onChange={(e) => setPostcodeForm({ ...postcodeForm, zone_name: e.target.value })} />
          </div>

          <div className="formgroup">
            <label>Emirate</label>
            <select value={postcodeForm.emirate} onChange={(e) => setPostcodeForm({ ...postcodeForm, emirate: e.target.value })}>
              <option>Dubai</option>
              <option>Abu Dhabi</option>
              <option>Sharjah</option>
              <option>Ajman</option>
              <option>Umm Al Quwain</option>
              <option>Ras Al Khaimah</option>
              <option>Fujairah</option>
            </select>
          </div>

          <div className="formgroup">
            <label>Status</label>
            <select value={postcodeForm.status} onChange={(e) => setPostcodeForm({ ...postcodeForm, status: e.target.value })}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        {!postcodeEditCode && (
          <p className="smallnote">Postcode and Zone ID are generated automatically from the selected Emirate once you save (e.g. DXB-10458 / Z-DXB-09).</p>
        )}
        <p className="smallnote">Grid assignments remain based on grid records. Editing a postcode updates the linked zone/postcode reference used across grids and addresses.</p>

        <div className="formactions">
          <button className="btn btn-ghost" onClick={() => setPostcodeModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={savePostcode}>Save Postcode</button>
        </div>
      </Modal>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  badge?: number;
}) {
  return (
    <button className={`nv ${active ? "on" : ""}`} onClick={onClick}>
      <span>{icon}</span>
      <span>{label}</span>
      {typeof badge === "number" && <span className="navbadge">{badge}</span>}
    </button>
  );
}

function Badge({ text }: { text: string }) {
  const positive = text === "Active" || text === "Verified";
  return <span className={`chip ${positive ? "c-green" : "c-blue"}`}>{text}</span>;
}

function Stat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="card stat">
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      <div className="d">{detail}</div>
    </div>
  );
}

function AddressDetails({ address, pinDistance }: { address: Address; pinDistance?: number | null }) {
  const s42 = address.canonical_s42;
  const formatted = s42
    ? [s42.line1, s42.line2, s42.line3, s42.line4, s42.line5].filter(Boolean).join("\n")
    : address.formatted_address;

  return (
    <div>
      <div className="statusline">
        <span className="status">✓ {address.status}</span>
        <span className="demo">Prototype data</span>
      </div>

      {pinDistance != null && (
        <div className="hint" style={{ marginBottom: 8 }}>Matched to a verified address {pinDistance}m from the located point.</div>
      )}

      <div className="addr-id">{address.address_id}</div>
      <div className="hint">Canonical structured address · UPU S42-aligned template {address.template_version}</div>
      <div className="formatted">{formatted}</div>

      <div className="sectitle">Postal identity</div>
      <dl className="kv">
        <dt>Postcode</dt><dd className="mono">{address.postal_code}</dd>
        <dt>Grid ID</dt><dd className="mono">{address.grid_id}</dd>
        <dt>Zone ID</dt><dd className="mono">{address.zone_id}</dd>
        <dt>Latitude</dt><dd className="mono">{address.latitude.toFixed(5)}</dd>
        <dt>Longitude</dt><dd className="mono">{address.longitude.toFixed(5)}</dd>
        <dt>Makani number</dt><dd className="mono">{address.makani_number || "—"}</dd>
        <dt>Onwani reference</dt><dd className="mono">{address.onwani_reference || "—"}</dd>
      </dl>

      <div className="sectitle">Canonical address components</div>
      <dl className="kv">
        <dt>recipient_name</dt><dd>{address.recipient_name || "—"}</dd>
        <dt>organization_name</dt><dd>{address.organization_name || "—"}</dd>
        <dt>unit_type</dt><dd>{address.unit_type || "—"}</dd>
        <dt>unit_number</dt><dd>{address.unit_number || "—"}</dd>
        <dt>building_name</dt><dd>{address.building_name}</dd>
        <dt>building_number</dt><dd>{address.building_number || "—"}</dd>
        <dt>street_name</dt><dd>{address.street_name || "—"}</dd>
        <dt>street_type</dt><dd>{address.street_type}</dd>
        <dt>area_locality</dt><dd>{address.area_locality}</dd>
        <dt>emirate_admin_area</dt><dd>{address.emirate_admin_area}</dd>
        <dt>postal_code</dt><dd className="mono">{address.postal_code}</dd>
        <dt>country_code</dt><dd>{address.country_code}</dd>
        <dt>country_name</dt><dd>{address.country_name}</dd>
        <dt>template_version</dt><dd className="mono">{address.template_version}</dd>
      </dl>
    </div>
  );
}

function PinDropWarning({ pin }: { pin: PinDropResult }) {
  return (
    <div>
      <div className="statusline">
        <span className="warn">⚠ {pin.warning || "Address not listed in system"}</span>
      </div>

      <div className="hint">No verified address within 60m of this point. Showing Google's raw reverse-geocoded result instead.</div>
      <div className="formatted">{pin.google_formatted_address || "Google reverse geocoding did not return an address for this point."}</div>

      <div className="sectitle">Pin location</div>
      <dl className="kv">
        <dt>Latitude</dt><dd className="mono">{pin.lat.toFixed(5)}</dd>
        <dt>Longitude</dt><dd className="mono">{pin.lng.toFixed(5)}</dd>
      </dl>
    </div>
  );
}
