import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  screenToWorld, worldToScreen, cellOf, cellKey, parseCellKey, cellRect,
  distanceFt, calibrate, snapDoor, clampToRevealed,
} from '../js/geometry.js';

const view = { panX: 100, panY: 50, zoom: 2 };
const grid = { cellPx: 50, offX: 10, offY: 20 };

test('screenToWorld inverts worldToScreen', () => {
  const w = screenToWorld(300, 250, view);
  assert.deepEqual(w, { x: 100, y: 100 });
  assert.deepEqual(worldToScreen(w.x, w.y, view), { x: 300, y: 250 });
});

test('cellOf maps world px to grid cell', () => {
  assert.deepEqual(cellOf(10, 20, grid), { col: 0, row: 0 });
  assert.deepEqual(cellOf(59.9, 69.9, grid), { col: 0, row: 0 });
  assert.deepEqual(cellOf(60, 70, grid), { col: 1, row: 1 });
  assert.deepEqual(cellOf(5, 15, grid), { col: -1, row: -1 }); // left of offset
});

test('cellKey round-trips', () => {
  assert.equal(cellKey(3, -2), '3_-2');
  assert.deepEqual(parseCellKey('3_-2'), { col: 3, row: -2 });
});

test('cellRect returns world-px rect', () => {
  assert.deepEqual(cellRect(1, 2, grid), { x: 60, y: 120, w: 50, h: 50 });
});

test('distanceFt: 5ft per cell, straight line, rounded to nearest 5', () => {
  assert.equal(distanceFt({ x: 0, y: 0 }, { x: 100, y: 0 }, grid), 10);   // 2 cells
  assert.equal(distanceFt({ x: 0, y: 0 }, { x: 150, y: 200 }, grid), 25); // 3-4-5 → 5 cells
  assert.equal(distanceFt({ x: 0, y: 0 }, { x: 60, y: 0 }, grid), 5);     // 1.2 cells → 5
});

test('calibrate: X-axis only (points on one row)', () => {
  // points on same row, 4 tiles apart in X, grid cellPx=50 offX=10 offY=20
  const g = calibrate({ x: 60, y: 70 }, { x: 260, y: 72 }, 4, 0);
  assert.equal(g.cellPx, 50);
  assert.equal(g.offX, 10);
  assert.equal(g.offY, 20);
});

test('calibrate: diagonal points average both axis estimates', () => {
  // 4 tiles across (200px → 50) and 2 tiles down (110px → 55) → 52.5
  const g = calibrate({ x: 60, y: 70 }, { x: 260, y: 180 }, 4, 2);
  assert.equal(g.cellPx, 52.5);
});

test('calibrate: Y-axis only (points on one column)', () => {
  const g = calibrate({ x: 60, y: 70 }, { x: 61, y: 270 }, 0, 4);
  assert.equal(g.cellPx, 50);
});

test('snapDoor snaps to nearest grid line, half-cell steps along it', () => {
  // near vertical line x=60; y snaps to the 25px half-cell lattice from offY=20
  // (…95, 120, 145…) → 132 lands on 120: a door straddling two cells.
  assert.deepEqual(snapDoor(62, 132, grid), { x: 60, y: 120, orientation: 'v' });
  // near horizontal line y=70 → horizontal door
  assert.deepEqual(snapDoor(90, 68, grid), { x: 85, y: 70, orientation: 'h' });
});

test('calibrate rejects invalid input with null', () => {
  const p1 = { x: 60, y: 70 }, p2 = { x: 260, y: 72 };
  assert.equal(calibrate(p1, p2, 0, 0), null);      // both counts cleared
  assert.equal(calibrate(p1, p2, -4, -1), null);    // negative
  assert.equal(calibrate(p1, p2, NaN, NaN), null);
  assert.equal(calibrate(p1, { x: 60.4, y: 70.2 }, 4, 4), null); // near-identical points
  assert.equal(calibrate(p1, p2, 0, 4), null);      // Y count given but points share a row
});

test('snapDoor exact tie between lines resolves to vertical', () => {
  // point equidistant from vertical line x=60 and horizontal line y=70
  assert.deepEqual(snapDoor(65, 75, grid), { x: 60, y: 70, orientation: 'v' });
});

test('distanceFt returns 0 below half a cell', () => {
  assert.equal(distanceFt({ x: 0, y: 0 }, { x: 20, y: 0 }, grid), 0); // 0.4 cells
});

test('clampToRevealed blocks moves into fogged cells', () => {
  const revealed = new Set(['1_1']);
  const last = { x: 70, y: 80 }; // inside cell 1_1
  assert.deepEqual(clampToRevealed(75, 85, last, grid, revealed), { x: 75, y: 85 });
  assert.deepEqual(clampToRevealed(200, 200, last, grid, revealed), { x: 70, y: 80 });
});
