import { snapDoor } from '../geometry.js';
import * as store from '../store.js';
import { ctx } from '../campaign.js';

export function createDoorTool(rail, viewport) {
  viewport.addEventListener('pointermove', e => {
    if (rail !== ctx.rail || rail.getTool() !== 'door' || ctx.role?.kind !== 'dm' || !ctx.grid) {
      ctx.layers.doors.hidePreview();
      return;
    }
    const w = ctx.world.toWorld(e);
    ctx.layers.doors.showPreview(snapDoor(w.x, w.y, ctx.grid));
  });

  function pointerHandler(e) {
    // rail !== ctx.rail: stale closure from a released role must self-disable
    if (rail !== ctx.rail || rail.getTool() !== 'door' || ctx.role?.kind !== 'dm' || !ctx.grid) return false;
    const doorEl = e.target.closest('.door[data-door-id]');
    if (doorEl) {
      store.del(`campaigns/${ctx.cid}/maps/${ctx.activeMapId}/doors/${doorEl.dataset.doorId}`);
      return true;
    }
    const w = ctx.world.toWorld(e);
    const d = snapDoor(w.x, w.y, ctx.grid);
    store.write(
      `campaigns/${ctx.cid}/maps/${ctx.activeMapId}/doors/${crypto.randomUUID().replaceAll('-', '')}`,
      d,
    );
    return true;
  }
  return { pointerHandler };
}
