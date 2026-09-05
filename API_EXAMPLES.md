# API Examples

Health:

```bash
curl http://localhost:8000/health
```

List grids:

```bash
curl http://localhost:8000/api/v1/grids
```

Resolve map point:

```bash
curl "http://localhost:8000/api/v1/spatial/resolve?lat=25.121&lng=55.384"
```

Search (also matches Makani/Onwani/search aliases, or `lat,lng` for nearest-address lookup):

```bash
curl "http://localhost:8000/api/v1/addresses/search?q=Innovation"
curl "http://localhost:8000/api/v1/addresses/search?q=25.1127,55.3668"
```

Resolve a Makani or Onwani reference to its Address ID:

```bash
curl "http://localhost:8000/api/v1/address-identifiers/makani/3985210001"
curl "http://localhost:8000/api/v1/address-identifiers/onwani/ONW-DEMO-24001"
```

Forward geocode via Google (requires `GOOGLE_MAPS_API_KEY` on the backend):

```bash
curl "http://localhost:8000/api/v1/geocode?address=Dubai+Silicon+Oasis"
```

Reverse geocode via Google, merged with the PostGIS grid/zone/postcode resolution:

```bash
curl "http://localhost:8000/api/v1/reverse-geocode?lat=25.1127&lng=55.3668"
```

Delete a record (also available for `/api/v1/grids/{grid_id}` and `/api/v1/postcodes/{postal_code}`, both of which refuse to delete while linked records still exist):

```bash
curl -X DELETE "http://localhost:8000/api/v1/addresses/ADD-001246"
```

Swagger:

```text
http://localhost:8000/docs
```
