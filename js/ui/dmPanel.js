import * as store from '../store.js';
import { ctx, toast } from '../campaign.js';
import { processMapImage } from '../imageUtil.js';
import { openCalibration } from '../tools/calibrate.js';
import { esc } from './esc.js';

export function showDmPanel(rail) {
  rail.closeExclusive();
  rail.showPopover(async p => {
    const maps = (await store.readOnce(`campaigns/${ctx.cid}/maps`)) || {};
    p.innerHTML = `<h3>Maps</h3><div id="mapList"></div>
      <label>Upload new map (PNG/JPG)</label><input id="mapFile" type="file" accept="image/*">`;
    const list = p.querySelector('#mapList');
    for (const [id, m] of Object.entries(maps)) {
      const row = document.createElement('div');
      row.innerHTML = `<span>${esc(m.name)}</span>
        <button data-act="activate">${ctx.activeMapId === id ? '✓ active' : 'activate'}</button>
        <button data-act="calibrate">grid</button>`;
      row.querySelector('[data-act=activate]').onclick =
        () => store.write(`campaigns/${ctx.cid}/activeMapId`, id);
      row.querySelector('[data-act=calibrate]').onclick =
        () => openCalibration(rail, id, m);
      list.appendChild(row);
    }
    p.querySelector('#mapFile').onchange = async e => {
      try {
        const file = e.target.files[0]; e.target.value = '';
        const image = await processMapImage(file);
        const mapId = crypto.randomUUID().replaceAll('-', '');
        await store.write(`campaigns/${ctx.cid}/maps/${mapId}`, {
          name: file.name.replace(/\.[^.]+$/, ''),
          image,
          // Grid overlay starts hidden — calibration forces lines locally;
          // the DM opts into showing it to everyone via the tune checkbox.
          grid: { cellPx: 50, offX: 0, offY: 0, color: '#000000', opacity: 0.5, visible: false },
        });
        await store.write(`campaigns/${ctx.cid}/activeMapId`, mapId);
        const m = await store.readOnce(`campaigns/${ctx.cid}/maps/${mapId}`);
        openCalibration(rail, mapId, m);
      } catch (err) { toast(err.message); }
    };

    // --- roster ---
    const chars = (await store.readOnce(`campaigns/${ctx.cid}/characters`)) || {};
    const roster = document.createElement('div');
    roster.innerHTML = '<h3 style="margin-top:14px">Characters</h3>';
    for (const [id, ch] of Object.entries(chars)) {
      const row = document.createElement('div');
      row.innerHTML = `<span>${esc(ch.name)}${ch.hidden ? ' (hidden)' : ''}</span>
        <button data-a="hide">${ch.hidden ? 'unhide' : 'hide'}</button>
        <button data-a="del">delete</button>`;
      row.querySelector('[data-a=hide]').onclick = async () => {
        ch.hidden = !ch.hidden;
        await store.patch(`campaigns/${ctx.cid}/characters/${id}`,
          ch.hidden ? { hidden: true } : { hidden: null });
        // refresh the row in place — no popover reopen needed
        row.querySelector('span').innerHTML = `${esc(ch.name)}${ch.hidden ? ' (hidden)' : ''}`;
        row.querySelector('[data-a=hide]').textContent = ch.hidden ? 'unhide' : 'hide';
      };
      row.querySelector('[data-a=del]').onclick = () => {
        if (confirm(`Permanently delete ${ch.name}?`))
          store.del(`campaigns/${ctx.cid}/characters/${id}`);
      };
      roster.appendChild(row);
    }
    p.appendChild(roster);

    // --- danger zone ---
    const danger = document.createElement('div');
    danger.innerHTML = `<h3 style="margin-top:14px;color:#e07070">Danger zone</h3>
      <button id="delCampaign" style="background:#7a2a2a;color:#fff">Delete campaign</button>`;
    danger.querySelector('#delCampaign').onclick = async () => {
      const meta = await store.readOnce(`campaigns/${ctx.cid}/meta`);
      const typed = prompt(`This permanently deletes ALL campaign data from Firebase.\nType the campaign name to confirm: ${meta.name}`);
      if (typed === meta.name) {
        await store.del(`campaigns/${ctx.cid}`);
        location.hash = '';
      }
    };
    p.appendChild(danger);
  });
}
