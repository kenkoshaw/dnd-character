import * as store from '../store.js';
import { ctx, toast } from '../campaign.js';
import { processMapImage } from '../imageUtil.js';
import { openCalibration } from '../tools/calibrate.js';
import { esc } from './esc.js';

export function showDmPanel(rail) {
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
        const file = e.target.files[0];
        const image = await processMapImage(file);
        const mapId = crypto.randomUUID().replaceAll('-', '');
        await store.write(`campaigns/${ctx.cid}/maps/${mapId}`, {
          name: file.name.replace(/\.[^.]+$/, ''),
          image,
          grid: { cellPx: 50, offX: 0, offY: 0, color: '#000000', opacity: 0.4, visible: true },
        });
        await store.write(`campaigns/${ctx.cid}/activeMapId`, mapId);
        const m = await store.readOnce(`campaigns/${ctx.cid}/maps/${mapId}`);
        openCalibration(rail, mapId, m);
      } catch (err) { toast(err.message); }
    };
  });
}
