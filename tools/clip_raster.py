#!/usr/bin/env python3
"""Clip a Mars raster (local file or /vsicurl/ URL) to a lon/lat box.
Usage: clip_raster.py SRC OUT LON_MIN LAT_MIN LON_MAX LAT_MAX
Example: clip_raster.py /vsicurl/https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif data/dem/gale_dem_clip.tif 137.38 -4.70 137.50 -4.60
Longitude is degrees east. Needs: rasterio, pyproj."""
import sys, rasterio, pyproj
from rasterio.windows import from_bounds, Window
src_path, out_path = sys.argv[1], sys.argv[2]
lon0, lat0, lon1, lat1 = map(float, sys.argv[3:7])
with rasterio.open(src_path) as src:
    crs = pyproj.CRS.from_user_input(src.crs.to_wkt())
    tr = pyproj.Transformer.from_crs(crs.geodetic_crs, crs, always_xy=True)
    corners = [tr.transform(x, y) for x in (lon0, lon1) for y in (lat0, lat1)]
    xs, ys = [c[0] for c in corners], [c[1] for c in corners]
    win = from_bounds(min(xs), min(ys), max(xs), max(ys), src.transform).round_offsets().round_lengths()
    try:
        win = win.intersection(Window(0, 0, src.width, src.height))
    except Exception:
        sys.exit("Box does not overlap the raster. Check lon/lat order and the raster extent (gdalinfo).")
    if win.width < 2 or win.height < 2:
        sys.exit("Box is outside the raster or too small. Check the lon/lat order and the raster extent.")
    data = src.read(window=win)
    prof = src.profile.copy()
    prof.update(height=data.shape[1], width=data.shape[2], transform=src.window_transform(win), compress="deflate")
    if data.shape[0] >= 3:
        prof["photometric"] = "RGB"
    else:
        prof.pop("photometric", None)
    with rasterio.open(out_path, "w", **prof) as dst:
        dst.write(data)
    px = abs(src.transform.a)
    print(f"Wrote {out_path}: {data.shape[2]}x{data.shape[1]} px, pixel size {px:g} CRS units, nodata={src.nodata}")
    print("Now record in data/manifest.json: retrieved_on, resolution, source file name.")
