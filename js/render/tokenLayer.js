import { cellRect, cellOf, cellKey, clampToRevealed, distanceFt } from '../geometry.js';
import * as store from '../store.js';
import { sessionId } from '../session.js';
import { ctx } from '../campaign.js';
import { esc } from '../ui/esc.js';

const THROTTLE_MS = 100;

export function createTokenLayer(worldEl) {
  const monstersEl = document.createElement('div');
  monstersEl.id = 'monsters';
  const charsEl = document.createElement('div');
  charsEl.id = 'characters';
  worldEl.appendChild(monstersEl); // fog canvas (Task 12) inserts between these
  worldEl.appendChild(charsEl);

  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);

  // While I drag a token, my own throttled writes echo back through the
  // characters subscription; a naive full re-render would destroy the element
  // holding pointer capture and kill the drag. draggingId guards against that.
  let draggingId = null;

  // ---- characters ----
  function renderCharacters(chars) {
    const keep = draggingId ? charsEl.querySelector(`[data-char-id="${draggingId}"]`) : null;
    charsEl.innerHTML = '';
    if (keep) charsEl.appendChild(keep);
    if (!ctx.grid) return;
    const size = ctx.grid.cellPx / 2; // ¼ of a cell's area = half its side
    for (const [id, ch] of Object.entries(chars || {})) {
      if (ch.hidden || id === draggingId) continue;
      const pos = ch.positions?.[ctx.activeMapId];
      if (!pos) { maybeSpawn(id, ch); continue; }
      const el = document.createElement('div');
      el.className = 'token';
      el.dataset.charId = id;
      el.style.cssText = `width:${size}px;height:${size}px;left:${pos.x - size / 2}px;top:${pos.y - size / 2}px`;
      el.innerHTML = `<img src="${ch.imageB64}" draggable="false">`;
      el.addEventListener('mouseenter', e => showTip(e, esc(ch.name)));
      el.addEventListener('mouseleave', hideTip);
      charsEl.appendChild(el);
    }
  }

  // First arrival on a map: my own claimed character spawns at the start tile.
  function maybeSpawn(id, ch) {
    const mine = ctx.role?.kind === 'char' && ctx.role.charId === id && ch.claimedBy === sessionId;
    const dm = ctx.role?.kind === 'dm';
    if (!(mine || dm) || !ctx.startTile || !ctx.grid) return;
    const r = cellRect(ctx.startTile.col, ctx.startTile.row, ctx.grid);
    store.write(
      `campaigns/${ctx.cid}/characters/${id}/positions/${ctx.activeMapId}`,
      { x: r.x + r.w / 2, y: r.y + r.h / 2 },
    );
  }

  function showTip(e, html) {
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = `${e.clientX + 12}px`;
    tooltip.style.top = `${e.clientY + 12}px`;
  }
  function hideTip() { tooltip.style.display = 'none'; }

  // ---- dragging (registered as a world pointer handler) ----
  function dragHandler(e) {
    const el = e.target.closest('.token');
    if (!el) return false;
    const isDm = ctx.role?.kind === 'dm';
    const charId = el.dataset.charId;
    const monsterId = el.dataset.monsterId; // Task 15 tokens
    if (!isDm && !(charId && ctx.role?.kind === 'char' && ctx.role.charId === charId)) return false;

    const posPath = charId
      ? `campaigns/${ctx.cid}/characters/${charId}/positions/${ctx.activeMapId}`
      : `campaigns/${ctx.cid}/maps/${ctx.activeMapId}/monsters/${monsterId}`;
    const start = { x: parseFloat(el.style.left) + el.offsetWidth / 2, y: parseFloat(el.style.top) + el.offsetHeight / 2 };
    let last = { ...start };
    let lastWrite = 0;
    draggingId = charId || monsterId;
    el.classList.add('dragging');
    el.setPointerCapture(e.pointerId);

    const speed = charId ? ctx.characters?.[charId]?.speed : null;
    ctx.onDragUpdate?.({ start, current: start, speed, active: true }); // ruler hook (Task 13)

    const move = ev => {
      let w = ctx.world.toWorld(ev);
      if (!isDm) w = clampToRevealed(w.x, w.y, last, ctx.grid, ctx.revealed);
      last = w;
      el.style.left = `${w.x - el.offsetWidth / 2}px`;
      el.style.top = `${w.y - el.offsetHeight / 2}px`;
      ctx.onDragUpdate?.({ start, current: w, speed, active: true });
      const now = performance.now();
      if (now - lastWrite > THROTTLE_MS) {
        lastWrite = now;
        streamPosition(posPath, start, last);
      }
    };
    const up = () => {
      el.releasePointerCapture(e.pointerId);
      el.classList.remove('dragging');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      // moved tokens suppress the click that follows pointerup (see monster
      // HP panel in Task 15, which opens on plain clicks)
      if (Math.hypot(last.x - start.x, last.y - start.y) > 3) el.dataset.dragged = '1';
      draggingId = null;
      store.patch(posPath, { x: last.x, y: last.y });
      store.del(`campaigns/${ctx.cid}/drags/${sessionId}`);
      ctx.onDragUpdate?.({ active: false });
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    return true;
  }

  function streamPosition(posPath, start, w) {
    store.patch(posPath, { x: w.x, y: w.y });
    store.write(`campaigns/${ctx.cid}/drags/${sessionId}`, {
      startX: start.x, startY: start.y, x: w.x, y: w.y,
      charId: draggingId,
    });
  }

  return { renderCharacters, dragHandler, monstersEl, charsEl, showTip, hideTip };
}
