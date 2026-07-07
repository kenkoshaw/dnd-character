import * as store from '../store.js';
import { ctx, toast } from '../campaign.js';
import { processTokenImage } from '../imageUtil.js';
import { screenToWorld } from '../geometry.js';
import { esc } from '../ui/esc.js';

// getLib: () => current monster library object (campaign.js owns the subscription)
export function createMonsterTool(rail, getLib) {
  const library = () => getLib() || {};

  function showPopover() {
    rail.showPopover(p => {
      p.innerHTML = `<h3>Monsters</h3><div class="thumb-grid" id="monGrid"></div>
        <label>Add monster PNG</label><input id="monFile" type="file" accept="image/*">
        <input id="monLabel" placeholder="Monster name">
        <input id="monHp" type="number" placeholder="Max HP" min="1">
        <button class="primary" id="monAdd">Add to library</button>`;
      const grid = p.querySelector('#monGrid');
      for (const [libId, lib] of Object.entries(library())) {
        const img = document.createElement('img');
        img.src = lib.imageB64;
        img.title = `${lib.label} (${lib.defaultMaxHp} HP) — click to place`;
        img.onclick = () => spawn(libId, lib);
        grid.appendChild(img);
      }
      p.querySelector('#monAdd').onclick = async () => {
        const file = p.querySelector('#monFile').files[0];
        const label = p.querySelector('#monLabel').value.trim();
        const maxHp = Number(p.querySelector('#monHp').value);
        if (!file || !label || !(maxHp > 0)) { toast('Image, name and max HP required.'); return; }
        try {
          const { b64 } = await processTokenImage(file);
          await store.write(`campaigns/${ctx.cid}/monsterLibrary/${crypto.randomUUID().replaceAll('-', '')}`,
            { imageB64: b64, label, defaultMaxHp: maxHp });
          showPopover(); // refresh grid
        } catch (e) { toast(e.message); }
      };
    });
  }

  // Spawn at the center of the DM's current view, clamped to map bounds.
  function spawn(libId, lib) {
    if (!ctx.activeMapId) { toast('No active map.'); return; }
    const vp = document.querySelector('#viewport').getBoundingClientRect();
    const c = screenToWorld(vp.width / 2, vp.height / 2, ctx.world.view);
    const x = Math.max(0, Math.min(ctx.mapSize.w, c.x));
    const y = Math.max(0, Math.min(ctx.mapSize.h, c.y));
    store.write(`campaigns/${ctx.cid}/maps/${ctx.activeMapId}/monsters/${crypto.randomUUID().replaceAll('-', '')}`,
      { libRef: libId, size: 1, x, y, hp: { cur: lib.defaultMaxHp, max: lib.defaultMaxHp }, hpVisible: false });
  }

  // Right-click context menu + click-to-edit HP (DM only)
  function bindTokenMenus(viewport) {
    viewport.addEventListener('contextmenu', e => {
      const el = e.target.closest('.monster');
      if (!el || ctx.role?.kind !== 'dm' || rail !== ctx.rail) return;
      e.preventDefault();
      menu(e.clientX, e.clientY, el.dataset.monsterId);
    });
    viewport.addEventListener('click', e => {
      const el = e.target.closest('.monster');
      if (!el || ctx.role?.kind !== 'dm' || rail !== ctx.rail || rail.getTool()) return;
      if (el.dataset.dragged) { delete el.dataset.dragged; return; } // was a drag, not a click
      hpPanel(el.dataset.monsterId);
    });
  }

  async function menu(x, y, id) {
    document.querySelector('.ctx-menu')?.remove();
    const base = `campaigns/${ctx.cid}/maps/${ctx.activeMapId}/monsters/${id}`;
    const m = await store.readOnce(base);
    if (!m) return;
    const div = document.createElement('div');
    div.className = 'ctx-menu';
    div.style.left = `${x}px`; div.style.top = `${y}px`;
    div.innerHTML = `<div data-a="copy">Copy</div><div data-a="delete">Delete</div>
      <div data-a="s0.5">Size ¼ cell</div><div data-a="s1">Size 1×1</div><div data-a="s2">Size 2×2</div>`;
    document.body.appendChild(div);
    const close = () => div.remove();
    setTimeout(() => addEventListener('click', close, { once: true }));
    div.onclick = ev => {
      const a = ev.target.dataset.a;
      if (a === 'copy') {
        const lib = library()[m.libRef];
        const maxHp = lib?.defaultMaxHp ?? m.hp.max;
        store.write(`campaigns/${ctx.cid}/maps/${ctx.activeMapId}/monsters/${crypto.randomUUID().replaceAll('-', '')}`,
          { ...m,
            x: Math.max(0, Math.min(ctx.mapSize.w, m.x + ctx.grid.cellPx / 2)),
            y: Math.max(0, Math.min(ctx.mapSize.h, m.y + ctx.grid.cellPx / 2)),
            hp: { cur: maxHp, max: maxHp } });
      }
      if (a === 'delete') store.del(base);
      if (a?.startsWith('s')) store.patch(base, { size: Number(a.slice(1)) });
      close();
    };
  }

  function hpPanel(id) {
    const base = `campaigns/${ctx.cid}/maps/${ctx.activeMapId}/monsters/${id}`;
    store.readOnce(base).then(m => {
      if (!m) return;
      const lib = library()[m.libRef];
      rail.showPopover(p => {
        p.innerHTML = `<h3>${esc(lib?.label || 'Monster')} HP</h3>
          <label>Current</label><input id="hpCur" type="number" value="${m.hp.cur}">
          <label>Max</label><input id="hpMax" type="number" value="${m.hp.max}">
          <label><input id="hpVis" type="checkbox" ${m.hpVisible ? 'checked' : ''} style="width:auto">
          HP visible to players</label>
          <button class="primary" id="hpSave">Save</button>`;
        p.querySelector('#hpSave').onclick = async () => {
          const cur = Number(p.querySelector('#hpCur').value);
          const max = Number(p.querySelector('#hpMax').value);
          if (!(max > 0)) { toast('Max HP must be positive.'); return; }
          await store.patch(base, { hp: { cur, max }, hpVisible: p.querySelector('#hpVis').checked });
          if (m.libRef && max !== m.hp.max) // future copies of this type inherit the new max
            await store.patch(`campaigns/${ctx.cid}/monsterLibrary/${m.libRef}`, { defaultMaxHp: max });
          rail.closePopover();
        };
      });
    });
  }

  return { showPopover, bindTokenMenus };
}
