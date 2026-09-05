import os
import httpx
from fastapi import HTTPException

GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

COMPONENT_MAP = {
    "street_number": "street_number",
    "route": "route",
    "sublocality": "sublocality",
    "sublocality_level_1": "sublocality",
    "locality": "locality",
    "administrative_area_level_1": "administrative_area",
    "postal_code": "postal_code",
    "country": "country",
}

def _api_key() -> str:
    key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            503,
            "Google Maps geocoding is not configured. Set GOOGLE_MAPS_API_KEY on the backend to enable this feature.",
        )
    return key

def _extract_components(address_components: list[dict]) -> dict:
    out = {v: "" for v in set(COMPONENT_MAP.values())}
    for c in address_components:
        for t in c.get("types", []):
            if t in COMPONENT_MAP:
                out[COMPONENT_MAP[t]] = c.get("long_name", "")
                break
    return out

def _call_google(params: dict) -> dict:
    params = {**params, "key": _api_key()}
    try:
        resp = httpx.get(GOOGLE_GEOCODE_URL, params=params, timeout=10.0)
        resp.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Could not reach Google Geocoding API: {e}") from e

    data = resp.json()
    status = data.get("status")
    if status != "OK":
        if status == "ZERO_RESULTS":
            raise HTTPException(404, "Google Geocoding API returned no results for this input.")
        raise HTTPException(502, f"Google Geocoding API error: {status} {data.get('error_message', '')}".strip())

    return data["results"][0]

def forward_geocode(address: str) -> dict:
    result = _call_google({"address": address, "region": "ae"})
    loc = result["geometry"]["location"]
    return {
        "formatted_address": result.get("formatted_address", ""),
        "latitude": loc["lat"],
        "longitude": loc["lng"],
        "components": _extract_components(result.get("address_components", [])),
        "place_id": result.get("place_id"),
    }

def reverse_geocode(lat: float, lng: float) -> dict:
    result = _call_google({"latlng": f"{lat},{lng}"})
    loc = result["geometry"]["location"]
    return {
        "formatted_address": result.get("formatted_address", ""),
        "latitude": loc["lat"],
        "longitude": loc["lng"],
        "components": _extract_components(result.get("address_components", [])),
        "place_id": result.get("place_id"),
    }
