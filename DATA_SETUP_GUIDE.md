# MarsWalk Navigator: current data

This guide describes only data used by the current app. It has two separate Gale Crater areas: an orbital context image and a DEM window for route calculations. The calculated paths belong to the DEM window and are not overlaid on the context image.

## Run the app

From this folder, run `python -m http.server 8000` and open `http://localhost:8000/`. No API key is used.

## Included files

| File | Role |
| --- | --- |
| `assets/maps/orbital.jpg` | USGS color image for the selected context area. |
| `data/area.json` | Geographic bounds used to place the context image. |
| `data/dem/route_dem_source.tif` | Local USGS/NASA Gale DEM crop for the route window. The browser does not read this file directly. |
| `data/route-grid.js` | DEM-derived elevation and slope grid used by the browser’s A* route calculation. |
| `assets/maps/route-terrain.jpg` | Hillshade matching the DEM route window. This is the map where calculated routes are shown. |
| `data/route-area.json` | Geographic bounds and grid details for the route window. |
| `data/manifest.json` | Source names, credits, retrieval notes, and limits for the four included assets. |

The context image covers approximately 2 km × 2 km around 137.39095°E, 4.68438°S. The route DEM window covers approximately 900 m × 677.5 m around 137.3026°E, 4.8760°S. These locations are different.

## Data limits

- The DEM mosaic is labeled 1 m, but the source resolution at every pixel is not known. The route grid spacing is about 3.005 m.
- Routes are computed from the local DEM grid. They are not NASA rover traverses or safety instructions.
- The overview image is used for visual context and coordinate placement only; image brightness is not treated as elevation.
- This version has no local geology layer, geolocated Curiosity photo stops, or weather feed.

## Check the source list

Run `python tools/check_manifest.py`. It checks that every included file has its required source and credit information.

`tools/clip_raster.py` is a maintenance tool for making a new raster crop; it requires `rasterio` and `pyproj`. It is not needed to run the current web app.
