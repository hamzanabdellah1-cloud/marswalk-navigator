/* MarsWalk Navigator
   Reads data/area.json and data/manifest.json.
   Places the JPEG with those bounds. Does not read pixel values,
   does not load raw GeoTIFFs, and does not invent a route.
*/

const MARS_MEAN_RADIUS_KM = 3389.5;
const DEMO_MS = 90000;
const STEP_MS = 15000;

const DISTANCE_LABELS = {
  shorter: "Shorter",
  balanced: "Balanced",
  longer: "Longer"
};

const SCIENCE_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High"
};

const DEMO_STEPS = [
  {
    spot: null,
    title: "Pitch",
    body: "MarsWalk pairs a visual context map with a separate Gale DEM window where three terrain-based route options are calculated and compared. The paths stay on the DEM window they were calculated from."
  },
  {
    spot: "map",
    title: "Selected site",
    body: "This frame is the selected site, about two kilometers on a side. The picture is a resized USGS color mosaic. The file has no coordinates of its own. The app places it with the bounds stored for this box. North is up."
  },
  {
    spot: "sources",
    title: "Sources",
    body: "The source panel records the imagery and DEM credits. The DEM route window is separate from this context image, so its calculated paths appear in the route calculator rather than on this map."
  },
  {
    spot: "controls",
    title: "Planning baselines",
    body: "Tap this map to read coordinates or mark context points. These planning controls do not drive routes here. The route calculator has its own endpoints and slope setting for the separate DEM window."
  },
  {
    spot: "route",
    title: "Calculated route options",
    body: "The context map is not the route map. Open the separate DEM route calculator to compare shortest, gentlest-slope, and ridge-interest heuristic paths calculated from the local NASA/JPL Mars Trek and USGS Gale elevation grid."
  },
  {
    spot: "sources",
    title: "Limits and sources",
    body: "The preview is a small JPEG, not the original GeoTIFF. The separate DEM calculator shows its source, parameters, and calculated route alternatives. Regional geology remains context only, not a mineral map.",
    limits: true
  }
];

const state = {
  area: null,
  manifest: null,
  geology: null,
  mode: "start",
  start: null,
  destination: null,
  distance: "balanced",
  science: "medium"
};

const present = {
  open: false,
  paused: false,
  finished: false,
  step: 0,
  stepStart: 0,
  frozen: 0,
  timer: 0
};

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[ch]));
}

function formatPair(lon, lat) {
  const hemisphere = lat < 0 ? "S" : lat > 0 ? "N" : "";
  const latText = hemisphere ? `${Math.abs(lat).toFixed(5)}° ${hemisphere}` : `${lat.toFixed(5)}°`;
  return `${lon.toFixed(5)}° E, ${latText}`;
}

function separationMeters(a, b) {
  const radiusM = MARS_MEAN_RADIUS_KM * 1000;
  const toRad = (deg) => deg * Math.PI / 180;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function formatSeparation(meters) {
  if (meters < 15) return "The two points are in the same place.";
  const rounded = Math.round(meters / 10) * 10;
  if (rounded < 1000) return `About ${rounded.toLocaleString("en-US")} m`;
  return `About ${(rounded / 1000).toFixed(2)} km`;
}

function assetById(id) {
  return state.manifest?.assets?.find((asset) => asset.id === id) || null;
}

function demReady() {
  const dem = assetById("dem");
  return Boolean(dem && dem.status === "READY");
}

function showError(message) {
  const banner = $("load-error");
  const current = banner.hidden ? "" : banner.textContent;
  if (current.includes(message)) return;
  banner.hidden = false;
  banner.textContent = current ? `${current} ${message}` : message;
}

function crowSummary() {
  if (!state.start || !state.destination) return "Not calculated. This is not a route.";
  const meters = separationMeters(state.start, state.destination);
  if (meters < 15) return "The two points are in the same place. This is not a route.";
  return `${formatSeparation(meters)}. Direct distance only. This is not a route.`;
}

function pointFromEvent(event) {
  if (!state.area) return null;
  const rect = $("orbital").getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
  const bounds = state.area.bounds;
  const lon = bounds.west_longitude_east_deg
    + x * (bounds.east_longitude_east_deg - bounds.west_longitude_east_deg);
  const lat = bounds.north_latitude_deg
    - y * (bounds.north_latitude_deg - bounds.south_latitude_deg);
  return { lon, lat };
}

function percentFromPoint(point) {
  const bounds = state.area.bounds;
  const x = (point.lon - bounds.west_longitude_east_deg)
    / (bounds.east_longitude_east_deg - bounds.west_longitude_east_deg);
  const y = (bounds.north_latitude_deg - point.lat)
    / (bounds.north_latitude_deg - bounds.south_latitude_deg);
  return { x: x * 100, y: y * 100 };
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.setAttribute("aria-checked", String(button.dataset.mode === mode));
  });
  const help = {
    start: "The next tap on the map sets the start. A tap only marks a point.",
    destination: "The next tap on the map sets the destination. A tap only marks a point.",
    inspect: "A tap reads the coordinate and leaves the points where they are."
  };
  $("mode-help").textContent = help[mode];
}

function announce(message) {
  $("live").textContent = message;
}

function renderSite() {
  const area = state.area;
  const bounds = area.bounds;
  const size = area.approximate_size_km;
  $("site-meta").textContent = `${area.coordinate_system}. Recorded size about ${size.east_west.toFixed(1)} km east–west by ${size.north_south.toFixed(1)} km north–south. Recorded center ${formatPair(area.center.longitude_east_deg, area.center.latitude_deg)}.`;

  const corners = [
    ["Northwest", bounds.west_longitude_east_deg, bounds.north_latitude_deg],
    ["Northeast", bounds.east_longitude_east_deg, bounds.north_latitude_deg],
    ["Southwest", bounds.west_longitude_east_deg, bounds.south_latitude_deg],
    ["Southeast", bounds.east_longitude_east_deg, bounds.south_latitude_deg]
  ];
  $("corners").replaceChildren(...corners.map(([label, lon, lat]) => {
    const block = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = label;
    const value = document.createElement("strong");
    value.textContent = formatPair(lon, lat);
    value.title = `Stored longitude ${lon}, stored latitude ${lat}`;
    block.append(name, value);
    return block;
  }));

  $("area-note").textContent = area.note
    ? `Note from the area record: ${area.note}`
    : "";
}

function renderMarkers() {
  const layer = $("markers");
  layer.replaceChildren();
  [
    ["start", "Start", state.start],
    ["destination", "Destination", state.destination]
  ].forEach(([kind, label, point]) => {
    if (!point) return;
    const pin = document.createElement("div");
    const pos = percentFromPoint(point);
    pin.className = `pin pin-${kind}${pos.y < 12 ? " pin-below" : ""}`;
    pin.style.left = `${pos.x}%`;
    pin.style.top = `${pos.y}%`;
    pin.textContent = label;
    layer.append(pin);
  });

  $("start-readout").textContent = state.start ? formatPair(state.start.lon, state.start.lat) : "Not set";
  $("end-readout").textContent = state.destination ? formatPair(state.destination.lon, state.destination.lat) : "Not set";

  $("crow-readout").textContent = crowSummary();

  const note = $("no-road");
  if (state.start && state.destination) {
    note.hidden = false;
    note.textContent = "This selected image is a context map, so no route is drawn on it. Use the separate DEM route calculator for terrain paths; the direct distance above is only the gap between these two context-map clicks.";
  } else {
    note.hidden = true;
    note.textContent = "";
  }
}

function parameterRows() {
  const slope = $("slope").value;
  const rows = [
    ["Start", state.start ? `${formatPair(state.start.lon, state.start.lat)}. User click, placed with the area bounds.` : "Not set."],
    ["Destination", state.destination ? `${formatPair(state.destination.lon, state.destination.lat)}. User click, placed with the area bounds.` : "Not set."],
    ["Maximum slope", `${slope}°. This context map has no matching DEM. The selected limit is applied in the separate route calculator.`],
    ["Distance", `${DISTANCE_LABELS[state.distance]}. Planning baseline. Not applied.`],
    ["Science interest", `${SCIENCE_LABELS[state.science]}. Planning baseline. Not applied. No local stops are loaded.`]
  ];
  return rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
}

function separationBlock() {
  if (!state.start || !state.destination) {
    return `<p>Not calculated. Choose a start and a destination. Two points still do not produce a route.</p>`;
  }
  const meters = separationMeters(state.start, state.destination);
  return `
    <p><span class="tag derived">Derived</span> ${esc(formatSeparation(meters))}.</p>
    <p>As-the-crow-flies distance on a sphere of radius ${MARS_MEAN_RADIUS_KM.toLocaleString("en-US")} km, the IAU mean radius of Mars. That radius is a planetary constant, not a measurement from this site. This is the direct gap between the two clicks. It is not a route, and safety is not assessed.</p>
  `;
}

function renderBriefing() {
  const demIsReady = demReady();
  const bothPoints = state.start && state.destination;
  const status = "Context map only · DEM routes are calculated in the separate route window";
  const why = "This selected image is for visual context and point coordinates only. A separate local Gale DEM window powers the route calculator. Because the two windows cover different ground, calculated DEM paths are shown only on their matching terrain view, not over this context map.";

  $("status-line").textContent = status;
  $("briefing").innerHTML = `
    <div class="briefing">
      <h3>Why this is the result</h3>
      <p>${esc(why)}</p>
      <h3>Parameters used</h3>
      <dl class="param-list">${parameterRows()}</dl>
      <h3>As-the-crow-flies distance</h3>
      ${separationBlock()}
      <h3>Data used</h3>
      <ul>
        <li><span class="tag observed">Observed</span> The USGS color mosaic preview, for visual context and for placing clicks. Retrieval date, credit, and resolution are in the source panel.</li>
        <li><span class="tag derived">Derived</span> Pointer and marker coordinates, from the JPEG placement and the bounds in data/area.json. As-the-crow-flies distance, when both points exist. That distance is not a route.</li>
        <li><span class="tag derived">Calculated separately</span> Three terrain paths and their slope and elevation metrics are available in the DEM route calculator. They are not measured rover routes or safety assessments.</li>
      </ul>
      <h3>Route comparisons</h3>
      <ul>
        <li>Shortest path: emphasizes distance.</li>
        <li>Gentlest slope: penalizes steeper cells while respecting the slope cap.</li>
        <li>Ridge-interest heuristic: uses a topographic score, not measured science value.</li>
      </ul>
      <p>Open <a href="route-demo.html">the DEM route calculator</a> to see the computed paths, their parameters, and why each option differs. They are not drawn on this context map.</p>
    </div>
  `;

  $("slope-badge").textContent = demIsReady ? "No elevation grid" : "Not applied";
}

function fieldOrPending(value, emptyLabel) {
  const text = String(value ?? "").trim();
  return text ? esc(text) : esc(emptyLabel);
}

function externalLink(url, label) {
  if (/^https:\/\//.test(url)) {
    return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  }
  return esc(label || "No source link in the record");
}

function sourceCard(asset, options = {}) {
  const ready = asset.status === "READY";
  const tagClass = ready ? "observed" : "unavailable";
  const tagText = ready ? "Observed" : "Unavailable";
  const limits = [asset.notes, options.extra].filter(Boolean).join(" ");
  const use = String(asset.license_or_use || "").trim();
  return `
    <article class="source-card">
      <header>
        <h3>${esc(options.title || asset.source_name || "Untitled record")}</h3>
        <span class="tag ${tagClass}">${tagText}</span>
      </header>
      <dl>
        <div><dt>Source</dt><dd>${externalLink(asset.source_url, asset.source_name || asset.source_url || "No source link")}</dd></div>
        <div><dt>Credit</dt><dd>${fieldOrPending(asset.credit, "No credit in the record")}</dd></div>
        <div><dt>Retrieved</dt><dd>${fieldOrPending(asset.retrieved_on, "Not retrieved")}</dd></div>
        <div><dt>Resolution</dt><dd>${fieldOrPending(asset.resolution, "Not in the record")}</dd></div>
        ${use ? `<div><dt>Use</dt><dd>${esc(use)}</dd></div>` : ""}
        <div><dt>Limits</dt><dd>${fieldOrPending(limits, "Not in the record")}</dd></div>
      </dl>
    </article>
  `;
}

function renderGeologyHelp(geology) {
  const credit = geology?.credit || "Tanaka and others, 2014, USGS SIM 3292";
  const resolution = geology?.resolution || "1:20,000,000";
  $("geology-help").textContent = `Reserved. ${credit}. Map scale in the record: ${resolution}. When this layer is added, it is regional context only. It does not identify local mineral composition.`;
  const loaded = geology && geology.status === "READY" && state.geology;
  $("geology").disabled = !loaded;
  $("geology-badge").textContent = loaded ? "Optional" : "Not loaded";
  if (!loaded) {
    $("geology").checked = false;
    drawGeology(false);
  }
}

function unitLabel(properties) {
  const props = properties || {};
  const keys = ["UnitName", "UNIT_NAME", "Unit", "Name", "LABEL", "Label", "Code", "CODE", "SYMBOL", "Symbol"];
  const found = keys.map((key) => props[key]).find((value) => String(value || "").trim());
  return found ? `Regional map unit: ${found}` : "Regional map unit name is not in this feature.";
}

function ringsFromGeometry(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

function drawGeology(show) {
  const svg = $("geology-svg");
  const note = $("geology-map-note");
  svg.replaceChildren();
  if (!show || !state.geology || !state.area) {
    svg.hidden = true;
    note.hidden = true;
    return;
  }

  const bounds = state.area.bounds;
  const width = 1000;
  const height = 1000;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const project = (lon, lat) => {
    const x = (lon - bounds.west_longitude_east_deg)
      / (bounds.east_longitude_east_deg - bounds.west_longitude_east_deg) * width;
    const y = (bounds.north_latitude_deg - lat)
      / (bounds.north_latitude_deg - bounds.south_latitude_deg) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const features = state.geology.features || [];
  features.forEach((feature) => {
    ringsFromGeometry(feature.geometry).forEach((ring) => {
      if (!Array.isArray(ring)) return;
      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.setAttribute("points", ring.map(([lon, lat]) => project(lon, lat)).join(" "));
      polygon.setAttribute("fill", "rgba(224, 138, 69, 0.18)");
      polygon.setAttribute("stroke", "#8a3e12");
      polygon.setAttribute("stroke-width", "8");
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = unitLabel(feature.properties);
      polygon.append(title);
      svg.append(polygon);
    });
  });

  svg.hidden = false;
  note.hidden = false;
  note.textContent = features.length
    ? `Regional context only. ${features.length} map unit${features.length === 1 ? "" : "s"} drawn from the global geology file. This layer does not identify local mineral composition.`
    : "Regional context only. The geology file has no features to draw. It does not identify local mineral composition.";
}

function renderSources() {
  const orbital = assetById("orbital_map");
  const dem = assetById("dem");
  const geology = assetById("geology");
  const rest = ["stop_1", "stop_2", "rems_sample"]
    .map(assetById)
    .filter(Boolean);

  const primary = [
    orbital && sourceCard(orbital, {
      extra: "The browser does not load raw/orbital_clip.tif. Pixel brightness and texture are not used as elevation, slope, or hazard. Frame acquisition dates are not in this local record. The citation year is 2016; the retrieval date is the date above."
    }),
    dem && sourceCard(dem, {
      title: dem.source_name,
      extra: "This DEM covers the separate route window in data/route-area.json. The selected context map is elsewhere; calculated route lines are kept on the matching DEM view."
    }),
    geology && sourceCard(geology, {
      extra: "Regional context only. This global map does not identify local mineral composition inside the 2 km site."
    })
  ].filter(Boolean).join("");

  const extra = rest.map((asset) => sourceCard(asset, {
    title: asset.source_name || "Measured route"
  })).join("");

  $("source-list").innerHTML = `
    ${primary}
    <details>
      <summary>Optional additions not loaded: rover photos and weather sample</summary>
      ${extra}
    </details>
  `;
  renderGeologyHelp(geology);
}

async function loadGeology(asset) {
  if (!asset || asset.status !== "READY" || !asset.path) return null;
  try {
    const response = await fetch(asset.path);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

function onMapClick(event) {
  const point = pointFromEvent(event);
  if (!point || state.mode === "inspect") {
    if (point) {
      $("pointer-readout").textContent = formatPair(point.lon, point.lat);
    }
    return;
  }
  if (state.mode === "start") {
    state.start = point;
    if (!state.destination) setMode("destination");
    else setMode("inspect");
  } else if (state.mode === "destination") {
    state.destination = point;
    setMode("inspect");
  }
  renderMarkers();
  renderBriefing();
  const startText = state.start ? formatPair(state.start.lon, state.start.lat) : "not set";
  const endText = state.destination ? formatPair(state.destination.lon, state.destination.lat) : "not set";
  announce(`Start ${startText}. Destination ${endText}. These points are on the context map; open the separate DEM route calculator to calculate terrain paths.`);
}

function onMapMove(event) {
  const point = pointFromEvent(event);
  if (!point) return;
  $("pointer-readout").textContent = formatPair(point.lon, point.lat);
}

function clearPoints() {
  state.start = null;
  state.destination = null;
  setMode("start");
  renderMarkers();
  renderBriefing();
  announce("Context map points cleared. Calculated DEM routes are in the separate route calculator.");
}

function formatClock(ms) {
  const seconds = Math.max(0, Math.min(90, Math.floor(ms / 1000)));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function stepElapsed() {
  if (present.paused) return present.frozen;
  return performance.now() - present.stepStart;
}

function totalElapsed() {
  return present.step * STEP_MS + stepElapsed();
}

function setSpotlight(spot, scroll) {
  document.querySelectorAll("[data-spot]").forEach((node) => {
    node.classList.toggle("is-on", Boolean(spot) && node.dataset.spot === spot);
  });
  const target = spot ? document.querySelector(`[data-spot="${spot}"]`) : null;
  if (scroll && target) target.scrollIntoView({ block: "center", inline: "nearest" });
}

function limitList() {
  const orbital = assetById("orbital_map");
  const dem = assetById("dem");
  const geology = assetById("geology");
  const items = [
    "The map is a resized JPEG preview. The original GeoTIFF stays out of the browser.",
    "Coordinates are not stored in the JPEG. They come from the selected bounds.",
    "No DEM clip for this box is loaded. Slope, hazard, and route cost stay off. Brightness is not turned into elevation.",
    "Geology is not loaded. The reserved Tanaka map is global context only, at the scale in the source record, and it does not identify local minerals.",
    "Curiosity photos, a REMS weather sample, and a measured route are not loaded.",
    "This page does not call the Mars Rover Photos API.",
    "The as-the-crow-flies figure is the direct distance between two clicks. It is not a calculated route. A path is not drawn."
  ];
  const links = [orbital, dem, geology].filter(Boolean).map((asset) => {
    const label = asset.source_name || asset.id;
    return `<li>${externalLink(asset.source_url, label)}. ${fieldOrPending(asset.credit, "No credit in the record")}</li>`;
  }).join("");
  return `<ul class="limit-list">${items.map((item) => `<li>${esc(item)}</li>`).join("")}${links}</ul>`;
}

function renderClock() {
  const elapsed = totalElapsed();
  $("present-kicker").textContent = present.finished ? "Demo complete" : "90-second demo";
  $("present-fill").style.width = `${Math.min(100, (elapsed / DEMO_MS) * 100)}%`;
  $("present-time").textContent = `Step ${present.step + 1} of ${DEMO_STEPS.length} · ${formatClock(elapsed)} / 1:30`;
  $("present-pause").textContent = present.finished ? "Replay" : present.paused ? "Play" : "Pause";
}

function renderPresent(scroll) {
  const step = DEMO_STEPS[present.step];
  $("present-title").textContent = step.title;
  $("present-body").textContent = step.body;
  $("present-extra").innerHTML = step.limits ? limitList() : "";
  renderClock();
  setSpotlight(step.spot, scroll);
}

function goToStep(index, options = {}) {
  present.step = Math.min(DEMO_STEPS.length - 1, Math.max(0, index));
  present.finished = false;
  present.frozen = 0;
  present.stepStart = performance.now();
  if (options.pause) present.paused = true;
  renderPresent(true);
}

function tickPresent() {
  if (!present.open || present.paused) return;
  if (stepElapsed() >= STEP_MS) {
    if (present.step < DEMO_STEPS.length - 1) goToStep(present.step + 1);
    else {
      present.paused = true;
      present.finished = true;
      present.frozen = STEP_MS;
    }
  }
  renderClock();
}

function openPresent() {
  present.open = true;
  present.paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  present.finished = false;
  present.step = 0;
  present.frozen = 0;
  present.stepStart = performance.now();
  $("present").hidden = false;
  document.body.classList.add("is-presenting");
  $("present-open").setAttribute("aria-pressed", "true");
  window.clearInterval(present.timer);
  present.timer = window.setInterval(tickPresent, 200);
  renderPresent(true);
  $("present-pause").focus();
}

function closePresent() {
  present.open = false;
  window.clearInterval(present.timer);
  $("present").hidden = true;
  document.body.classList.remove("is-presenting");
  setSpotlight(null);
  $("present-open").setAttribute("aria-pressed", "false");
  $("present-open").focus();
}

function bindPresent() {
  $("present-open").addEventListener("click", () => {
    if (present.open) closePresent();
    else openPresent();
  });
  $("present-close").addEventListener("click", closePresent);
  $("present-back").addEventListener("click", () => goToStep(present.step - 1));
  $("present-next").addEventListener("click", () => {
    if (present.step >= DEMO_STEPS.length - 1) {
      present.paused = true;
      present.finished = true;
      present.frozen = STEP_MS;
      renderClock();
      return;
    }
    goToStep(present.step + 1);
  });
  $("present-pause").addEventListener("click", () => {
    if (present.finished) {
      present.paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      goToStep(0);
      return;
    }
    if (present.paused) {
      present.paused = false;
      present.stepStart = performance.now() - present.frozen;
    } else {
      present.frozen = stepElapsed();
      present.paused = true;
    }
    renderClock();
  });
}

function bindControls() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
  $("clear").addEventListener("click", clearPoints);
  $("slope").addEventListener("input", () => {
    $("slope-value").textContent = `${$("slope").value}°`;
    renderBriefing();
  });
  document.querySelectorAll("[data-distance]").forEach((button) => {
    button.addEventListener("click", () => {
      state.distance = button.dataset.distance;
      document.querySelectorAll("[data-distance]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      renderBriefing();
    });
  });
  document.querySelectorAll("[data-science]").forEach((button) => {
    button.addEventListener("click", () => {
      state.science = button.dataset.science;
      document.querySelectorAll("[data-science]").forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
      renderBriefing();
    });
  });
  $("geology").addEventListener("change", () => drawGeology($("geology").checked));

  const viewport = $("viewport");
  viewport.addEventListener("click", onMapClick);
  viewport.addEventListener("pointermove", onMapMove);
  const image = $("orbital");
  const reportImageFailure = () => {
    $("image-error").hidden = false;
    showError("The orbital preview did not load from assets/maps/orbital.jpg. Keep that file in place and open the page through the local server.");
  };
  image.addEventListener("error", reportImageFailure);
  image.addEventListener("load", () => {
    if (image.naturalWidth > 0) $("image-error").hidden = true;
  });
  if (image.complete && image.naturalWidth === 0) reportImageFailure();
}

async function loadJson(path) {
  let response;
  try {
    response = await fetch(path);
  } catch (error) {
    throw new Error(`${path} did not load. In this folder, run python -m http.server 8000 and open http://localhost:8000.`);
  }
  if (!response.ok) {
    throw new Error(`${path} did not load (HTTP ${response.status}).`);
  }
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${path} is not valid JSON.`);
  }
}

async function init() {
  bindControls();
  bindPresent();
  renderBriefing();
  const errors = [];
  try {
    state.area = await loadJson("data/area.json");
  } catch (error) {
    errors.push(error.message);
  }
  try {
    state.manifest = await loadJson("data/manifest.json");
  } catch (error) {
    errors.push(error.message);
  }
  if (errors.length || !state.area?.bounds || !state.area?.center || !state.area?.approximate_size_km || !Array.isArray(state.manifest?.assets)) {
    if (!errors.length) errors.push("The area or source record is missing the fields this page needs.");
    errors.forEach(showError);
    $("site-meta").textContent = "The site record did not load, so the picture cannot be placed on Mars coordinates.";
    announce("Site records did not load.");
    return;
  }

  const orbital = assetById("orbital_map");
  if (orbital?.path && $("orbital").getAttribute("src") !== orbital.path) {
    $("orbital").src = orbital.path;
  }
  state.geology = await loadGeology(assetById("geology"));
  renderSite();
  renderSources();
  renderBriefing();
  announce("Context map loaded. Open the separate route calculator to compare calculated DEM paths.");
}

init();
