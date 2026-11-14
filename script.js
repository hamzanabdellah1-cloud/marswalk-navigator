/*
  MarsWalk Navigator
  Points and lines are cells of the shared elevation grid.
  x increases east. y increases south. The map image uses the same frame.
*/

const GUIDE = [
  "Click a start and a destination.",
  "The app finds several routes from elevation data.",
  "Change the sliders and watch the trade-offs move.",
  "Open a science stop.",
  "Here is what the data supports, what it does not, and why."
];

const NEAR_CELLS = 8;

const state = {
  layer: "orbital",
  points: { start: null, dest: null, stops: [] },
  routes: [],
  custom: null,
  customSame: "",
  selected: "short",
  cursor: null,
  guide: -1,
  lastFocus: null,
  timer: 0,
  drag: null
};

function init() {
  bindEvents();
  renderStops();
  renderConfidence();
  renderUnknown();
  renderSources();
  if (!window.MARSWALK_DATA) {
    document.getElementById("map-caption").textContent = "Data files did not load.";
    return;
  }
  setLayer("orbital");
  if (!grid()) {
    disableFinder();
    return;
  }
  const frame = document.getElementById("map-panel");
  state.cursor = { x: Math.floor(grid().width / 2), y: Math.floor(grid().height / 2) };
  placeCursor();
  frame.addEventListener("focus", function () {
    document.getElementById("map-cursor").hidden = false;
    placeCursor();
  });
  frame.addEventListener("blur", function () {
    document.getElementById("map-cursor").hidden = true;
  });
  renderExamples();
  updateHint();
}

function grid() {
  return window.MARSWALK_GRID || null;
}

function pathApi() {
  return window.MARSWALK_PATH;
}

function disableFinder() {
  document.getElementById("map-hint").textContent = "Elevation grid not loaded.";
  document.getElementById("click-note").textContent = "Add data/grid.js from tools/build_grid.py. The page will not invent terrain.";
  ["weight-slope", "weight-science", "slope-limit", "reset-points", "coord-place", "coord-x", "coord-y"].forEach(function (id) {
    const node = document.getElementById(id);
    if (node) node.disabled = true;
  });
  document.getElementById("map-panel").setAttribute("aria-disabled", "true");
}

function bindEvents() {
  document.querySelectorAll(".tabs button").forEach(function (button) {
    button.addEventListener("click", function () {
      setLayer(button.dataset.layer);
    });
  });
  const frame = document.getElementById("map-panel");
  frame.addEventListener("click", onMapClick);
  frame.addEventListener("keydown", onMapKey);
  document.getElementById("reset-points").addEventListener("click", resetPoints);
  document.getElementById("coord-form").addEventListener("submit", onCoordSubmit);
  ["weight-slope", "weight-science"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", function () {
      schedule("custom");
    });
  });
  document.getElementById("slope-limit").addEventListener("input", function () {
    document.getElementById("limit-value").textContent = slopeLimit() + "°";
    schedule("all");
  });
  document.getElementById("guide-open").addEventListener("click", openGuide);
  document.getElementById("guide-close").addEventListener("click", closeGuide);
  document.getElementById("guide-back").addEventListener("click", function () {
    showGuideStep(state.guide - 1);
  });
  document.getElementById("guide-next").addEventListener("click", function () {
    showGuideStep(state.guide + 1);
  });
  document.getElementById("print-brief").addEventListener("click", function () {
    window.print();
  });
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-backdrop").addEventListener("click", closeModal);
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!document.getElementById("modal").hidden) closeModal();
    else if (state.guide >= 0) closeGuide();
  });
}

function setLayer(id) {
  state.layer = id;
  const view = (window.MARSWALK_DATA.views || []).find(function (item) { return item.id === id; });
  if (!view) return;
  document.querySelectorAll(".tabs button").forEach(function (button) {
    const selected = button.dataset.layer === id;
    button.setAttribute("aria-selected", selected ? "true" : "false");
    button.tabIndex = selected ? 0 : -1;
  });
  const activeTab = document.querySelector('.tabs button[data-layer="' + id + '"]');
  document.getElementById("map-panel").setAttribute("aria-labelledby", activeTab.id);
  document.getElementById("map-caption").textContent = view.caption;
  const photo = document.getElementById("map-photo");
  const missing = document.getElementById("map-missing");
  if (!view.file) {
    photo.hidden = true;
    photo.removeAttribute("src");
    missing.hidden = false;
    return;
  }
  missing.hidden = true;
  photo.hidden = false;
  photo.alt = view.alt;
  if (photo.getAttribute("src") !== view.file) {
    photo.classList.add("is-out");
    photo.onload = function () {
      if (state.layer === id) photo.classList.remove("is-out");
    };
    photo.onerror = function () {
      if (state.layer !== id) return;
      photo.hidden = true;
      missing.hidden = false;
      document.getElementById("map-caption").textContent = "Layer not available yet.";
    };
    photo.src = view.file;
  } else {
    photo.classList.remove("is-out");
  }
}

function onMapClick(event) {
  if (!grid() || event.target.closest(".marker, .example-marker")) return;
  placeNext(cellFromClient(event.clientX, event.clientY));
}

function onMapKey(event) {
  if (!grid() || !state.cursor) return;
  const key = event.key;
  if (key !== "ArrowUp" && key !== "ArrowDown" && key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Enter") return;
  event.preventDefault();
  if (key === "ArrowLeft") state.cursor.x -= 1;
  if (key === "ArrowRight") state.cursor.x += 1;
  if (key === "ArrowUp") state.cursor.y -= 1;
  if (key === "ArrowDown") state.cursor.y += 1;
  state.cursor.x = clamp(state.cursor.x, 0, grid().width - 1);
  state.cursor.y = clamp(state.cursor.y, 0, grid().height - 1);
  placeCursor();
  if (key === "Enter") placeNext(state.cursor);
}

function onCoordSubmit(event) {
  event.preventDefault();
  if (!grid()) return;
  const x = Number(document.getElementById("coord-x").value);
  const y = Number(document.getElementById("coord-y").value);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  placeNext(percentToCell(clamp(x, 0, 100), clamp(y, 0, 100)));
}

function placeNext(cell) {
  if (!cell) return;
  if (isNodata(cell)) {
    document.getElementById("click-note").textContent = "No elevation in that cell.";
    return;
  }
  document.getElementById("click-note").textContent = "";
  const points = state.points;
  if (!points.start) points.start = copyCell(cell);
  else if (!points.dest) points.dest = copyCell(cell);
  else if (points.stops.length < 2) points.stops.push(copyCell(cell));
  else {
    document.getElementById("click-note").textContent = "All points are set. Drag a marker, or reset the points.";
    return;
  }
  const percent = percentFromCell(cell);
  document.getElementById("coord-x").value = String(Math.round(percent.x * 10) / 10);
  document.getElementById("coord-y").value = String(Math.round(percent.y * 10) / 10);
  updateHint();
  renderMarkers();
  schedule("all");
}

function resetPoints() {
  state.points = { start: null, dest: null, stops: [] };
  state.routes = [];
  state.custom = null;
  state.customSame = "";
  document.getElementById("click-note").textContent = "";
  document.getElementById("custom-note").textContent = "";
  updateHint();
  renderMarkers();
  drawLines();
  renderCards();
}

function assignPoint(id, cell) {
  if (id === "start") state.points.start = copyCell(cell);
  else if (id === "dest") state.points.dest = copyCell(cell);
  else state.points.stops[id] = copyCell(cell);
}

function orderedPoints() {
  const points = state.points;
  if (!points.start || !points.dest) return null;
  return [points.start].concat(points.stops, [points.dest]);
}

function schedule(kind) {
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(function () {
    computeRoutes(kind);
  }, 150);
}

function slopeLimit() {
  return Number(document.getElementById("slope-limit").value);
}

function sliderWeights() {
  return {
    wSlope: Number(document.getElementById("weight-slope").value) / 10,
    wScience: Number(document.getElementById("weight-science").value) / 10,
    slopeLimit: slopeLimit()
  };
}

function computeRoutes(kind) {
  const points = orderedPoints();
  const cards = document.getElementById("route-cards");
  if (!points || !pathApi()) {
    state.routes = [];
    state.custom = null;
    drawLines();
    renderCards();
    return;
  }
  const limit = slopeLimit();
  if (kind !== "custom") {
    const shown = [];
    pathApi().PRESETS.forEach(function (preset) {
      const result = pathApi().routeThrough(grid(), points, {
        wSlope: preset.wSlope,
        wScience: preset.wScience,
        slopeLimit: limit
      });
      const earlier = result && shown.find(function (item) {
        return item.result && pathApi().samePath(item.result, result);
      });
      if (earlier) {
        earlier.also.push(preset.name);
        return;
      }
      shown.push({ preset: preset, result: result, also: [] });
    });
    state.routes = shown;
    if (!state.routes.some(function (item) { return item.preset.id === state.selected && item.result; })) {
      const first = state.routes.find(function (item) { return item.result; });
      state.selected = first ? first.preset.id : "short";
    }
  }
  const custom = pathApi().routeThrough(grid(), points, sliderWeights());
  state.custom = custom;
  state.customSame = "";
  if (custom) {
    const match = state.routes.find(function (item) {
      return item.result && pathApi().samePath(item.result, custom);
    });
    if (match) state.customSame = match.preset.name;
  }
  drawLines();
  renderCards();
  cards.setAttribute("aria-busy", "false");
}

function updateHint() {
  const hint = document.getElementById("map-hint");
  const points = state.points;
  if (!points.start) hint.textContent = "Click the map to set the start.";
  else if (!points.dest) hint.textContent = "Click the map to set the destination.";
  else if (points.stops.length < 2) hint.textContent = "Click to add a science stop the line must pass, in order. Up to two.";
  else hint.textContent = "Drag a marker to move it, or reset the points.";
}

function renderCards() {
  const box = document.getElementById("route-cards");
  clearNode(box);
  if (!orderedPoints()) return;
  const withPath = state.routes.filter(function (item) { return item.result; });
  const lowest = withPath.reduce(function (best, item) {
    if (!best || item.result.max_slope_deg < best) return item.result.max_slope_deg;
    return best;
  }, null);
  const lowestCount = withPath.filter(function (item) {
    return item.result.max_slope_deg === lowest;
  }).length;
  state.routes.forEach(function (item) {
    box.appendChild(routeCard(item, lowest, lowestCount));
  });
  renderCustomNote();
}

function routeCard(item, lowest, lowestCount) {
  const button = document.createElement("div");
  button.className = "route-card" + (item.preset.id === state.selected ? " is-selected" : "");
  const choose = document.createElement("button");
  choose.type = "button";
  choose.className = "choose-route";
  choose.setAttribute("aria-pressed", item.preset.id === state.selected ? "true" : "false");
  choose.textContent = item.preset.id === state.selected ? "Shown on the map" : "Show this line";
  choose.addEventListener("click", function () {
    state.selected = item.preset.id;
    document.getElementById("weight-slope").value = String(item.preset.wSlope * 10);
    document.getElementById("weight-science").value = String(item.preset.wScience * 10);
    computeRoutes("custom");
  });
  button.appendChild(choose);

  const name = document.createElement("span");
  name.className = "route-name";
  const swatch = document.createElement("span");
  swatch.className = "swatch";
  swatch.style.background = item.preset.color;
  const title = document.createElement("span");
  title.textContent = item.preset.name;
  name.appendChild(swatch);
  name.appendChild(title);
  button.appendChild(name);

  const rank = document.createElement("p");
  rank.className = "rank-note";
  const phrases = [];
  if (item.preset.id === state.selected && item.result) phrases.push("Suggested for review");
  if (item.result && lowestCount === 1 && item.result.max_slope_deg === lowest) phrases.push("Lowest slope");
  rank.textContent = phrases.join(". ");
  button.appendChild(rank);

  if (!item.result) {
    const empty = document.createElement("p");
    empty.className = "is-empty";
    empty.textContent = "No route found under these settings. Raise your slope limit and try again.";
    button.appendChild(empty);
    return button;
  }

  if (item.also.length) {
    const same = document.createElement("p");
    same.className = "source-line";
    same.textContent = item.also.join(" and ") + ": same as " + item.preset.name + ".";
    button.appendChild(same);
  }

  addStat(button, "Distance", formatMeters(item.result.distance_m));
  addStat(button, "Ascent", formatMeters(item.result.ascent_m));
  addStat(button, "Max slope", formatDegrees(item.result.max_slope_deg));
  addStat(button, "Above your limit", item.result.pct_above_limit + "% of path");
  addStat(button, "Mean science interest", item.result.mean_interest + " (terrain heuristic)");
  const source = document.createElement("p");
  source.className = "source-line";
  source.textContent = sourceText();
  button.appendChild(source);
  button.appendChild(profileBox(item.result, item.preset.color));
  const band = document.createElement("p");
  band.className = "source-line";
  band.textContent = "Uncertainty band: " + item.result.uncertainty_m + " m, the source DEM pixel size.";
  button.appendChild(band);

  const other = state.routes.find(function (candidate) {
    return candidate.result && candidate.preset.id !== item.preset.id;
  });
  if (other) {
    const trade = document.createElement("p");
    trade.className = "source-line";
    trade.textContent = tradeoff(item, other);
    button.appendChild(trade);
  }

  nearbyExamples(item.result.cells).forEach(function (example) {
    const open = document.createElement("button");
    open.type = "button";
    open.className = "open-stop";
    open.textContent = "Open stop";
    open.addEventListener("click", function () {
      openStop(example.stop, open);
    });
    const note = document.createElement("p");
    note.className = "source-line";
    note.textContent = "This line passes near an example photo. That photo is not a claim about this cell.";
    button.appendChild(note);
    button.appendChild(open);
  });
  return button;
}

function renderCustomNote() {
  const note = document.getElementById("custom-note");
  if (!orderedPoints()) {
    note.textContent = "";
    return;
  }
  if (!state.custom) {
    note.textContent = "Custom route: no route found under these settings. Raise your slope limit and try again.";
    return;
  }
  if (state.customSame) {
    note.textContent = "Custom route: same as " + state.customSame + ".";
    return;
  }
  note.textContent = "Custom route: " + formatMeters(state.custom.distance_m) + ", max slope " + formatDegrees(state.custom.max_slope_deg) + ". " + sourceText();
}

function tradeoff(item, other) {
  const distanceGap = Math.round(other.result.distance_m - item.result.distance_m);
  const ascentGap = Math.round(item.result.ascent_m - other.result.ascent_m);
  let lengthText = "Same length as " + other.preset.name;
  if (distanceGap > 0) lengthText = "Shorter by " + distanceGap + " m than " + other.preset.name;
  else if (distanceGap < 0) lengthText = "Longer by " + (-distanceGap) + " m than " + other.preset.name;
  let climbText = "climbs the same amount";
  if (ascentGap > 0) climbText = "climbs " + ascentGap + " m more";
  else if (ascentGap < 0) climbText = "climbs " + (-ascentGap) + " m less";
  const contrast = (distanceGap > 0 && ascentGap > 0) || (distanceGap < 0 && ascentGap < 0);
  return lengthText + (contrast ? ", but " : ", and ") + climbText + ".";
}

function addStat(parent, label, value) {
  const row = document.createElement("span");
  row.className = "stat";
  const name = document.createElement("span");
  name.textContent = label;
  const number = document.createElement("b");
  number.textContent = value;
  row.appendChild(name);
  row.appendChild(number);
  parent.appendChild(row);
}

function profileBox(result, color) {
  const box = document.createElement("div");
  box.className = "profile-box";
  const profile = result.profile || [];
  if (profile.length < 2) {
    box.textContent = "Profile needs two cells.";
    return box;
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 40");
  svg.setAttribute("aria-hidden", "true");
  const distances = profile.map(function (point) { return point.d; });
  const elevations = profile.map(function (point) { return point.elev; });
  const minD = 0;
  const maxD = Math.max.apply(null, distances.concat([1]));
  const err = Number(result.uncertainty_m) || 0;
  const minE = Math.min.apply(null, elevations) - err;
  const maxE = Math.max.apply(null, elevations) + err;
  function xy(distance, elev) {
    const x = ((distance - minD) / (maxD - minD)) * 100;
    const span = maxE - minE || 1;
    const y = (1 - (elev - minE) / span) * 40;
    return x.toFixed(2) + "," + y.toFixed(2);
  }
  const upper = profile.map(function (point) { return xy(point.d, point.elev + err); });
  const lower = profile.slice().reverse().map(function (point) { return xy(point.d, point.elev - err); });
  const band = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  band.setAttribute("points", upper.concat(lower).join(" "));
  band.setAttribute("class", "band");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", profile.map(function (point) { return xy(point.d, point.elev); }).join(" "));
  line.setAttribute("class", "profile-line");
  line.style.stroke = color;
  svg.appendChild(band);
  svg.appendChild(line);
  box.appendChild(svg);
  return box;
}

function drawLines() {
  const svg = document.getElementById("routes");
  const model = grid();
  clearNode(svg);
  if (!model) return;
  svg.setAttribute("viewBox", "0 0 " + model.width + " " + model.height);
  state.routes.forEach(function (item) {
    if (!item.result) return;
    drawPolyline(svg, item.result.cells, "route-line route-" + item.preset.id + (item.preset.id === state.selected ? " is-on" : ""), item.preset.color);
  });
  if (state.custom && !state.customSame) {
    drawPolyline(svg, state.custom.cells, "route-line route-custom" + (state.selected === "custom" ? " is-on" : ""), "#6b3fa0");
  }
}

function drawPolyline(svg, cells, className, color) {
  const halo = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  const points = cells.map(function (cell) { return (cell.x + 0.5) + "," + (cell.y + 0.5); }).join(" ");
  halo.setAttribute("points", points);
  halo.setAttribute("class", "route route-halo");
  line.setAttribute("points", points);
  line.setAttribute("class", "route " + className);
  line.style.stroke = color;
  svg.appendChild(halo);
  svg.appendChild(line);
}

function renderMarkers() {
  const layer = document.getElementById("markers");
  clearNode(layer);
  renderExamples();
  const points = state.points;
  if (points.start) layer.appendChild(marker("S", "Start", points.start, "start"));
  points.stops.forEach(function (cell, index) {
    layer.appendChild(marker(String(index + 1), "Science stop " + (index + 1), cell, index));
  });
  if (points.dest) layer.appendChild(marker("D", "Destination", points.dest, "dest"));
}

function renderExamples() {
  const layer = document.getElementById("markers");
  if (!layer || !window.MARSWALK_DATA) return;
  (window.MARSWALK_DATA.examples || []).forEach(function (example) {
    const stop = (window.MARSWALK_DATA.stops || [])[example.stop];
    if (!stop) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "marker example-marker";
    button.textContent = "Ex";
    const percent = { x: example.x, y: example.y };
    button.style.left = percent.x + "%";
    button.style.top = percent.y + "%";
    button.setAttribute("aria-label", "Example photo: " + stop.title + ". Not a Curiosity observation site.");
    const tip = document.createElement("span");
    tip.className = "tip" + (percent.y < 18 ? " below" : "");
    tip.textContent = "Example photo. Not this cell's observation.";
    button.appendChild(tip);
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      openStop(example.stop, button);
    });
    layer.appendChild(button);
  });
}

function marker(label, name, cell, id) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "marker" + (typeof id === "number" ? " is-stop" : "");
  button.textContent = label;
  const percent = percentFromCell(cell);
  button.style.left = percent.x + "%";
  button.style.top = percent.y + "%";
  button.setAttribute("aria-label", name + ". Drag to move.");
  const tip = document.createElement("span");
  tip.className = "tip" + (percent.y < 18 ? " below" : "");
  tip.textContent = name;
  button.appendChild(tip);
  button.addEventListener("pointerdown", function (event) {
    startDrag(event, id, button);
  });
  button.addEventListener("click", function (event) {
    event.stopPropagation();
  });
  return button;
}

function startDrag(event, id, markerNode) {
  if (!grid()) return;
  event.preventDefault();
  event.stopPropagation();
  markerNode.setPointerCapture(event.pointerId);
  state.drag = id;
  function move(ev) {
    const cell = cellFromClient(ev.clientX, ev.clientY);
    if (!cell || isNodata(cell)) {
      document.getElementById("click-note").textContent = cell && isNodata(cell) ? "No elevation in that cell." : "";
      return;
    }
    document.getElementById("click-note").textContent = "";
    assignPoint(id, cell);
    const percent = percentFromCell(cell);
    markerNode.style.left = percent.x + "%";
    markerNode.style.top = percent.y + "%";
    schedule("all");
  }
  function up(ev) {
    markerNode.removeEventListener("pointermove", move);
    markerNode.removeEventListener("pointerup", up);
    state.drag = null;
    move(ev);
    computeRoutes("all");
  }
  markerNode.addEventListener("pointermove", move);
  markerNode.addEventListener("pointerup", up);
}

function placeCursor() {
  const cursor = document.getElementById("map-cursor");
  if (!state.cursor || !grid()) return;
  const percent = percentFromCell(state.cursor);
  cursor.style.left = percent.x + "%";
  cursor.style.top = percent.y + "%";
}

function nearbyExamples(cells) {
  const examples = (window.MARSWALK_DATA && window.MARSWALK_DATA.examples) || [];
  return examples.filter(function (example) {
    const cell = percentToCell(example.x, example.y);
    return cells.some(function (point) {
      return Math.max(Math.abs(point.x - cell.x), Math.abs(point.y - cell.y)) <= NEAR_CELLS;
    });
  });
}

function cellFromClient(clientX, clientY) {
  const rect = document.getElementById("map-panel").getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  if (x < 0 || y < 0 || x > 100 || y > 100) return null;
  return percentToCell(x, y);
}

function percentToCell(xPercent, yPercent) {
  const model = grid();
  return {
    x: clamp(Math.floor((xPercent / 100) * model.width), 0, model.width - 1),
    y: clamp(Math.floor((yPercent / 100) * model.height), 0, model.height - 1)
  };
}

function percentFromCell(cell) {
  const model = grid();
  return {
    x: ((cell.x + 0.5) / model.width) * 100,
    y: ((cell.y + 0.5) / model.height) * 100
  };
}

function isNodata(cell) {
  const model = grid();
  return Boolean(model.nodata[cell.y * model.width + cell.x]);
}

function copyCell(cell) {
  return { x: cell.x, y: cell.y };
}

function sourceText() {
  const model = grid();
  return "Computed from USGS MSL Gale DEM, grid resolution " + model.cell_size_m + " m.";
}

function formatMeters(value) {
  return value + " m";
}

function formatDegrees(value) {
  return value + "°";
}

function renderStops() {
  const list = document.getElementById("stop-cards");
  clearNode(list);
  (window.MARSWALK_DATA.stops || []).slice(0, 2).forEach(function (stop, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stop-btn";
    const photo = document.createElement("img");
    photo.alt = stop.photo || stop.title || "Science stop photo";
    photo.src = stop.file || "";
    photo.addEventListener("error", function () {
      photo.removeAttribute("src");
      photo.alt = "Photo not available yet";
    });
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = stop.title || "Science stop";
    const look = document.createElement("span");
    look.className = "look-line";
    look.textContent = "Look for: " + (stop.look || "Not stated.");
    copy.appendChild(title);
    copy.appendChild(look);
    button.appendChild(photo);
    button.appendChild(copy);
    button.addEventListener("click", function () {
      openStop(index, button);
    });
    list.appendChild(button);
  });
}

function renderConfidence() {
  const list = document.getElementById("confidence");
  clearNode(list);
  const rows = (window.MARSWALK_DATA.layers || []).slice();
  const model = grid();
  if (model) {
    rows.push({
      name: "Elevation grid",
      badge: model.coarse_fill ? "Coarse fill" : "Uncertain",
      tone: model.coarse_fill ? "red" : "yellow",
      reason: model.coarse_fill
        ? "This area falls on the coarse fill."
        : "Grid cell " + model.cell_size_m + " m, from the 1 m Gale DEM."
    });
  } else {
    rows.push({
      name: "Elevation grid",
      badge: "Missing",
      tone: "red",
      reason: "Elevation grid not loaded."
    });
  }
  rows.push({
    name: "Science-interest score",
    badge: "Heuristic",
    tone: "yellow",
    reason: "Derived heuristic, not a measurement."
  });
  rows.push({
    name: "Pathfinding",
    badge: "Model",
    tone: "yellow",
    reason: "Least-cost on a gridded DEM. It ignores rocks, sand, and traction."
  });
  rows.forEach(function (row) {
    const item = document.createElement("li");
    const badge = document.createElement("span");
    badge.className = "badge badge-" + (row.tone || "yellow");
    badge.textContent = row.badge || "Uncertain";
    const copy = document.createElement("span");
    copy.className = "trust-copy";
    const name = document.createElement("strong");
    name.textContent = row.name;
    const reason = document.createElement("span");
    reason.className = "reason";
    reason.textContent = row.reason || "";
    copy.appendChild(name);
    copy.appendChild(reason);
    item.appendChild(badge);
    item.appendChild(copy);
    list.appendChild(item);
  });
}

function renderUnknown() {
  const list = document.getElementById("unknown");
  clearNode(list);
  (window.MARSWALK_DATA.unknown || []).forEach(function (line) {
    const item = document.createElement("li");
    item.textContent = line;
    list.appendChild(item);
  });
}

function renderSources() {
  const root = document.getElementById("sources");
  clearNode(root);
  addSourceHeading(root, "Map datasets");
  (window.MARSWALK_DATA.layers || []).forEach(function (layer) {
    addSourceText(root, layer.title);
    addSourceText(root, layer.credit);
    addSourceText(root, layer.note);
    addSourceLink(root, layer.page, layer.title);
  });
  addSourceHeading(root, "Stop photos");
  (window.MARSWALK_DATA.stops || []).forEach(function (stop) {
    addSourceText(root, (stop.photo || stop.title) + (stop.pia ? " (" + stop.pia + ")" : ""));
    addSourceText(root, stop.credit);
    addSourceText(root, stop.dateNote || stop.date);
    addSourceLink(root, stop.page, "JPL image page");
  });
  addSourceHeading(root, "Other references");
  (window.MARSWALK_DATA.references || []).forEach(function (item) {
    addSourceText(root, item.title);
    addSourceText(root, item.credit);
    addSourceText(root, item.note);
    addSourceLink(root, item.page, item.title);
  });
  if (grid()) {
    addSourceHeading(root, "Route grid");
    addSourceText(root, grid().source);
    addSourceText(root, sourceText() + " ridge_score is a terrain heuristic, not a measurement.");
  }
  (window.MARSWALK_DATA.instruments || []).forEach(function (tool) {
    addSourceText(root, tool.name + ". " + tool.role);
    addSourceLink(root, tool.page, "Curiosity instruments");
  });
}

function openStop(index, opener) {
  const stop = (window.MARSWALK_DATA.stops || [])[index];
  if (!stop) return;
  state.lastFocus = opener || document.activeElement;
  document.getElementById("modal-title").textContent = stop.title || "Science stop";
  document.getElementById("modal-look").textContent = "Look for: " + (stop.look || "Not stated.");
  document.getElementById("modal-why").textContent = stop.why || "";
  const tools = (window.MARSWALK_DATA.instruments || []).map(function (item) {
    return item.name + ": " + (item.role || "Role only.");
  });
  tools.push("Instrument role only. No measurement shown.");
  document.getElementById("modal-tools").textContent = tools.join(" ");
  const date = stop.dateNote ? "May 2025" : (stop.date || "");
  document.getElementById("modal-credit").textContent = [stop.credit, date, stop.pia].filter(Boolean).join(". ");
  const link = document.getElementById("modal-source");
  if (stop.page) {
    link.hidden = false;
    link.href = stop.page;
  } else {
    link.hidden = true;
  }
  const photo = document.getElementById("modal-photo");
  const missing = document.getElementById("modal-missing");
  photo.hidden = false;
  missing.hidden = true;
  photo.alt = (stop.photo || stop.title || "Science stop") + ". " + (stop.credit || "");
  photo.onerror = function () {
    photo.hidden = true;
    missing.hidden = false;
  };
  photo.src = stop.file || "";
  document.getElementById("modal").hidden = false;
  document.getElementById("modal-close").focus();
}

function closeModal() {
  document.getElementById("modal").hidden = true;
  if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
}

function openGuide() {
  document.getElementById("guide").hidden = false;
  showGuideStep(0);
}

function closeGuide() {
  state.guide = -1;
  document.getElementById("guide").hidden = true;
  if (!document.getElementById("modal").hidden) closeModal();
  document.getElementById("guide-open").focus();
}

function showGuideStep(index) {
  if (index < 0 || index >= GUIDE.length) {
    closeGuide();
    return;
  }
  state.guide = index;
  document.getElementById("guide-count").textContent = "Step " + (index + 1) + " of " + GUIDE.length;
  document.getElementById("guide-caption").textContent = GUIDE[index];
  document.getElementById("guide-back").disabled = index === 0;
  document.getElementById("guide-next").textContent = index === GUIDE.length - 1 ? "Done" : "Next";
  if (index === 0) {
    document.getElementById("map-panel").focus();
  } else if (index === 1) {
    ensureDemoPoints();
    const card = document.querySelector(".choose-route");
    if (card) card.focus();
  } else if (index === 2) {
    document.getElementById("weight-slope").focus();
  } else if (index === 3) {
    const stop = document.querySelector(".stop-btn");
    if (stop) openStop(0, stop);
  } else if (index === 4) {
    if (!document.getElementById("modal").hidden) closeModal();
    document.getElementById("trust-heading").focus();
  }
}

function ensureDemoPoints() {
  if (state.points.start && state.points.dest) return;
  const pair = demoCells();
  if (!pair[0] || !pair[1]) return;
  state.points.start = pair[0];
  state.points.dest = pair[1];
  state.points.stops = [];
  updateHint();
  renderMarkers();
  computeRoutes("all");
}

function demoCells() {
  const model = grid();
  if (!model) return [null, null];
  function nearest(xPercent, yPercent) {
    const target = percentToCell(xPercent, yPercent);
    let best = null;
    let bestDistance = Infinity;
    for (let y = 0; y < model.height; y += 3) {
      for (let x = 0; x < model.width; x += 3) {
        const index = y * model.width + x;
        if (model.nodata[index] || Number(model.slope[index]) > 8) continue;
        const distance = (x - target.x) * (x - target.x) + (y - target.y) * (y - target.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { x: x, y: y };
        }
      }
    }
    return best;
  }
  return [nearest(28, 72), nearest(72, 28)];
}

function addSourceHeading(parent, text) {
  const heading = document.createElement("h3");
  heading.textContent = text;
  parent.appendChild(heading);
}

function addSourceText(parent, text) {
  if (!text) return;
  const line = document.createElement("p");
  line.textContent = text;
  parent.appendChild(line);
}

function addSourceLink(parent, value, label) {
  if (!value) return;
  const link = document.createElement("a");
  link.href = value;
  link.textContent = label || "Source page";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  parent.appendChild(link);
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
