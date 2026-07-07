import * as store from '../store.js';
import { ctx, toast } from '../campaign.js';
import { cropCircle } from './cropper.js';
import { esc } from './esc.js';

export function showCharacterPanel(rail, charId) {
  const ch = ctx.characters?.[charId];
  if (!ch) return;
  rail.showPopover(p => {
    p.innerHTML = `<h3>Your character</h3>
      <label>Name</label><input id="cpName" value="${esc(ch.name)}">
      <label>Walk speed (ft)</label><input id="cpSpeed" type="number" step="5" min="0" value="${ch.speed}">
      <label>Replace image</label><input id="cpImg" type="file" accept="image/*">
      <button class="primary" id="cpSave">Save</button>`;
    p.querySelector('#cpSave').onclick = async () => {
      const updates = {
        name: p.querySelector('#cpName').value.trim() || ch.name,
        speed: Math.max(0, Number(p.querySelector('#cpSpeed').value) || ch.speed),
      };
      try {
        const file = p.querySelector('#cpImg').files[0];
        if (file) {
          const b64 = await cropCircle(file);
          if (!b64) return; // crop cancelled — keep editing
          updates.imageB64 = b64;
        }
        await store.patch(`campaigns/${ctx.cid}/characters/${charId}`, updates);
        rail.closePopover();
      } catch (e) { toast(e.message); }
    };
  });
}
