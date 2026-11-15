const assert = require("assert");
const pathfinder = require("../pathfinder.js");

function grid(width, height, fill) {
  const count = width * height;
  const slope = new Array(count).fill(0);
  const elev = new Array(count).fill(0);
  const interest = new Array(count).fill(0);
  const nodata = new Array(count).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = fill({ x: x, y: y, i: y * width + x }) || {};
      const i = y * width + x;
      if (cell.slope !== undefined) slope[i] = cell.slope;
      if (cell.elev !== undefined) elev[i] = cell.elev;
      if (cell.interest !== undefined) interest[i] = cell.interest;
      if (cell.nodata) nodata[i] = 1;
    }
  }
  return {
    width: width,
    height: height,
    cell_size_m: 10,
    resolution_m: 1,
    slope: slope,
    elev: elev,
    interest: interest,
    nodata: nodata
  };
}

function hasCell(path, x, y) {
  return path.cells.some(function (cell) { return cell.x === x && cell.y === y; });
}

const limit = { wSlope: 0, wScience: 0, slopeLimit: 15 };

const flat = grid(5, 5, function () { return { slope: 1, elev: 100 }; });
const straight = pathfinder.findPath(flat, { x: 0, y: 2 }, { x: 4, y: 2 }, limit);
assert.ok(straight, "flat path exists");
assert.strictEqual(straight.cells.length, 5);
straight.cells.forEach(function (cell, index) {
  assert.strictEqual(cell.x, index);
  assert.strictEqual(cell.y, 2);
});
assert.strictEqual(straight.distance_m, 40);
assert.strictEqual(straight.ascent_m, 0);
assert.strictEqual(straight.max_slope_deg, 1);

const walled = grid(10, 8, function (cell) {
  if (cell.x === 4 && cell.y <= 5) return { slope: 40, elev: 10 };
  return { slope: 2, elev: 10 };
});
const around = pathfinder.findPath(walled, { x: 1, y: 2 }, { x: 8, y: 2 }, limit);
assert.ok(around, "path goes around the wall");
around.cells.forEach(function (cell) {
  assert.ok(!(cell.x === 4 && cell.y <= 5), "path entered a blocked cell");
});
assert.ok(around.cells.some(function (cell) { return cell.y > 5; }), "path detours below the wall");

const sealed = grid(8, 5, function (cell) {
  if (cell.x === 3) return { slope: 40 };
  return { slope: 1 };
});
const none = pathfinder.findPath(sealed, { x: 0, y: 2 }, { x: 6, y: 2 }, limit);
assert.strictEqual(none, null);

const via = pathfinder.routeThrough(flat, [
  { x: 0, y: 0 },
  { x: 2, y: 4 },
  { x: 4, y: 0 }
], limit);
assert.ok(via, "waypoint route exists");
assert.ok(hasCell(via, 2, 4));
const viaIndex = via.cells.findIndex(function (cell) { return cell.x === 2 && cell.y === 4; });
assert.ok(viaIndex > 0 && viaIndex < via.cells.length - 1);

const same = pathfinder.findPath(flat, { x: 2, y: 2 }, { x: 2, y: 2 }, limit);
assert.ok(same);
assert.strictEqual(same.distance_m, 0);
assert.strictEqual(same.cells.length, 1);

const wide = grid(300, 300, function () { return { slope: 1, elev: 0 }; });
const started = Date.now();
const across = pathfinder.findPath(wide, { x: 0, y: 0 }, { x: 299, y: 299 }, limit);
const elapsed = Date.now() - started;
assert.ok(across, "300 x 300 path exists");
assert.ok(elapsed < 1000, "300 x 300 path took " + elapsed + " ms");
assert.ok(across.distance_m > 2990);

console.log("pathfinder tests passed");
