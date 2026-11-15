# DEM and route calculation data

This project includes a local USGS MSL Gale DEM crop at `data/dem/route_dem_source.tif` and a derived route grid at `data/route-grid.js`.

- Source product: USGS MSL Gale Merged DEM mosaic, labeled 1 m, served through NASA/JPL Mars Trek. The per-pixel source resolution in this crop was not recorded; the mosaic may contain coarser inputs.
- Calculation window: 137.2949656–137.3102344°E, −4.8817738 to −4.8703222°, about 900 × 677.5 m.
- Grid: 300 × 225 cells at 3.005 m spacing, derived from the local DEM crop.
- The user-selected 2 km image context in `data/area.json` is a different area. The app clearly labels the two windows.
- Original DEM retrieval date was not recorded in the earlier project; it was copied to this project on 2026-11-15. Treat the source-resolution confidence as unknown.

The route page calculates three A* alternatives from the DEM-derived grid. It does not claim that routes are safe or operationally approved. The grid does not encode wheel traction, rocks, soil strength, or rover-specific limits. Its ridge-interest score is a topographic heuristic, not measured scientific value.
