/*
  8-connected A* for MarsWalk Navigator.
  No DOM access. The page loads it with a script tag. Tests load it with require().
*/
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MARSWALK_PATH = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var DIAGONAL = Math.SQRT2;

  var PRESETS = [
    { id: "short", name: "Shortest", wSlope: 0, wScience: 0, color: "#9a3b12" },
    { id: "gentle", name: "Gentlest slope", wSlope: 12, wScience: 0, color: "#1d6a8a" },
    { id: "science", name: "Favor ridge-like terrain (heuristic)", wSlope: 1.5, wScience: 8, color: "#2f6b4f" }
  ];

  function indexOf(grid, x, y) {
    return y * grid.width + x;
  }

  function inside(grid, x, y) {
    return x >= 0 && y >= 0 && x < grid.width && y < grid.height;
  }

  function isBlocked(grid, x, y, slopeLimit) {
    if (!inside(grid, x, y)) return true;
    var index = indexOf(grid, x, y);
    if (grid.nodata[index]) return true;
    return Number(grid.slope[index]) > slopeLimit;
  }

  function canStep(grid, fromX, fromY, toX, toY, slopeLimit) {
    if (isBlocked(grid, toX, toY, slopeLimit)) return false;
    if (fromX !== toX && fromY !== toY) {
      if (isBlocked(grid, toX, fromY, slopeLimit)) return false;
      if (isBlocked(grid, fromX, toY, slopeLimit)) return false;
    }
    return true;
  }

  function stepDistance(grid, from, to) {
    var diagonal = from.x !== to.x && from.y !== to.y;
    return grid.cell_size_m * (diagonal ? DIAGONAL : 1);
  }

  function rawStepCost(grid, from, to, weights) {
    var distance = stepDistance(grid, from, to);
    var arrived = indexOf(grid, to.x, to.y);
    var slope = Number(grid.slope[arrived]);
    var interest = Number(grid.interest[arrived]);
    var ratio = weights.slopeLimit ? slope / weights.slopeLimit : slope;
    return distance * (1 + weights.wSlope * ratio * ratio) + weights.wScience * distance * (1 - interest);
  }

  function heuristic(grid, x, y, goal) {
    var dx = Math.abs(x - goal.x);
    var dy = Math.abs(y - goal.y);
    var orthogonal = Math.max(dx, dy) - Math.min(dx, dy);
    var diagonal = Math.min(dx, dy);
    return grid.cell_size_m * (orthogonal + DIAGONAL * diagonal);
  }

  function heapPush(heap, item) {
    heap.push(item);
    var index = heap.length - 1;
    while (index > 0) {
      var parent = (index - 1) >> 1;
      if (heap[parent].f <= heap[index].f) break;
      var swap = heap[parent];
      heap[parent] = heap[index];
      heap[index] = swap;
      index = parent;
    }
  }

  function heapPop(heap) {
    var top = heap[0];
    var last = heap.pop();
    if (!heap.length || !last) return top;
    heap[0] = last;
    var index = 0;
    var length = heap.length;
    while (true) {
      var left = index * 2 + 1;
      var right = left + 1;
      var smallest = index;
      if (left < length && heap[left].f < heap[smallest].f) smallest = left;
      if (right < length && heap[right].f < heap[smallest].f) smallest = right;
      if (smallest === index) break;
      var next = heap[smallest];
      heap[smallest] = heap[index];
      heap[index] = next;
      index = smallest;
    }
    return top;
  }

  function findPath(grid, start, goal, weights) {
    if (!grid || !start || !goal || !weights) return null;
    if (!inside(grid, start.x, start.y) || !inside(grid, goal.x, goal.y)) return null;
    var startIndex = indexOf(grid, start.x, start.y);
    var goalIndex = indexOf(grid, goal.x, goal.y);
    if (grid.nodata[startIndex] || grid.nodata[goalIndex]) return null;
    if (start.x === goal.x && start.y === goal.y) return metrics(grid, [start], weights.slopeLimit);
    if (isBlocked(grid, start.x, start.y, weights.slopeLimit)) return null;
    if (isBlocked(grid, goal.x, goal.y, weights.slopeLimit)) return null;

    var count = grid.width * grid.height;
    var gScore = new Float64Array(count);
    var parent = new Int32Array(count);
    var closed = new Uint8Array(count);
    gScore.fill(Infinity);
    parent.fill(-1);
    gScore[startIndex] = 0;
    var heap = [];
    heapPush(heap, { i: startIndex, f: heuristic(grid, start.x, start.y, goal) });
    var offsets = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];

    while (heap.length) {
      var current = heapPop(heap);
      if (!current || closed[current.i]) continue;
      closed[current.i] = 1;
      if (current.i === goalIndex) break;
      var cx = current.i % grid.width;
      var cy = (current.i - cx) / grid.width;
      for (var n = 0; n < offsets.length; n += 1) {
        var nx = cx + offsets[n][0];
        var ny = cy + offsets[n][1];
        if (!canStep(grid, cx, cy, nx, ny, weights.slopeLimit)) continue;
        var nextIndex = indexOf(grid, nx, ny);
        if (closed[nextIndex]) continue;
        var tentative = gScore[current.i] + rawStepCost(grid, { x: cx, y: cy }, { x: nx, y: ny }, weights);
        if (tentative < gScore[nextIndex]) {
          gScore[nextIndex] = tentative;
          parent[nextIndex] = current.i;
          heapPush(heap, { i: nextIndex, f: tentative + heuristic(grid, nx, ny, goal) });
        }
      }
    }

    if (parent[goalIndex] === -1) return null;
    var cells = [];
    var walk = goalIndex;
    while (walk !== -1) {
      var x = walk % grid.width;
      cells.push({ x: x, y: (walk - x) / grid.width });
      if (walk === startIndex) break;
      walk = parent[walk];
    }
    cells.reverse();
    if (cells[0].x !== start.x || cells[0].y !== start.y) return null;
    if (cells[cells.length - 1].x !== goal.x || cells[cells.length - 1].y !== goal.y) return null;
    return metrics(grid, cells, weights.slopeLimit);
  }

  function routeThrough(grid, points, weights) {
    if (!points || points.length < 2) return null;
    var cells = [];
    for (var leg = 0; leg < points.length - 1; leg += 1) {
      var piece = findPath(grid, points[leg], points[leg + 1], weights);
      if (!piece) return null;
      if (leg === 0) cells = piece.cells.slice();
      else cells = cells.concat(piece.cells.slice(1));
    }
    return metrics(grid, cells, weights.slopeLimit);
  }

  function metrics(grid, cells, slopeLimit) {
    var distance = 0;
    var ascent = 0;
    var descent = 0;
    var slopeSum = 0;
    var interestSum = 0;
    var above = 0;
    var profile = [];
    var previous = cells[0];
    var first = indexOf(grid, previous.x, previous.y);
    var maxSlope = Number(grid.slope[first]);
    profile.push({ d: 0, elev: round1(grid.elev[first]) });
    for (var i = 1; i < cells.length; i += 1) {
      var cell = cells[i];
      var step = stepDistance(grid, previous, cell);
      var here = indexOf(grid, cell.x, cell.y);
      var before = indexOf(grid, previous.x, previous.y);
      var rise = Number(grid.elev[here]) - Number(grid.elev[before]);
      distance += step;
      if (rise > 0) ascent += rise;
      else descent -= rise;
      var slope = Number(grid.slope[here]);
      if (slope > maxSlope) maxSlope = slope;
      slopeSum += slope * step;
      interestSum += Number(grid.interest[here]) * step;
      if (slope > slopeLimit) above += step;
      profile.push({ d: round1(distance), elev: round1(grid.elev[here]) });
      previous = cell;
    }
    return {
      cells: cells,
      distance_m: round1(distance),
      ascent_m: round1(ascent),
      descent_m: round1(descent),
      max_slope_deg: round1(maxSlope),
      mean_slope_deg: round1(distance ? slopeSum / distance : maxSlope),
      pct_above_limit: round1(distance ? (above / distance) * 100 : (maxSlope > slopeLimit ? 100 : 0)),
      mean_interest: round3(distance ? interestSum / distance : Number(grid.interest[first])),
      profile: profile,
      uncertainty_m: null,
      grid_spacing_m: grid.cell_size_m,
      dem_resolution_m: grid.resolution_m
    };
  }

  function samePath(a, b) {
    if (!a || !b || a.cells.length !== b.cells.length) return false;
    for (var i = 0; i < a.cells.length; i += 1) {
      if (a.cells[i].x !== b.cells[i].x || a.cells[i].y !== b.cells[i].y) return false;
    }
    return true;
  }

  function round1(value) {
    return Math.round(Number(value) * 10) / 10;
  }

  function round3(value) {
    return Math.round(Number(value) * 1000) / 1000;
  }

  return {
    PRESETS: PRESETS,
    findPath: findPath,
    routeThrough: routeThrough,
    samePath: samePath,
    rawStepCost: rawStepCost
  };
});
