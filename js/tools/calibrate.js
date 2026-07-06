import { calibrate, cellOf } from '../geometry.js';
import * as store from '../store.js';
import { ctx } from '../campaign.js';

// Full calibration flow for one map: two clicks → squares-apart → fine-tune →
// grid style → click start tile → save. Runs as a popover + world click capture.
export function openCalibration(rail, mapId, map) {
  let clicks = [];
  let grid = { cellPx: 50, offX: 0, offY: 0, color: '#000000', opacity: 0.4, visible: true, ...(map.grid || {}) };
  let startTile = map.startTile || null;
  let mode = 'clicks'; // 'clicks' → 'tune' → 'startTile'
  let active = true;

  const redraw = () => ctx.layers.grid.draw(grid, map.image.w, map.image.h);
  redraw();

  const clickHandler = e => {
    if (!active) return false;
    if (mode === 'clicks') {
      clicks.push(ctx.world.toWorld(e));
      if (clicks.length === 2) { mode = 'tune'; render(); }
      else render();
      return true;
    }
    if (mode === 'startTile') {
      const w = ctx.world.toWorld(e);
      startTile = cellOf(w.x, w.y, grid);
      render();
      return true;
    }
    return false;
  };
  const unregister = ctx.world.registerHandler(clickHandler);
  const cancel = () => { active = false; unregister(); };
  rail.setExclusive(cancel); // closes any previously-open calibration too

  function render() {
    rail.showPopover(p => {
      if (mode === 'clicks') {
        p.innerHTML = `<h3>Calibrate grid</h3>
          <p style="font-size:12px;color:#aaa">Click two grid intersections on the map,
          along one row or column. Clicks: ${clicks.length}/2</p>
          <button id="calSkip">Skip (keep current)</button>`;
        p.querySelector('#calSkip').onclick = () => { mode = 'tune'; render(); };
        return;
      }
      if (mode === 'tune') {
        if (clicks.length === 2) {
          p.innerHTML = `<h3>Squares between clicks?</h3><input id="calN" type="number" value="4" min="1">
            <p class="err" id="calErr"></p>
            <button class="primary" id="calGo">Compute</button>`;
          p.querySelector('#calGo').onclick = () => {
            // calibrate returns null on degenerate input (n < 1, identical clicks)
            const result = calibrate(clicks[0], clicks[1], Number(p.querySelector('#calN').value));
            if (!result) {
              p.querySelector('#calErr').textContent = 'Invalid input — click two distinct intersections, squares ≥ 1.';
              clicks = []; mode = 'clicks'; render();
              return;
            }
            grid = { ...grid, ...result };
            clicks = [];
            redraw(); renderTune(p);
          };
        } else renderTune(p);
        return;
      }
      p.innerHTML = `<h3>Click the starting tile</h3>
        <p style="font-size:12px;color:#aaa">${startTile ? `Start: ${startTile.col}, ${startTile.row}` : 'Click a cell on the map.'}</p>
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
      <button id="tRedo">Redo clicks</button><button class="primary" id="tNext">Next: start tile</button>`;
    const bind = (sel, key, num = true) => p.querySelector(sel).oninput = e => {
      grid[key] = num ? Number(e.target.value) : e.target.value; redraw();
    };
    // cellPx clamped ≥ 1: typing bypasses the min attribute, and cellPx <= 0
    // would corrupt every cell/fog computation campaign-wide
    p.querySelector('#tCell').oninput = e => { grid.cellPx = Math.max(1, Number(e.target.value) || 1); redraw(); };
    bind('#tOffX', 'offX'); bind('#tOffY', 'offY');
    bind('#tColor', 'color', false); bind('#tOp', 'opacity');
    p.querySelector('#tVis').onchange = e => { grid.visible = e.target.checked; redraw(); };
    p.querySelector('#tRedo').onclick = () => { clicks = []; mode = 'clicks'; render(); };
    p.querySelector('#tNext').onclick = () => { mode = 'startTile'; render(); };
  }

  async function save() {
    await store.patch(`campaigns/${ctx.cid}/maps/${mapId}`, { grid, startTile });
    rail.clearExclusive(cancel);
    cancel();
    rail.closePopover();
  }

  render();
}
