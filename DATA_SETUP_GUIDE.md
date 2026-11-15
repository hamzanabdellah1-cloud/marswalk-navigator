# MarsWalk: data setup, step by step

## Current project status (2026-11-15)

This folder already contains a selected color context map and a separate, preprocessed Gale DEM route window. Open `index.html`, then choose **Open DEM route calculation** to calculate three terrain route alternatives. The route window is 137.29497–137.31023°E, −4.88177 to −4.87032°; it is separate from the selected context image. The DEM mosaic is labeled 1 m, but the per-pixel source resolution and original retrieval date were not recorded. Do not describe its routes as safe or operational rover paths. The steps below are the broader data-acquisition guide; they are not required to run the existing route demo.

Rule: **a file goes into the project only when its entry in `data/manifest.json` has a source, a credit and a retrieval date.** `tools/check_manifest.py` enforces this. It marks a file BLOCKED if the metadata is missing, and MISSING (fine) if the file is not added yet.

Legend: **TESTED** = I ran it here. **UNTESTED** = written from the documentation, so run it and check the result. **VERIFY** = a fact to confirm yourself.

## Step 0. Create the folder structure (TESTED)

```bash
bash setup_project.sh marswalk
cd marswalk
python3 tools/check_manifest.py      # expect: all MISSING, Result: PASS
pip install rasterio pyproj numpy    # for the clipping tool
```

Result:

```
marswalk/
  assets/maps/      orbital map (small)
  assets/stops/     the two Curiosity photos
  data/dem/         clipped DEM + metadata
  data/geology/     regional geology GeoJSON
  data/weather/     optional REMS sample
  data/routes/      measured routes only
  data/snapshots/   NASA API snapshots (later)
  data/manifest.json
  raw/              big downloads, ignored by git
  tools/            check_manifest.py, clip_raster.py
  qa/evidence/
```

## Step 1. Choose your area (VERIFY)

You need one small box of lon/lat (degrees east) over the boxwork area you will demo. Pick it by eye in Mars Trek or on the HiRISE mosaic page, and note the corner coordinates. I did not find boxwork coordinates in any source, so do not copy numbers from this chat. Stay inside the USGS mosaic extent: lat -5.2495 to -4.0686, lon 137.0947 to 137.8539 E.

## Step 2. Orbital map (UNTESTED on the real file)

- **Source (verified):** USGS "Mars MSL Gale Merged Orthophoto Mosaic 25 cm", v3. Use constraints: none. Color version (about 1 GB): `https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif`. Do not download the 23 GB file.
- Clip only your box, reading the remote file in place (works if the server allows range requests, which COG files are designed for):

```bash
python3 tools/clip_raster.py "/vsicurl/https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif" raw/orbital_clip.tif LON_MIN LAT_MIN LON_MAX LAT_MAX
```

- Convert to a web image under about 1.5 MB (for example `gdal_translate -of JPEG -outsize 1600 0 raw/orbital_clip.tif assets/maps/orbital.jpg`, or open it in any image tool).
- In `manifest.json` fill: `retrieved_on`, `resolution` (check with `gdalinfo`), and keep the credit as written: Calef III & Parker (2016), PDS Annex, USGS.

## Step 3. Elevation (DEM) (UNTESTED on the real file)

- **Source (verified):** USGS "Mars MSL Gale Merged DEM 1 m", v3, by Parker and Calef (JPL-Caltech, NASA, USGS Astrogeology, University of Arizona). File: `https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif`, 3.6 GB.
- **Important caveat from the metadata:** it is 1 m only where HiRISE stereo exists. Elsewhere it falls back to CTX, then HRSC, then MOLA. The page does not give a per-pixel source map, so check roughness of your clip by eye (very smooth blocks usually mean coarse fill). If you cannot tell, write `"resolution": "unknown, between 1 m and about 30 m"` and show that in the confidence panel.
- Clip your box with the same tool, using the same box as the orbital map:

```bash
python3 tools/clip_raster.py "/vsicurl/https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif" data/dem/gale_dem_clip.tif LON_MIN LAT_MIN LON_MAX LAT_MAX
```

If remote reading fails, download the 3.6 GB file into `raw/` and clip the local file. The tool prints the nodata value. Record it in the manifest.
- Create `data/dem/gale_dem_clip.meta.json` with: source URL, credit, box, pixel size, CRS, nodata, date.

## Step 4. Geology, regional context (UNTESTED)

- **Source (verified):** USGS Geologic Map of Mars, SIM 3292 (Tanaka et al., 2014), `https://pubs.usgs.gov/sim/3292`. Minimum mapped outcrop is 40 x 100 km, so your area is one unit or very few. Label it "Regional context only".
- Option A, the ArcGIS service in `sources.json`. Query it with `f=geojson` and your box:

```
https://services.arcgis.com/nzS0F0zdNLvs7nc8/ArcGIS/rest/services/Mars_Geology_feature_layer/FeatureServer/0/query?where=1%3D1&geometry=LON_MIN,LAT_MIN,LON_MAX,LAT_MAX&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&f=geojson
```

**Check the result visually:** the polygons must fall on Gale. The service uses a Mars-specific coordinate system, and passing Earth's 4326 code could shift the box. If it looks wrong, use option B.
- Option B, safer: download the SIM 3292 GIS data from the USGS page and clip it locally with `ogr2ogr -clipsrc LON_MIN LAT_MIN LON_MAX LAT_MAX`.
- Save as `data/geology/tanaka2014_gale.geojson`, keep the unit names and codes, and fill the manifest.

## Step 5. Curiosity photos (UNTESTED download, URLs from the JPL pages)

```bash
curl -L -o assets/stops/pia26558.jpg https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpegPIA26558.jpg
curl -L -o assets/stops/pia26560.jpg https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpegPIA26560.jpg
```

- Open each JPL page (URLs are in the manifest) and confirm the title, instrument and credit: **NASA/JPL-Caltech/MSSS**.
- Resize if over about 400 KB.
- **Date warning:** the two pages give conflicting sol numbers (May 16 as sol 4541, May 22 as sol 4536). In the UI say "May 2025" only.

## Step 6. Optional weather sample from NASA PDS (VERIFY, the most uncertain step)

- **Source (verified page):** PDS Atmospheres Node, Curiosity REMS: `https://atmos.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems.html`. The page lists reduced-data products (ENVRDR, MODRDR, TELRDR) with pressure in pascals and temperature in kelvin. The volume ID for reduced data is `mslrem_1001`.
- **Take only a small sample**, for example one or two sols of MODRDR, and convert to a small JSON file with exactly these keys, which `check_manifest.py` requires: `sols`, `units`, `location`, `rdr_product`, plus the values.
- **Location:** REMS measures at the rover, not on your route. I did not verify a file that gives the rover position per sol. If you cannot cite one, write `"location": "Curiosity rover position, Gale crater (coordinates not recorded)"`. Do not invent coordinates.
- **Date mismatch to know:** the page I read lists certified data through sol 4488 (March 2025), earlier than the May 2025 boxwork photos. Do not present the weather sample as conditions during those photos. Label it "REMS sample, sol X".
- If this takes more than 30 minutes, skip it. It is optional.

## Step 7. Routes (only if measured)

Route files go in `data/routes/` only if you have real coordinates, for example from the Mars Trek path or elevation-profile tool. In the manifest, fill `measured_with` (tool, layer, date). The checker blocks a route file without it. If you have none, the app computes routes from your DEM clip, and those computed routes are labeled as such, not as measurements.

## Step 8. Final check

```bash
python3 tools/check_manifest.py
```

Goal: no BLOCKED lines. MISSING lines are fine for optional items (weather, geology). Commit `data/manifest.json` with the data.

## What this guide could not verify

- The exact coordinates of the boxwork area and whether your box has 1 m DEM coverage.
- Whether the remote files accept range reads from your network.
- The ArcGIS query result and the exact REMS file names.
