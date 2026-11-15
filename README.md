# MarsWalk Navigator — routes and data status

Open `index.html` for the selected 2 km color context map. Use the **Open DEM route calculation** button or open `route-demo.html` to calculate routes from the separate Gale boxwork DEM window.

## The two areas

- Context map: 137.37402–137.40788°E, −4.70125 to −4.66751°. The USGS color mosaic preview is for visual context.
- Route calculation: 137.29497–137.31023°E, −4.88177 to −4.87032°. A local crop of the Gale DEM mosaic (labeled 1 m; per-pixel source resolution unknown) is reduced to a 300 × 225 grid at 3.005 m spacing. This area is separate from the context image.

## Run locally

From this folder, run `python -m http.server 8000` and open `http://localhost:8000/`. The route page works from local files and does not need an API key.

## Route model

The route calculator runs 8-connected A* over the real DEM-derived grid. It compares Shortest, Gentlest slope, and Ridge-interest heuristic options. Each card reports distance, maximum slope, ascent, descent, mean slope, and the heuristic score. The slope limit is a prototype planning parameter, not a NASA rover or crew safety rule. The ridge score is topographic, not measured science interest. The model does not include traction, rocks, wheel slip, or operational constraints.

## Credits and limitations

The route grid and hillshade were inherited from the earlier local project. Credit the USGS MSL Gale DEM Mosaic through NASA/JPL Mars Trek. The original DEM retrieval date was not recorded; the data files were copied into this project on 2026-11-15. See `data/manifest.json` and `data/route-data-notes.md`.
