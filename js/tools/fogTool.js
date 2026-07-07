import { cellOf, cellKey } from '../geometry.js';
import { strokeMode, strokeUpdates, allCellKeys } from '../fogLogic.js';
import * as store from '../store.js';
import { ctx } from '../campaign.js';

// DM-only. Click toggles a cell; drag paints. The starting cell fixes the
// stroke mode. Other clients see the result only on commit (pointer release).
export function createFogTool(rail) {
  function pointerHandler(e) {
    // rail !== ctx.rail: stale closure from a released role must self-disable
    if (rail !== ctx.rail || rail.getTool() !== 'fog' || ctx.role?.kind !== 'dm' || !ctx.grid) return false;
    const startW = ctx.world.toWorld(e);
    const startCell = cellOf(startW.x, startW.y, ctx.grid);
    const startKey = cellKey(startCell.col, startCell.row);
    const mode = strokeMode(startKey, ctx.revealed);
    const cells = new Set([startKey]);
    // Live preview shared via ctx so the map subscription's redraws (concurrent
    // writes land mid-stroke) keep the in-progress stroke visible.
    ctx.fogPreview = { mode, cells };
    ctx.layers.fog.draw(ctx.revealed, ctx.fogPreview);

    const move = ev => {
      if (ev.pointerId !== e.pointerId) return;
      const w = ctx.world.toWorld(ev);
      const c = cellOf(w.x, w.y, ctx.grid);
      const k = cellKey(c.col, c.row);
      if (!cells.has(k)) { cells.add(k); ctx.layers.fog.draw(ctx.revealed, ctx.fogPreview); }
    };
    // Commit on release AND on pointer cancel — a half-painted stroke is
    // better committed than silently lost with a stale preview on screen.
    const up = ev => {
      if (ev.pointerId !== e.pointerId) return;
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      ctx.fogPreview = null;
      const updates = strokeUpdates(mode, [...cells], ctx.revealed);
      if (Object.keys(updates).length)
        store.patch(`campaigns/${ctx.cid}/maps/${ctx.activeMapId}/fog`, updates);
      else ctx.layers.fog.draw(ctx.revealed); // no-op stroke: clear the preview
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
    return true;
  }

  function showPopover() {
    rail.showPopover(p => {
      p.innerHTML = `<h3>Fog of war</h3>
        <p style="font-size:12px;color:#aaa">Click a cell to toggle. Drag to paint —
        starting on a clear cell adds fog, starting on fog reveals.</p>
        <button id="fogRevealAll">Reveal all</button>
        <button id="fogHideAll">Hide all</button>`;
      p.querySelector('#fogRevealAll').onclick = () => {
        const all = Object.fromEntries(allCellKeys(ctx.grid, ctx.mapSize.w, ctx.mapSize.h).map(k => [k, true]));
        store.write(`campaigns/${ctx.cid}/maps/${ctx.activeMapId}/fog`, all);
      };
      p.querySelector('#fogHideAll').onclick = () => {
        if (confirm('Hide the entire map from players?'))
          store.del(`campaigns/${ctx.cid}/maps/${ctx.activeMapId}/fog`);
      };
    });
  }

  return { pointerHandler, showPopover };
}
