# Free Hosting Deployment

## Recommended prototype arrangement

- Frontend: Vercel
- Backend: Render
- Database: Supabase PostgreSQL + PostGIS
- Map: Leaflet + OpenStreetMap for prototype use

## 1. Supabase database

Create a Supabase project.

Open SQL Editor and run the entire file:

`backend/sql/init.sql`

The script enables PostGIS and creates/seeds:

- postal_zone
- postal_grid
- address

Copy the Supabase PostgreSQL connection string.

Backend `DATABASE_URL` format:

```text
postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE
```

## 2. Render backend

Create a new Render Web Service from your GitHub repository.

Settings:

- Root Directory: `backend`
- Runtime: Docker

Environment variables:

```text
DATABASE_URL=postgresql+psycopg://...
CORS_ORIGINS=https://YOUR-FRONTEND.vercel.app
GOOGLE_MAPS_API_KEY=your-key-here
```

`GOOGLE_MAPS_API_KEY` is optional — it only enables `/api/v1/geocode` and `/api/v1/reverse-geocode` (Google-backed forward/reverse geocoding). Leave it blank and everything else, including PostGIS grid/zone/postcode resolution, still works.

After deployment, verify:

```text
https://YOUR-BACKEND.onrender.com/health
https://YOUR-BACKEND.onrender.com/docs
```

## 3. Vercel frontend

Import the GitHub repository.

Settings:

- Root Directory: `frontend`
- Framework: Next.js

Environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://YOUR-BACKEND.onrender.com
```

Deploy.

## Google Maps geocoding

The map display stays on Leaflet/OpenStreetMap so the app runs free without any Google billing setup. Google is used only for geocoding, called from the backend (not the browser), via:

```text
GET /api/v1/geocode?address=...            (forward geocode)
GET /api/v1/reverse-geocode?lat=...&lng=... (reverse geocode, merged with PostGIS grid/zone/postcode)
```

Set `GOOGLE_MAPS_API_KEY` on the Render backend to enable these two endpoints. Without it, both return a 503 and the rest of the app (including PostGIS point-in-polygon resolution at `GET /api/v1/spatial/resolve?lat=...&lng=...`) is unaffected.

If you later want the map tiles themselves on Google Maps JS instead of Leaflet, replace `frontend/components/MapPanel.tsx` — that would need a separate, domain-restricted client-side Google Maps JavaScript API key and a billing-enabled Google Cloud project, since the free-hosting path above avoids that entirely.

PostGIS remains responsible for assigning:

- Grid ID
- Zone ID
- Postcode
