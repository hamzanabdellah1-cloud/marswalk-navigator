"""Download a shared Mars Trek crop for the walk map.

Tiles come from confirmed WMTS GetCapabilities documents.
The page itself stays local. This script is run once, by hand or here.
"""
import json
import math
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "maps"
TILE = 256

# Confirmed 2026-11-14 from each layer's WMTSCapabilities.xml.
LAYERS = {
    "orbital": {
        "template": "https://trek.nasa.gov/tiles/Mars/EQ/curiosity_hirise_mosaic/1.0.0/default/default028mm/{z}/{row}/{col}.png",
        "max_z": 16,
    },
    "terrain": {
        "template": "https://trek.nasa.gov/tiles/Mars/EQ/Gale_DEM_SMG_1m/1.0.0/default/default028mm/{z}/{row}/{col}.png",
        "max_z": 14,
    },
    "geology": {
        "template": "https://trek.nasa.gov/mars/trekarcgis/rest/services/SIM3292_Global_Geology/MapServer/WMTS/tile/1.0.0/SIM3292_Global_Geology/default/default028mm/{z}/{row}/{col}.png",
        "max_z": 11,
    },
}


def tile_span(z):
    return 360.0 / (2 ** (z + 1))


def lonlat_to_tile(lon, lat, z):
    span = tile_span(z)
    col = math.floor((lon + 180.0) / span)
    row = math.floor((90.0 - lat) / span)
    return col, row


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "MarsWalkNavigator/1.0"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read()


def stitch(layer, west, south, east, north, z):
    z = min(z, LAYERS[layer]["max_z"])
    span = tile_span(z)
    col0, row1 = lonlat_to_tile(west, south, z)
    col1, row0 = lonlat_to_tile(east, north, z)
    cols = range(col0, col1 + 1)
    rows = range(row0, row1 + 1)
    canvas = Image.new("RGB", (len(list(cols)) * TILE, len(list(rows)) * TILE), (28, 25, 21))
    template = LAYERS[layer]["template"]
    for r_i, row in enumerate(rows):
        for c_i, col in enumerate(cols):
            url = template.format(z=z, row=row, col=col)
            try:
                data = fetch(url)
            except Exception as exc:
                print("miss", layer, z, row, col, exc)
                continue
            tile_path = OUT / "_tiles" / f"{layer}-{z}-{row}-{col}.png"
            tile_path.parent.mkdir(parents=True, exist_ok=True)
            tile_path.write_bytes(data)
            tile = Image.open(tile_path).convert("RGB")
            canvas.paste(tile, (c_i * TILE, r_i * TILE))
    left = int(round(((west + 180.0) / span - col0) * TILE))
    top = int(round(((90.0 - north) / span - row0) * TILE))
    right = int(round(((east + 180.0) / span - col0) * TILE))
    bottom = int(round(((90.0 - south) / span - row0) * TILE))
    cropped = canvas.crop((left, top, right, bottom))
    return cropped, z


def save_hillshade(west, south, east, north):
    """Local stretch of the 1 m Gale DEM. The WMTS grayscale is stretched globally and looks blank here."""
    import urllib.parse
    import urllib.request

    import numpy as np

    query = urllib.parse.urlencode({
        "bbox": ",".join(str(v) for v in (west, south, east, north)),
        "bboxSR": "104905",
        "imageSR": "104905",
        "size": "900,675",
        "format": "tiff",
        "pixelType": "F32",
        "interpolation": "RSP_BilinearInterpolation",
        "f": "image",
    })
    url = "https://trek.nasa.gov/mars/trekarcgis/rest/services/Gale_DEM_SMG_1m/ImageServer/exportImage?" + query
    data = fetch(url)
    dem_path = ROOT / "data" / "gale_dem_crop.tif"
    dem_path.write_bytes(data)
    grid = np.array(Image.open(dem_path), dtype=np.float64)
    dzdy, dzdx = np.gradient(grid, 1.0, 1.0)
    slope = np.arctan(np.hypot(dzdx, dzdy))
    aspect = np.arctan2(dzdy, -dzdx)
    zenith = math.radians(45)
    azimuth = math.radians(315)
    shade = np.cos(zenith) * np.cos(slope) + np.sin(zenith) * np.sin(slope) * np.cos(azimuth - aspect)
    low, high = np.percentile(shade, 2), np.percentile(shade, 98)
    shade = np.clip((shade - low) / (high - low or 1), 0, 1)
    image = Image.fromarray((shade * 255).astype(np.uint8), mode="L")
    return image.resize((1600, 1200), Image.Resampling.LANCZOS)


def main():
    # Published boxwork image center from Siebach and Grotzinger,
    # HiRISE PSP_001752_1750: 137.302600 E, 4.876048 S.
    # The window is 900 m by 675 m so a short walk fits in one shared frame.
    center_lon, center_lat = 137.302600, -4.876048
    radius = 3389500.0
    m_lat = radius * math.pi / 180.0
    m_lon = m_lat * math.cos(math.radians(center_lat))
    half_x, half_y = 450.0, 337.5
    west = center_lon - half_x / m_lon
    east = center_lon + half_x / m_lon
    south = center_lat - half_y / m_lat
    north = center_lat + half_y / m_lat
    orbital, oz = stitch("orbital", west, south, east, north, 16)
    orbital = orbital.resize((1600, 1200), Image.Resampling.LANCZOS)
    terrain = save_hillshade(west, south, east, north)
    tz = "1m-hillshade"
    geology, gz = stitch("geology", west, south, east, north, 11)
    geology = geology.resize((1600, 1200), Image.Resampling.NEAREST)
    OUT.mkdir(parents=True, exist_ok=True)
    orbital.save(OUT / "orbital.jpg", quality=82, optimize=True)
    terrain.save(OUT / "terrain.jpg", quality=82, optimize=True)
    geology.save(OUT / "geology.jpg", quality=82, optimize=True)
    meta = {
        "west": west,
        "south": south,
        "east": east,
        "north": north,
        "width": 1600,
        "height": 1200,
        "orbital_zoom": oz,
        "terrain_zoom": tz,
        "geology_zoom": gz,
    }
    (OUT / "frame.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(json.dumps(meta))
    for name in ("orbital.jpg", "terrain.jpg", "geology.jpg"):
        print(name, (OUT / name).stat().st_size)


if __name__ == "__main__":
    main()
