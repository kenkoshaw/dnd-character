import { calibrate, cellOf } from '../geometry.js';
import { allCellKeys } from '../fogLogic.js';
import * as store from '../store.js';
import { ctx } from '../campaign.js';

// Full calibration flow for one map: place two points (pan/zoom stays free) →
// OK → tile counts → fine-tune → grid style → click start tile → save.
// Runs as a popover + a click-vs-drag world handler.
// onDone (optional) fires after a successful save — the setup wizard chains on it.
export function openCalibration(rail, mapId, map, onDone) {
  let clicks = [];
  let grid = { cellPx: 50, offX: 0, offY: 0, color: '#000000', opacity: 0.4, visible: false, ...(map.grid || {}) };
  let startTile = map.startTile || null;
  let mode = 'clicks'; // 'clicks' → 'squares' → 'tune' → 'startTile'
  let active = true;

  // Calibrate against the bare map: hide the fog wash for the duration.
  const fogCanvas = document.querySelector('#fogCanvas');
  if (fogCanvas) fogCanvas.style.display = 'none';

  // Grid lines are forced visible locally while calibrating, whatever the
  // synced visible flag says — you can't align lines you can't see.
  const redraw = () => ctx.layers.grid.draw({ ...grid, visible: true }, map.image.w, map.image.h);
  redraw();

  // ---- point markers ----
  const markers = [];
  function renderMarkers() {
    markers.forEach(m => m.remove());
    markers.length = 0;
    for (const c of clicks) {
      const m = document.createElement('div');
      m.className = 'cal-marker';
      m.style.left = `${c.x}px`;
      m.style.top = `${c.y}px`;
      ctx.world.el.appendChild(m);
      markers.push(m);
    }
  }
  function clearMarkers() { clicks = []; renderMarkers(); }
  function placeMarker(p) {
    if (clicks.length < 2) clicks.push(p);
    else { // a third click adjusts the nearest existing point
      const d0 = Math.hypot(p.x - clicks[0].x, p.y - clicks[0].y);
      const d1 = Math.hypot(p.x - clicks[1].x, p.y - clicks[1].y);
      clicks[d0 <= d1 ? 0 : 1] = p;
    }
    renderMarkers();
    render();
  }

  // Click-vs-drag: pointerdown falls through (return false) so pan/zoom keep
  // working during setup; a release within 5px of the press places a point.
  const onDown = e => {
    if (!active || (mode !== 'clicks' && mode !== 'startTile')) return false;
    const sx = e.clientX, sy = e.clientY;
    const up = ev => {
      removeEventListener('pointerup', up);
      if (!active) return;
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 5) return; // was a pan
      const w = ctx.world.toWorld(ev);
      if (mode === 'clicks') placeMarker(w);
      else { startTile = cellOf(w.x, w.y, grid); render(); }
    };
    addEventListener('pointerup', up);
    return false;
  };
  const unregister = ctx.world.registerHandler(onDown);
  const cancel = () => {
    if (!active) return;
    active = false;
    unregister();
    clearMarkers();
    if (fogCanvas) fogCanvas.style.display = '';
    // Repaint synced state so an abandoned calibration's preview doesn't linger.
    if (ctx.grid && ctx.mapSize.w) {
      ctx.layers.grid.draw(ctx.grid, ctx.mapSize.w, ctx.mapSize.h);
      ctx.layers.fog.draw(ctx.revealed, ctx.fogPreview || null);
    }
  };
  rail.setExclusive(cancel); // closes any previously-open calibration too

  function render() {
    rail.showPopover(p => {
      if (mode === 'clicks') {
        p.innerHTML = `<h3>Calibrate grid</h3>
          <p class="help">Click two corners where grid lines cross — far apart is more
          accurate, diagonal is fine. Drag to pan and pinch/scroll to zoom as usual;
          a third click moves the nearest marker.</p>
          <p class="help"><b>Points placed: ${clicks.length} / 2</b></p>
          <button class="primary" id="calOk" ${clicks.length === 2 ? '' : 'disabled'}>OK</button>
          <button id="calSkip">Skip (keep current)</button>`;
        p.querySelector('#calOk').onclick = () => { mode = 'squares'; render(); };
        p.querySelector('#calSkip').onclick = () => { clearMarkers(); mode = 'tune'; render(); };
        return;
      }
      if (mode === 'squares') {
        p.innerHTML = `<h3>Tiles between your points</h3>
          <p class="help">Count the grid squares between the two markers along each
          direction. Leave one blank if the points share a row or column.</p>
          <label for="calNx">Tiles across (X)</label><input id="calNx" type="number" min="0">
          <label for="calNy">Tiles down (Y)</label><input id="calNy" type="number" min="0">
          <p class="err" id="calErr"></p>
          <button class="primary" id="calGo">Compute</button>
          <button id="calBack">Back</button>`;
        p.querySelector('#calGo').onclick = () => {
          // calibrate returns null when neither axis is usable
          const nx = Number(p.querySelector('#calNx').value);
          const ny = Number(p.querySelector('#calNy').value);
          const result = calibrate(clicks[0], clicks[1], nx, ny);
          if (!result) {
            p.querySelector('#calErr').textContent = 'Enter the tile count for at least one axis the points actually span.';
            return;
          }
          grid = { ...grid, ...result };
          clearMarkers();
          mode = 'tune';
          redraw(); render();
        };
        p.querySelector('#calBack').onclick = () => { mode = 'clicks'; render(); };
        return;
      }
      if (mode === 'tune') { renderTune(p); return; }
      p.innerHTML = `<h3>Choose the starting tile</h3>
        <p class="help">Click the square where new characters should appear.
        Dragging still pans the map.</p>
        <p class="help"><b>${startTile ? `Start tile: column ${startTile.col}, row ${startTile.row}` : 'No tile chosen yet.'}</b></p>
        <button class="primary" id="calSave" ${startTile ? '' : 'disabled'}>Save map setup</button>`;
      p.querySelector('#calSave').onclick = save;
    });
  }

  function renderTune(p) {
    p.innerHTML = `<h3>Fine-tune grid</h3>
      <label>Cell size (px)</label><input id="tCell" type="number" step="0.1" min="1" value="${grid.cellPx.toFixed(1)}">
      <label>Offset X</label><input id="tOffX" type="range" min="0" max="${grid.cellPx}" step="0.5" value="${grid.offX}">
      <label>Offset Y</label><input id="tOffY" type="range" min="0" max="${grid.cellPx}" step="0.5" value="${grid.offY}">
      <label>Line color</label><input id="tColor" type="color" value="${grid.color}">
      <label>Opacity</label><input id="tOp" type="range" min="0" max="1" step="0.05" value="${grid.opacity}">
      <label><input id="tVis" type="checkbox" ${grid.visible ? 'checked' : ''} style="width:auto"> grid visible to everyone</label>
      <button id="tRedo">Redo points</button><button class="primary" id="tNext">Next: start tile</button>`;
    const bind = (sel, key, num = true) => p.querySelector(sel).oninput = e => {
      grid[key] = num ? Number(e.target.value) : e.target.value; redraw();
    };
    // cellPx clamped ≥ 1: typing bypasses the min attribute, and cellPx <= 0
    // would corrupt every cell/fog computation campaign-wide
    p.querySelector('#tCell').oninput = e => { grid.cellPx = Math.max(1, Number(e.target.value) || 1); redraw(); };
    bind('#tOffX', 'offX'); bind('#tOffY', 'offY');
    bind('#tColor', 'color', false); bind('#tOp', 'opacity');
    p.querySelector('#tVis').onchange = e => { grid.visible = e.target.checked; redraw(); };
    p.querySelector('#tRedo').onclick = () => { clearMarkers(); mode = 'clicks'; render(); };
    p.querySelector('#tNext').onclick = () => { mode = 'startTile'; render(); };
  }

  async function save() {
    const updates = { grid, startTile };
    if (!map.fogInit) {
      // First-time setup: start with the whole map revealed — the DM paints
      // fog ON afterwards. fogInit stops re-calibration wiping painted fog.
      updates.fog = Object.fromEntries(
        allCellKeys(grid, map.image.w, map.image.h).map(k => [k, true]));
      updates.fogInit = true;
    }
    await store.patch(`campaigns/${ctx.cid}/maps/${mapId}`, updates);
    rail.clearExclusive(cancel);
    cancel();
    rail.closePopover();
    onDone?.();
  }

  render();
}
