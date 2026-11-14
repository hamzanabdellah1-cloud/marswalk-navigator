"""Fill distance, slope, and the elevation profile in data/routes.js.

Input: data/routes.geojson and data/gale_dem_crop.tif.
The GeoTIFF is a same-frame export of the USGS MSL Gale DEM (1 m)
from NASA/JPL Mars Trek. data/frame.json holds its west, south, east,
and north edges in degrees.

Distance uses the haversine formula and a Mars radius of 3389.5 km.
Elevation is sampled every 5 m. Slope is the rise of each sample step.
The global MOLA layer is refused: its pixels are far larger than this walk.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEM_PATH = ROOT / "data" / "gale_dem_crop.tif"
FRAME_PATH = ROOT / "assets" / "maps" / "frame.json"
GEOJSON_PATH = ROOT / "data" / "routes.geojson"
ROUTES_PATH = ROOT / "data" / "routes.js"

MARS_RADIUS_M = 3389500.0
SAMPLE_M = 5.0
ERR_M = 1.0
SOURCE = "NASA/JPL Mars Trek; USGS MSL Gale DEM Mosaic, 1 m"
METHOD = (
    "Haversine distance with a Mars radius of 3389.5 km. "
    "Elevation sampled every 5 m from the Gale DEM. "
    "Slope is the rise of each 5 m step."
)


def refuse_mola(path):
    if "mola" in path.name.lower():
        sys.exit("Refusing a MOLA file. Its pixels are too coarse for this walk.")


def load_dem():
    refuse_mola(DEM_PATH)
    grid = np.array(Image.open(DEM_PATH), dtype=np.float64)
    frame = json.loads(FRAME_PATH.read_text(encoding="utf-8"))
    try:
        import rasterio
        with rasterio.open(DEM_PATH) as dataset:
            if dataset.crs and dataset.transform and dataset.width == grid.shape[1]:
                # The Trek export has no map CRS. Keep the frame.json edges.
                pass
    except ImportError:
        pass
    return grid, frame


def to_lonlat(point, frame):
    lon = frame["west"] + (point["x"] / 100.0) * (frame["east"] - frame["west"])
    lat = frame["north"] - (point["y"] / 100.0) * (frame["north"] - frame["south"])
    return lat, lon


def haversine(a, b):
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * MARS_RADIUS_M * math.asin(math.sqrt(max(0.0, h)))


def sample_elev(grid, frame, lat, lon):
    rows, cols = grid.shape
    c = (lon - frame["west"]) / (frame["east"] - frame["west"]) * (cols - 1)
    r = (frame["north"] - lat) / (frame["north"] - frame["south"]) * (rows - 1)
    c = min(max(c, 0.0), cols - 1)
    r = min(max(r, 0.0), rows - 1)
    c0, r0 = int(c), int(r)
    c1, r1 = min(c0 + 1, cols - 1), min(r0 + 1, rows - 1)
    tc, tr = c - c0, r - r0
    top = grid[r0, c0] * (1 - tc) + grid[r0, c1] * tc
    bot = grid[r1, c0] * (1 - tc) + grid[r1, c1] * tc
    return top * (1 - tr) + bot * tr


def densify(latlons):
    dense = [latlons[0]]
    for start, end in zip(latlons, latlons[1:]):
        steps = max(1, int(round(haversine(start, end) / SAMPLE_M)))
        for index in range(1, steps + 1):
            t = index / steps
            dense.append((
                start[0] + (end[0] - start[0]) * t,
                start[1] + (end[1] - start[1]) * t,
            ))
    return dense


def measure(grid, frame, points):
    latlons = [to_lonlat(point, frame) for point in points]
    dense = densify(latlons)
    distance = 0.0
    previous = dense[0]
    previous_elev = sample_elev(grid, frame, *previous)
    profile = [{"d": 0.0, "elev": round(previous_elev, 1), "err": ERR_M}]
    weighted = 0.0
    max_slope = 0.0
    for point in dense[1:]:
        step = haversine(previous, point)
        elev = sample_elev(grid, frame, *point)
        if step > 0:
            slope = math.degrees(math.atan(abs(elev - previous_elev) / step))
            max_slope = max(max_slope, slope)
            weighted += slope * step
            distance += step
            profile.append({"d": round(distance, 1), "elev": round(elev, 1), "err": ERR_M})
        previous, previous_elev = point, elev
    mean_slope = weighted / distance if distance else 0.0
    return latlons, {
        "distance_m": int(round(distance)),
        "max_slope_deg": round(max_slope, 1),
        "mean_slope_deg": round(mean_slope, 1),
        "profile": profile,
        "profile_resolution_m": ERR_M,
        "source": SOURCE,
        "method": METHOD,
    }


def main():
    grid, frame = load_dem()
    collection = json.loads(GEOJSON_PATH.read_text(encoding="utf-8"))
    routes = []
    for feature in collection["features"]:
        props = feature["properties"]
        points = props["points"]
        latlons, stats = measure(grid, frame, points)
        feature["geometry"]["coordinates"] = [[lon, lat] for lat, lon in latlons]
        waypoints = []
        for point, (lat, lon) in zip(points, latlons):
            waypoint = {
                "id": point["id"],
                "x": point["x"],
                "y": point["y"],
                "lat": round(lat, 6),
                "lon": round(lon, 6),
            }
            if "mark" in point:
                waypoint["mark"] = point["mark"]
            if "name" in point:
                waypoint["name"] = point["name"]
            if "stop" in point:
                waypoint["stop"] = point["stop"]
            waypoints.append(waypoint)
        routes.append({
            "id": props["id"],
            "name": props["name"],
            "waypoints": waypoints,
            "distance_m": stats["distance_m"],
            "max_slope_deg": stats["max_slope_deg"],
            "mean_slope_deg": stats["mean_slope_deg"],
            "profile": stats["profile"],
            "profile_resolution_m": stats["profile_resolution_m"],
            "tradeoffs": props["tradeoffs"],
            "source": stats["source"],
            "method": stats["method"],
        })
        print(props["id"], stats["distance_m"], stats["max_slope_deg"], stats["mean_slope_deg"])
    GEOJSON_PATH.write_text(json.dumps(collection, indent=2), encoding="utf-8")
    body = json.dumps(routes, indent=2)
    ROUTES_PATH.write_text("window.MARSWALK_ROUTES = " + body + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
