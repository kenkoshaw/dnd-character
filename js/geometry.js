// Pure coordinate/grid math. No imports, no DOM, no Firebase.
// Spaces: screen px (viewport) ↔ world px (map image pixels) ↔ grid cells.
// view = { panX, panY, zoom }; grid = { cellPx, offX, offY }.

export function screenToWorld(sx, sy, view) {
  return { x: (sx - view.panX) / view.zoom, y: (sy - view.panY) / view.zoom };
}

export function worldToScreen(x, y, view) {
  return { x: x * view.zoom + view.panX, y: y * view.zoom + view.panY };
}

export function cellOf(x, y, grid) {
  return {
    col: Math.floor((x - grid.offX) / grid.cellPx),
    row: Math.floor((y - grid.offY) / grid.cellPx),
  };
}

export function cellKey(col, row) { return `${col}_${row}`; }

export function parseCellKey(key) {
  const [col, row] = key.split('_').map(Number);
  return { col, row };
}

export function cellRect(col, row, grid) {
  return {
    x: grid.offX + col * grid.cellPx,
    y: grid.offY + row * grid.cellPx,
    w: grid.cellPx,
    h: grid.cellPx,
  };
}

// Straight-line distance in feet (1 cell = 5 ft), rounded to nearest 5.
export function distanceFt(a, b, grid) {
  const px = Math.hypot(b.x - a.x, b.y - a.y);
  return Math.round(px / grid.cellPx) * 5;
}

// Two clicks on grid intersections along one row/column, n squares apart.
// Dominant axis tolerates a slightly diagonal click pair.
// Returns null on invalid input (n < 1, or clicks (nearly) identical) so the
// caller can show an error instead of persisting NaN/Infinity grid state.
export function calibrate(p1, p2, n) {
  if (!Number.isFinite(n) || n < 1) return null;
  const span = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
  if (span < 1) return null;
  const cellPx = span / n;
  const mod = v => ((v % cellPx) + cellPx) % cellPx;
  return { cellPx, offX: mod(p1.x), offY: mod(p1.y) };
}

// Doors sit ON a grid line (h or v), one cell long, center snapped to
// half-cell steps along the line so a door may straddle two cells.
export function snapDoor(x, y, grid) {
  const { cellPx, offX, offY } = grid;
  const half = cellPx / 2;
  const vx = offX + Math.round((x - offX) / cellPx) * cellPx; // nearest vertical line
  const hy = offY + Math.round((y - offY) / cellPx) * cellPx; // nearest horizontal line
  if (Math.abs(x - vx) <= Math.abs(y - hy)) {
    return { x: vx, y: offY + Math.round((y - offY) / half) * half, orientation: 'v' };
  }
  return { x: offX + Math.round((x - offX) / half) * half, y: hy, orientation: 'h' };
}

// Players may only move within revealed cells (token center decides).
// Returns the proposed point if its cell is revealed, else lastValid.
export function clampToRevealed(x, y, lastValid, grid, revealedSet) {
  const c = cellOf(x, y, grid);
  return revealedSet.has(cellKey(c.col, c.row)) ? { x, y } : { x: lastValid.x, y: lastValid.y };
}
