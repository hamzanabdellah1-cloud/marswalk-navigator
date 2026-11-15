# Cursor handoff — MarsWalk Navigator

The project has two deliberately separate map windows:

1. `index.html` shows the user's selected 2 km color orbital context map at the bounds in `data/area.json`.
2. `route-demo.html` computes routes on the separate Gale boxwork DEM calculation window in `data/route-area.json`, using `data/dem/route_dem_source.tif`, `data/route-grid.js`, `assets/maps/route-terrain.jpg`, and `pathfinder.js`.

The route page already runs 8-connected A* from user-selected endpoints and compares Shortest, Gentlest slope, and Ridge-interest heuristic options. Preserve that calculation and its visible distinction between the context image and the DEM window. Do not overlay route paths on the context image or claim the two boxes match.

Use the DEM source credit in `data/manifest.json`. The route grid spacing is 3.005 m and its source DEM is identified as 1 m. The original retrieval date is unknown. The ridge score is a topographic heuristic, not measured science. Never claim the computed routes are safe, operational rover commands, or measured NASA traverse routes.

For presentation, open `route-demo.html` directly or start `python -m http.server 8000` and visit `http://localhost:8000/route-demo.html`. Keep all paths relative and run the project's JavaScript and manifest checks after changes.
