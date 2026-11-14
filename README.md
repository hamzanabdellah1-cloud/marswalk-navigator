# MarsWalk Navigator

A hackathon prototype for a short walk near Curiosity's boxwork formations on Mount Sharp, Gale crater. Place a start and a destination on one shared frame. The page finds up to three least-cost lines from a saved elevation grid.

Plan the walk. Know what to look for. Understand the trade-offs.

The ribbon is always: `Conceptual route for a hackathon prototype—not a verified safe route.`

A result is a lowest-cost route under the stated settings.

## How to run

Double-click `index.html`. The page is static HTML, CSS, and JavaScript. It loads local files only, so it works from `file://` with no server and no network.

## Route finder

1. Click a start (S), then a destination (D).
2. Optional: click up to two science stops. The line must pass through them in order.
3. Drag a marker to move it. Reset points clears them.
4. The map also takes arrow keys and Enter, or the Across % and Down % fields.

Each line is 8-connected A* on `data/grid.js`. Cells steeper than the slope slider, and cells with no elevation, cannot be entered. The default limit is 15°. The slider runs from 5° to 30°. The label on the page is: "Your slope limit. Not a NASA or crew limit."

Step cost:

`distance * (1 + wSlope * (slope / slopeLimit)^2) + wScience * distance * (1 - interest)`

`interest` is `ridge_score` in `tools/build_grid.py`: a topographic position index scaled from 0 to 1. The page calls it a terrain heuristic, not a measurement.

| Line | Weights |
| --- | --- |
| Shortest | wSlope 0, wScience 0 |
| Gentlest slope | wSlope 12, wScience 0 |
| Most science interest | wSlope 1.5, wScience 8 |

If two presets share a path, the page keeps one line and says "same as Shortest" (or whichever line it matches). The sliders recompute a custom line. The slope limit applies to every line.

Numbers on a card are computed from that grid. The source line is "Computed from USGS MSL Gale DEM, grid resolution 3.005 m." The shaded profile band is the source DEM pixel size, 1 m.

## Build the grid

The DEM crop is `data/gale_dem_crop.tif` (USGS Astrogeology, MSL Gale DEM Mosaic, 1 m, via NASA/JPL Mars Trek). The three map images use the bounds in `assets/maps/frame.json`.

```bash
python tools/build_grid.py
```

Requires Python packages `rasterio`, `numpy`, and `scipy`. The script resamples to at most 300 cells on the long side (this frame is 300 by 225, about 3 m). It writes `data/grid.js`. If that file is missing, the page says "Elevation grid not loaded" and leaves the finder off.

`python tools/fetch_maps.py` downloads the shared Trek crop again. The page does not call a tile server.

## Map frame

All three pictures are 1600 by 1200 pixels of the same 900 m by 675 m frame.

Center: 137.302600 E, 4.876048 S. That is the published center of a boxwork image in HiRISE frame PSP_001752_1750 (Siebach and Grotzinger).

| Tab | File | What it is |
| --- | --- | --- |
| Orbital image | `assets/maps/orbital.jpg` | MRO HiRISE Curiosity roving-site mosaic, layer `curiosity_hirise_mosaic` |
| Terrain | `assets/maps/terrain.jpg` | Local hillshade of the USGS MSL Gale DEM, 1 m, layer `Gale_DEM_SMG_1m` |
| Geology | `assets/maps/geology.jpg` | USGS SIM 3292. One unit fills the frame. Regional context only. |

Viking MDIM and MOLA color hillshade are cited only. MOLA is not used for the profile.

## Stop images

- Stop 1: PIA26558, Mastcam, NASA/JPL-Caltech/MSSS, May 16, 2025
- Stop 2: PIA26560, Mastcam, NASA/JPL-Caltech/MSSS, May 2025 only

The "Ex" markers are example photos on this frame. They are not a claim that Curiosity stood on that cell. If a line passes within 8 grid cells, the card offers "Open stop".

`sh tools/download_assets.sh` refreshes the NASA JPEGs. Files over about 400 KB are saved beside the page image and do not replace it.

## Known limits

- No soil-traction data.
- No rock or boulder data at walking scale.
- The DEM may have stereo artifacts.
- The orbital image is older than the 2025 Curiosity photos.
- Science interest is a terrain heuristic, not a measurement.
- The slope limit is the user's setting, not a NASA or crew limit.
- This frame is the 1 m mosaic, not the coarse CTX/HRSC fill. A coarse-fill cell would be marked on the confidence row.

## Not used

InSight weather is not on this page. That lander measured Elysium Planitia, not Gale crater, and the feed has long gaps. A key for `api.nasa.gov` is not required and is not stored in the page.

## Tests

```bash
node tests/pathfinder.test.js
```

The tests use a synthetic grid in `tests/` only. The page never loads it.

## Sources and credits

- NASA/JPL Mars Trek, https://trek.nasa.gov/mars/
- MRO HiRISE Curiosity roving-site mosaic, NASA/JPL-Caltech/University of Arizona
- USGS Astrogeology MSL Gale DEM, 1 m (Calef and Parker, 2016)
- USGS Geologic Map of Mars, Tanaka et al. 2014, SIM 3292, https://pubs.usgs.gov/sim/3292
- Viking MDIM 2.1 and MGS MOLA, cited only
- NASA Curiosity blog, sols 4655–4660, Sharon Wilson Purdy
- JPL PIA26558 and PIA26560, NASA/JPL-Caltech/MSSS
- PIA26306, acquired Dec. 10, 2006, released Nov. 18, 2024. Citation only.
- Curiosity's Proposed Path up Mount Sharp, May 15, 2019. Citation only.
- NASA Curiosity science instruments page. ChemCam and CheMin are named by role only.
