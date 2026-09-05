# UAE Address & Postal Code Platform

Runnable full-stack prototype for VS Code, styled after the "7X Postcode Showcase Console" prototype.

## Included modules

- Address Search (full-text, postcode, Makani, Onwani, coordinate search modes)
- Grid Engine (Create / Read / Update / Delete)
- Postcode Management (Create / Read / Update / Delete)
- Addresses / Address Registry (Create / Read / Update / Delete)
- Map-based location selection with click-to-resolve
- Google Maps forward & reverse geocoding (optional, see below)
- Postal grid overlay
- PostGIS point-in-polygon grid resolution
- UPU S42-aligned canonical address rendition (`canonical_s42` on every address)
- REST API
- PostgreSQL/PostGIS database
- Seed data: 15 postal zones, 10 postal grids and 35 verified addresses across Dubai Silicon Oasis and Al Barsha, each with a sample Makani number
- Docker Compose
- Free-hosting deployment guide

## Technology

- Frontend: Next.js + React + TypeScript
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL + PostGIS
- Map: Leaflet + OpenStreetMap for free local/demo usage; Google Geocoding API (optional) for forward/reverse geocoding
- API: REST/JSON
- Containers: Docker Compose

## Google Maps geocoding (optional)

Forward geocoding (`GET /api/v1/geocode?address=`) and reverse geocoding (`GET /api/v1/reverse-geocode?lat=&lng=`) call the Google Geocoding API from the backend, keyed by the `GOOGLE_MAPS_API_KEY` environment variable. The map display itself stays on free Leaflet/OpenStreetMap tiles, so no client-side Google key or billing setup is required just to run the app.

Without a key configured, the rest of the app works normally — the Address Form's "Locate" button and map-click reverse-geocode enrichment simply become no-ops, while PostGIS grid/zone/postcode resolution (which does not depend on Google) continues to work.

To enable it: get a Google Cloud API key with the **Geocoding API** enabled, then set `GOOGLE_MAPS_API_KEY` in `backend/.env` (or as a Docker Compose environment variable).

## Run from VS Code with Docker

Requirements:

- VS Code
- Docker Desktop

Open this folder in VS Code and run:

```bash
docker compose up --build
```

Then open:

- Application: http://localhost:3000
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs

Stop:

```bash
docker compose down
```

Reset the database and seed data:

```bash
docker compose down -v
docker compose up --build
```

## Run without Docker for frontend/backend

Start only the database:

```bash
docker compose up db
```

Backend:

```bash
cd backend
python -m venv .venv
```

Windows:

```powershell
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Then:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

## Notes

The supplied postal codes, grids, Makani numbers, Onwani references and addresses are prototype/demo data only.

The internal Address Registry is treated as the authoritative postal master. External identifiers are references only.

The `canonical_s42` rendition aligns with the UPU S42 canonical addressing model (structured lines derived from canonical fields, with a configurable template version). This is not a claim of formal UAE S42 certification.

See `DEPLOY_FREE.md` for Vercel + Render + Supabase deployment.
