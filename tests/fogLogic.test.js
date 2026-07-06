import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strokeMode, strokeUpdates, allCellKeys } from '../js/fogLogic.js';

test('strokeMode: start on revealed cell adds fog, start on fogged removes', () => {
  const revealed = new Set(['0_0']);
  assert.equal(strokeMode('0_0', revealed), 'addFog');
  assert.equal(strokeMode('5_5', revealed), 'removeFog');
});

test('strokeUpdates addFog: nulls only currently-revealed cells', () => {
  const revealed = new Set(['0_0', '1_0']);
  const u = strokeUpdates('addFog', ['0_0', '1_0', '2_0'], revealed);
  assert.deepEqual(u, { '0_0': null, '1_0': null });
});

test('strokeUpdates removeFog: sets true only currently-fogged cells', () => {
  const revealed = new Set(['0_0']);
  const u = strokeUpdates('removeFog', ['0_0', '1_0', '2_0'], revealed);
  assert.deepEqual(u, { '1_0': true, '2_0': true });
});

test('allCellKeys covers every cell overlapping the map, including offset edges', () => {
  const grid = { cellPx: 50, offX: 10, offY: 0 };
  const keys = allCellKeys(grid, 100, 50); // map 100x50 px
  // x: cells -1 (0..10), 0 (10..60), 1 (60..100) ; y: row 0 only
  assert.deepEqual(keys.sort(), ['-1_0', '0_0', '1_0'].sort());
});
