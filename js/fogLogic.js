// Fog-of-war semantics. Fog state = Set of revealed cell keys ("col_row").
import { cellOf, cellKey } from './geometry.js';

export function strokeMode(startKey, revealedSet) {
  return revealedSet.has(startKey) ? 'addFog' : 'removeFog';
}

// Firebase multi-path update object for the map's fog/ node.
// addFog deletes revealed keys (null); removeFog writes true.
export function strokeUpdates(mode, cellKeys, revealedSet) {
  const updates = {};
  for (const k of cellKeys) {
    if (mode === 'addFog' && revealedSet.has(k)) updates[k] = null;
    else if (mode === 'removeFog' && !revealedSet.has(k)) updates[k] = true;
  }
  return updates;
}

// Every cell key overlapping a mapW x mapH image (for "reveal all").
export function allCellKeys(grid, mapW, mapH) {
  const tl = cellOf(0, 0, grid);
  const br = cellOf(mapW - 1, mapH - 1, grid);
  const keys = [];
  for (let c = tl.col; c <= br.col; c++)
    for (let r = tl.row; r <= br.row; r++) keys.push(cellKey(c, r));
  return keys;
}
