/*
  MarsWalk Navigator
  Marker positions are percentages of the shared map frame.
  x: 0 is the left edge, 100 is the right edge.
  y: 0 is the top edge, 100 is the bottom edge.
  They are not Mars coordinates.
  Distance and slope stay empty unless MARSWALK_ROUTES has real numbers.
*/

const LAYOUT = {
  main: [
    { id: "start", mark: "S", name: "Start", x: 20, y: 74 },
    { id: "stop1", mark: "1", name: "Stop 1", x: 42, y: 50, stop: 0 },
    { id: "stop2", mark: "2", name: "Stop 2", x: 66, y: 32, stop: 1 },
    { id: "return", mark: "R", name: "Return", x: 34, y: 80 }
  ],
  alternate: [
    { id: "start", mark: "S", name: "Start", x: 20, y: 74 },
    { id: "stop1", mark: "1", name: "Stop 1", x: 54, y: 64, stop: 0 },
    { id: "stop2", mark: "2", name: "Stop 2", x: 76, y: 42, stop: 1 },
    { id: "return", mark: "R", name: "Return", x: 34, y: 80 }
  ]
};

const GUIDE = [
  "This is a concept for a short walk, not a checked plan.",
  "Switch Orbital, Terrain, and Geology. Missing layers say so.",
  "Both routes are sketches. Neither length is measured yet.",
  "Open a stop to see what the crew would look for.",
  "Red rows are the data to trust least."
];

const state = {
  layer: "orbital",
  route: "main",
  guide: -1,
  lastFocus: null
};

function init() {
  if (!window.MARSWALK_DATA || !window.MARSWALK_ROUTES) {
    document.getElementById("map-caption").textContent = "assets/data.js did not load.";
    return;
  }
  bindEvents();
  renderRoutes();
  renderStops();
  renderConfidence();
  renderSources();
  setLayer("orbital");
  setRoute("main");
}

function bindEvents() {
  const tabs = document.querySelector(".tabs");
  tabs.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-layer]");
    if (!button) {
      return;
    }
    setLayer(button.dataset.layer);
  });
  tabs.addEventListener("keydown", function (event) {
    const buttons = Array.from(tabs.querySelectorAll("button"));
    const index = buttons.indexOf(document.activeElement);
    if (index < 0) {
      return;
    }
    let next = index;
    if (event.key === "ArrowRight") {
      next = (index + 1) % buttons.length;
    } else if (event.key === "ArrowLeft") {
      next = (index - 1 + buttons.length) % buttons.length;
    } else {
      return;
    }
    event.preventDefault();
    buttons[next].focus();
    setLayer(buttons[next].dataset.layer);
  });

  document.getElementById("guide-open").addEventListener("click", openGuide);
  document.getElementById("guide-close").addEventListener("click", closeGuide);
  document.getElementById("guide-next").addEventListener("click", function () {
    showGuideStep(state.guide + 1);
  });
  document.getElementById("guide-back").addEventListener("click", function () {
    showGuideStep(state.guide - 1);
  });
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-backdrop").addEventListener("click", closeModal);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      const modal = document.getElementById("modal");
      if (!modal.hidden) {
        closeModal();
        return;
      }
      if (state.guide >= 0) {
        closeGuide();
      }
    }
    if (event.key === "Tab") {
      trapModalTab(event);
    }
  });
}

function setLayer(id) {
  state.layer = id;
  const view = mapViews().find(function (item) {
    return item.id === id;
  });
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
    photo.classList.add("is-out");
    window.setTimeout(function () {
      if (state.layer !== id) {
        return;
      }
      photo.hidden = true;
      photo.removeAttribute("src");
      missing.hidden = false;
    }, motionDelay());
    return;
  }

  missing.hidden = true;
  photo.hidden = false;
  photo.alt = view.alt;
  if (photo.getAttribute("src") !== view.file) {
    photo.classList.add("is-out");
    photo.onload = function () {
      if (state.layer === id) {
        photo.classList.remove("is-out");
      }
    };
    photo.onerror = function () {
      if (state.layer !== id) {
        return;
      }
      photo.hidden = true;
      missing.hidden = false;
      document.getElementById("map-caption").textContent = "Layer not available yet.";
    };
    photo.src = view.file;
  } else {
    photo.classList.remove("is-out");
  }
}

function motionDelay() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return 0;
  }
  return 180;
}

function setRoute(id) {
  state.route = id;
  drawLines();
  drawMarkers();
  document.querySelectorAll(".route-card").forEach(function (card) {
    const on = card.dataset.route === id;
    card.setAttribute("aria-pressed", on ? "true" : "false");
    const swatch = card.querySelector(".swatch");
    if (swatch) {
      swatch.classList.toggle("is-on", on);
    }
  });
}

function drawLines() {
  const svg = document.getElementById("routes");
  clearNode(svg);
  const order = state.route === "main" ? ["alternate", "main"] : ["main", "alternate"];
  order.forEach(function (id) {
    svg.appendChild(makeLine(id, "halo"));
    const line = makeLine(id, "line");
    if (id === state.route) {
      line.classList.add("is-on");
    }
    svg.appendChild(line);
  });
}

function makeLine(id, kind) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  const points = LAYOUT[id].map(function (point) {
    return point.x + "," + point.y;
  }).join(" ");
  line.setAttribute("points", points);
  line.setAttribute("class", "route route-" + kind);
  return line;
}

function drawMarkers() {
  const holder = document.getElementById("markers");
  clearNode(holder);
  const stops = scienceStops();
  LAYOUT[state.route].forEach(function (point) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "marker";
    if (point.stop !== undefined) {
      button.classList.add("is-stop");
    }
    button.style.left = point.x + "%";
    button.style.top = point.y + "%";
    button.textContent = point.mark;

    const tip = document.createElement("span");
    tip.className = "tip";
    if (point.y < 28) {
      tip.classList.add("below");
    }
    const record = point.stop !== undefined ? stops[point.stop] : null;
    const tipText = record ? point.name + ": " + record.title : point.name;
    tip.textContent = tipText;
    button.setAttribute("aria-label", tipText);
    button.appendChild(tip);

    button.addEventListener("click", function () {
      if (record) {
        openStop(point.stop, button);
      }
    });
    holder.appendChild(button);
  });
}

function renderRoutes() {
  const grid = document.getElementById("route-cards");
  clearNode(grid);
  window.MARSWALK_ROUTES.forEach(function (route) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "route-card";
    button.dataset.route = route.id;
    button.setAttribute("aria-pressed", "false");

    const name = document.createElement("span");
    name.className = "route-name";
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = route.id === "main" ? "Route A · Main" : "Route B · Alternate";
    name.appendChild(swatch);
    name.appendChild(label);

    button.appendChild(name);
    button.appendChild(statLine("Distance", formatMeasure(route.distance_m, " m")));
    button.appendChild(statLine("Max slope", formatMeasure(route.max_slope_deg, "°")));
    button.appendChild(sourceLine(route.source));
    button.appendChild(profileBox(route.profile));

    const list = document.createElement("ul");
    list.className = "tradeoffs";
    (route.tradeoffs || []).forEach(function (item) {
      const entry = document.createElement("li");
      entry.textContent = item;
      list.appendChild(entry);
    });
    button.appendChild(list);

    button.addEventListener("click", function () {
      setRoute(route.id);
    });
    grid.appendChild(button);
  });
}

function statLine(label, value) {
  const line = document.createElement("span");
  line.className = "stat";
  line.appendChild(document.createTextNode(label + " "));
  const strong = document.createElement("b");
  strong.textContent = value.text;
  if (value.empty) {
    strong.className = "is-empty";
  }
  line.appendChild(strong);
  return line;
}

function sourceLine(source) {
  const line = document.createElement("p");
  line.className = "source-line";
  line.textContent = "Source: " + (source || "Not measured yet");
  return line;
}

function formatMeasure(value, unit) {
  if (value === null || value === undefined || value === "") {
    return { text: "Not measured yet", empty: true };
  }
  return { text: String(value) + unit, empty: false };
}

function profileBox(profile) {
  const box = document.createElement("div");
  box.className = "profile-box";
  if (!profile || !profile.length) {
    box.textContent = "Not measured yet";
    return box;
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 40");
  svg.setAttribute("aria-hidden", "true");
  const distances = profile.map(function (point) { return Number(point.d); });
  const heights = profile.map(function (point) { return Number(point.elev); });
  const minD = Math.min.apply(null, distances);
  const maxD = Math.max.apply(null, distances);
  const minE = Math.min.apply(null, heights);
  const maxE = Math.max.apply(null, heights);
  const spanD = maxD - minD || 1;
  const spanE = maxE - minE || 1;
  const points = profile.map(function (point) {
    const x = ((Number(point.d) - minD) / spanD) * 100;
    const y = 36 - ((Number(point.elev) - minE) / spanE) * 32;
    return x + "," + y;
  }).join(" ");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", points);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#9a3b12");
  line.setAttribute("stroke-width", "2");
  svg.appendChild(line);
  box.appendChild(svg);
  return box;
}

function renderStops() {
  const list = document.getElementById("stop-cards");
  clearNode(list);
  scienceStops().forEach(function (stop, index) {
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
  (window.MARSWALK_DATA.layers || []).forEach(function (layer) {
    const tone = layer.tone === "green" || layer.tone === "yellow" || layer.tone === "red"
      ? layer.tone
      : "yellow";
    const item = document.createElement("li");
    const badge = document.createElement("span");
    badge.className = "badge badge-" + tone;
    badge.textContent = layer.badge || "Uncertain";
    const copy = document.createElement("span");
    copy.className = "trust-copy";
    const name = document.createElement("strong");
    name.textContent = layer.name || "Layer";
    const reason = document.createElement("span");
    reason.className = "reason";
    reason.textContent = layer.reason || "Limit not stated.";
    copy.appendChild(name);
    copy.appendChild(reason);
    item.appendChild(badge);
    item.appendChild(copy);
    list.appendChild(item);
  });
}

function renderSources() {
  const box = document.getElementById("sources");
  clearNode(box);
  addSourceHeading(box, "Map datasets");
  (window.MARSWALK_DATA.layers || []).forEach(function (layer) {
    addSourceText(box, layer.title || layer.name);
    if (layer.credit) {
      addSourceText(box, layer.credit);
    }
    if (layer.note) {
      addSourceText(box, layer.note);
    }
    addSourceLink(box, layer.page);
  });

  addSourceHeading(box, "Stop photos");
  scienceStops().forEach(function (stop) {
    addSourceText(box, (stop.photo || stop.title) + (stop.pia ? " (" + stop.pia + ")" : ""));
    if (stop.credit) {
      addSourceText(box, stop.credit);
    }
    if (stop.dateNote) {
      addSourceText(box, stop.dateNote);
    } else if (stop.date) {
      addSourceText(box, stop.date);
    }
    addSourceLink(box, stop.page);
  });

  addSourceHeading(box, "Other references");
  (window.MARSWALK_DATA.references || []).forEach(function (item) {
    addSourceText(box, item.title || "Reference");
    if (item.credit) {
      addSourceText(box, item.credit);
    }
    if (item.note) {
      addSourceText(box, item.note);
    }
    addSourceLink(box, item.page);
  });
  const blog = window.MARSWALK_DATA.note;
  if (blog) {
    addSourceText(box, "Curiosity blog note");
    if (blog.author) {
      addSourceText(box, blog.author);
    }
    addSourceLink(box, blog.page);
  }
  (window.MARSWALK_DATA.instruments || []).forEach(function (item) {
    addSourceText(box, item.name);
    addSourceLink(box, item.page);
  });
}

function openStop(index, trigger) {
  const stop = scienceStops()[index];
  if (!stop) {
    return;
  }
  state.lastFocus = trigger || document.activeElement;
  document.getElementById("modal-title").textContent = stop.title || "Science stop";
  const photo = document.getElementById("modal-photo");
  const missing = document.getElementById("modal-missing");
  const file = stop.file;
  photo.alt = stop.photo ? stop.photo + ". " + (stop.credit || "") : "Science stop photo";
  photo.hidden = false;
  missing.hidden = true;
  photo.onerror = function () {
    photo.hidden = true;
    missing.hidden = false;
  };
  if (file) {
    photo.src = file;
  } else {
    photo.hidden = true;
    missing.hidden = false;
  }
  document.getElementById("modal-look").textContent = "What to look for: " + (stop.look || "Not stated.");
  const blog = window.MARSWALK_DATA.note;
  document.getElementById("modal-note").textContent = [stop.note, blog && blog.sentence].filter(Boolean).join(" ");
  document.getElementById("modal-tools").textContent = instrumentLine();
  document.getElementById("modal-credit").textContent = creditLine(stop);
  const modal = document.getElementById("modal");
  modal.hidden = false;
  document.getElementById("modal-close").focus();
}

function closeModal() {
  document.getElementById("modal").hidden = true;
  if (state.lastFocus && state.lastFocus.focus) {
    state.lastFocus.focus();
  }
  state.lastFocus = null;
}

function trapModalTab(event) {
  const modal = document.getElementById("modal");
  if (modal.hidden) {
    return;
  }
  const items = modal.querySelectorAll("button, a[href]");
  if (!items.length) {
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function instrumentLine() {
  const tools = window.MARSWALK_DATA.instruments || [];
  const chem = tools.find(function (item) { return item.name === "ChemCam"; });
  const min = tools.find(function (item) { return item.name === "CheMin"; });
  const chemRole = chem ? "ChemCam uses a laser to read elements." : "";
  const minRole = min ? "CheMin uses X-rays to name minerals." : "";
  return [chemRole, minRole].filter(Boolean).join(" ");
}

function creditLine(stop) {
  return [stop.credit, stop.date, stop.pia].filter(Boolean).join(". ");
}

function mapViews() {
  return (window.MARSWALK_DATA.views || []);
}

function scienceStops() {
  return (window.MARSWALK_DATA.stops || []).slice(0, 2);
}

function openGuide() {
  document.getElementById("guide").hidden = false;
  showGuideStep(0);
}

function closeGuide() {
  state.guide = -1;
  document.getElementById("guide").hidden = true;
  document.getElementById("guide-open").focus();
}

function focusAndShow(node) {
  if (!node) {
    return;
  }
  node.scrollIntoView({ block: "nearest" });
  node.focus();
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
  if (index === 1) {
    setLayer("terrain");
    focusAndShow(document.getElementById("tab-terrain"));
  } else if (index === 2) {
    setLayer("orbital");
    setRoute("main");
    focusAndShow(document.querySelector(".route-card"));
  } else if (index === 3) {
    focusAndShow(document.querySelector(".stop-btn"));
  } else if (index === 4) {
    focusAndShow(document.getElementById("trust-heading"));
  }
}

function addSourceHeading(parent, text) {
  const heading = document.createElement("h3");
  heading.textContent = text;
  parent.appendChild(heading);
}

function addSourceText(parent, text) {
  if (!text) {
    return;
  }
  const line = document.createElement("p");
  line.textContent = text;
  parent.appendChild(line);
}

function addSourceLink(parent, value) {
  const href = linkOnly(value);
  if (!href) {
    return;
  }
  const link = document.createElement("a");
  link.href = href;
  link.textContent = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  parent.appendChild(link);
}

function linkOnly(value) {
  if (!value) {
    return "";
  }
  const match = String(value).match(/https?:\/\/[^\s)]+/);
  if (!match) {
    return "";
  }
  return match[0].replace(/[.,;]+$/, "");
}

function clearNode(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
