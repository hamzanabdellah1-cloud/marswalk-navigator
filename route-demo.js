(function () {
  "use strict";
  const grid = window.MARSWALK_GRID;
  const pathfinder = window.MARSWALK_PATH;
  const area = {
    west: grid.bounds.west,
    south: grid.bounds.south,
    east: grid.bounds.east,
    north: grid.bounds.north
  };
  const presets = [
    { id: "short", title: "Shortest", wSlope: 0, wScience: 0, color: "#ff9b6b", why: "Minimizes distance. The slope threshold remains a hard limit; it adds no extra slope penalty." },
    { id: "gentle", title: "Gentlest slope", wSlope: 12, wScience: 0, color: "#58c6e7", why: "Adds a strong penalty for steep cells, trading extra distance for a lower maximum slope." },
    { id: "science", title: "Ridge-interest heuristic", wSlope: 1.5, wScience: 8, color: "#8ee0ad", why: "Favors cells with a higher terrain-position score. This is a topographic heuristic, not measured science interest." }
  ];
  const state = {
    start: { x: 162, y: 186 },
    dest: { x: 216, y: 150 },
    mode: "start",
    selected: "gentle",
    results: []
  };
  const $ = (id) => document.getElementById(id);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const idx = (p) => p.y * grid.width + p.x;
  const limit = () => Number($("slope-limit").value);

  function coordinate(p) {
    const lon = area.west + ((p.x + 0.5) / grid.width) * (area.east - area.west);
    const lat = area.north - ((p.y + 0.5) / grid.height) * (area.north - area.south);
    return `${lon.toFixed(5)}°E, ${Math.abs(lat).toFixed(5)}°S`;
  }

  function directDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y) * grid.cell_size_m;
  }

  function formatMeters(value) {
    return value >= 1000 ? `${(value / 1000).toFixed(2)} km` : `${value.toFixed(1)} m`;
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll("[data-mode]").forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $("click-help").textContent = mode === "start"
      ? "Click inside the terrain grid to set the start. Then choose Destination and click again."
      : "Click inside the terrain grid to set the destination. The routes will recalculate.";
  }

  function nearestWalkable(x, y) {
    let best = null;
    const maxRadius = 12;
    for (let r = 0; r <= maxRadius && !best; r += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const cx = x + dx, cy = y + dy;
          if (cx < 0 || cy < 0 || cx >= grid.width || cy >= grid.height) continue;
          const i = idx({ x: cx, y: cy });
          if (grid.nodata[i] || Number(grid.slope[i]) > limit()) continue;
          const d = dx * dx + dy * dy;
          if (!best || d < best.d) best = { x: cx, y: cy, d };
        }
      }
    }
    return best && { x: best.x, y: best.y };
  }

  function clickMap(event) {
    const rect = $("route-image").getBoundingClientRect();
    const x = clamp(Math.floor((event.clientX - rect.left) / rect.width * grid.width), 0, grid.width - 1);
    const y = clamp(Math.floor((event.clientY - rect.top) / rect.height * grid.height), 0, grid.height - 1);
    const point = nearestWalkable(x, y);
    if (!point) {
      $("map-status").textContent = `No walkable grid cell found within 12 cells at the ${limit()}° threshold.`;
      return;
    }
    state[state.mode] = point;
    $("map-status").textContent = `Set ${state.mode === "start" ? "start" : "destination"} at ${coordinate(point)}. Routes recalculated from DEM cells.`;
    setMode(state.mode === "start" ? "dest" : "start");
    calculate();
  }

  function calculate() {
    const hardLimit = limit();
    state.results = presets.map((preset) => ({
      preset,
      result: pathfinder.findPath(grid, state.start, state.dest, {
        wSlope: preset.wSlope,
        wScience: preset.wScience,
        slopeLimit: hardLimit
      })
    }));
    if (!state.results.some((entry) => entry.preset.id === state.selected && entry.result)) {
      const first = state.results.find((entry) => entry.result);
      if (first) state.selected = first.preset.id;
    }
    renderReadout();
    renderLines();
    renderCards();
  }

  function renderReadout() {
    $("start-readout").textContent = coordinate(state.start);
    $("dest-readout").textContent = coordinate(state.dest);
    $("direct-readout").textContent = formatMeters(directDistance(state.start, state.dest));
    $("slope-output").textContent = `${limit()}°`;
    const s = Number(grid.slope[idx(state.start)]), d = Number(grid.slope[idx(state.dest)]);
    $("result-summary").textContent = `A* search · slope cap ${limit()}° · endpoint slopes ${s.toFixed(1)}° / ${d.toFixed(1)}°`;
  }

  function renderMarkers() {
    const layer = $("route-markers");
    layer.replaceChildren();
    [["start", state.start, "S"], ["dest", state.dest, "D"]].forEach(([kind, p, label]) => {
      const x = (p.x + 0.5) / grid.width * 100;
      const y = (p.y + 0.5) / grid.height * 100;
      const marker = document.createElement("span");
      marker.className = `marker ${kind}`;
      marker.style.left = `${x}%`; marker.style.top = `${y}%`;
      marker.title = `${kind === "start" ? "Start" : "Destination"}: ${coordinate(p)}`;
      layer.appendChild(marker);
      const tag = document.createElement("span");
      tag.className = "marker-label";
      tag.style.left = `${x}%`; tag.style.top = `${y}%`;
      tag.textContent = label;
      layer.appendChild(tag);
    });
  }

  function renderLines() {
    const layer = $("route-lines");
    layer.replaceChildren();
    state.results.forEach(({ preset, result }) => {
      if (!result) return;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      const points = result.cells.map((p) => `${(p.x + 0.5).toFixed(2)},${(p.y + 0.5).toFixed(2)}`).join(" ");
      line.setAttribute("points", points);
      line.setAttribute("stroke", preset.color);
      line.setAttribute("class", `route-line ${preset.id}${preset.id === state.selected ? " selected" : ""}`);
      layer.appendChild(line);
    });
    renderMarkers();
  }

  function metric(label, value) {
    const box = document.createElement("div");
    const name = document.createElement("span"); name.textContent = label;
    const val = document.createElement("strong"); val.textContent = value;
    box.append(name, val); return box;
  }

  function renderCards() {
    const host = $("route-cards");
    host.replaceChildren();
    let available = 0;
    state.results.forEach(({ preset, result }) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `route-card${preset.id === state.selected && result ? " selected" : ""}`;
      card.setAttribute("aria-pressed", String(preset.id === state.selected && Boolean(result)));
      card.addEventListener("click", () => { state.selected = preset.id; renderLines(); renderCards(); });
      const title = document.createElement("h3"); title.textContent = preset.title;
      const reason = document.createElement("p"); reason.className = "route-reason"; reason.textContent = preset.why;
      const parameters = document.createElement("p"); parameters.className = "small";
      parameters.textContent = `Parameters: slope weight ${preset.wSlope}; ridge-score weight ${preset.wScience}; hard slope limit ${limit()}°.`;
      card.append(title, reason, parameters);
      if (result) {
        available += 1;
        const metrics = document.createElement("div"); metrics.className = "route-metrics";
        metrics.append(
          metric("Route length", formatMeters(result.distance_m)),
          metric("Max slope", `${result.max_slope_deg.toFixed(1)}°`),
          metric("Ascent", `${result.ascent_m.toFixed(1)} m`),
          metric("Descent", `${result.descent_m.toFixed(1)} m`),
          metric("Mean slope", `${result.mean_slope_deg.toFixed(1)}°`),
          metric("Ridge score", result.mean_interest.toFixed(3))
        );
        card.appendChild(metrics);
        const caution = document.createElement("p"); caution.className = "small";
        caution.textContent = `Computed from ${result.cells.length} cells at ${result.grid_spacing_m} m grid spacing. Not a safety assessment.`;
        card.appendChild(caution);
      } else {
        const none = document.createElement("p"); none.className = "no-route"; none.textContent = `No path found at ${limit()}°. Increase the slope cap or choose different endpoints.`;
        card.appendChild(none);
      }
      host.appendChild(card);
    });
    if (!available) $("map-status").textContent = `No route found for these endpoints at ${limit()}°. Try another pair or raise the slope threshold.`;
  }

  function resetPoints() {
    state.start = { x: 162, y: 186 };
    state.dest = { x: 216, y: 150 };
    state.selected = "gentle";
    $("map-status").textContent = "Sample endpoints restored. All route values are calculated from the local DEM grid.";
    setMode("start");
    calculate();
  }

  function init() {
    if (!grid || !pathfinder) {
      $("grid-meta").textContent = "Route grid files did not load. Start the site with a local server.";
      return;
    }
    $("grid-meta").textContent = `${grid.source}. ${grid.width} × ${grid.height} cells · ${grid.cell_size_m} m grid spacing · DEM mosaic labeled ${grid.resolution_m} m; per-pixel source resolution unknown. Bounds ${area.west.toFixed(5)}–${area.east.toFixed(5)}°E, ${area.south.toFixed(5)}–${area.north.toFixed(5)}°.`;
    document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
    $("route-map").addEventListener("click", clickMap);
    $("slope-limit").addEventListener("input", calculate);
    $("reset-points").addEventListener("click", resetPoints);
    calculate();
    setMode("start");
  }
  init();
})();
