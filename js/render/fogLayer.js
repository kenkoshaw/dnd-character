import { cellOf, cellKey, cellRect } from '../geometry.js';
import { ctx } from '../campaign.js';

export function createFogLayer(worldEl, beforeEl) {
  const canvas = document.createElement('canvas');
  canvas.id = 'fogCanvas';
  worldEl.insertBefore(canvas, beforeEl); // between #monsters and #characters

  // preview: during a DM stroke, cells painted locally before commit
  function draw(revealedSet, preview = null) {
    if (!ctx.grid || !(ctx.grid.cellPx > 0) || !ctx.mapSize.w) return;
    const { w, h } = ctx.mapSize;
    const g = canvas.getContext('2d');
    // Assigning width/height reallocs + clears even when unchanged — guard it.
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    else g.clearRect(0, 0, w, h);
    const isDm = ctx.role?.kind === 'dm';
    g.fillStyle = '#000';
    g.globalAlpha = isDm ? 0.5 : 1;

    const effective = new Set(revealedSet);
    if (preview) {
      for (const k of preview.cells) {
        if (preview.mode === 'addFog') effective.delete(k);
        else effective.add(k);
      }
    }
    const tl = cellOf(0, 0, ctx.grid);
    const br = cellOf(w - 1, h - 1, ctx.grid);
    for (let c = tl.col; c <= br.col; c++) {
      for (let r = tl.row; r <= br.row; r++) {
        if (effective.has(cellKey(c, r))) continue;
        const rect = cellRect(c, r, ctx.grid);
        g.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
    }
  }
  return { draw };
}
