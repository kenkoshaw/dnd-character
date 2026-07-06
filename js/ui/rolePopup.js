import * as store from '../store.js';
import { sessionId } from '../session.js';
import { processTokenImage } from '../imageUtil.js';
import { esc } from './esc.js';

// onRole({ kind: 'dm' }) or onRole({ kind: 'char', charId })
export function showRolePopup(root, cid, onRole) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal">
    <h2>Choose your role</h2>
    <div id="roleList"></div>
    <h2 style="margin-top:16px">New character</h2>
    <input id="ncName" placeholder="Character name">
    <input id="ncSpeed" type="number" value="30" min="0" step="5" placeholder="Walk speed (ft)">
    <input id="ncImg" type="file" accept="image/*">
    <button class="primary" id="ncCreate">Create &amp; play</button>
    <p class="err" id="roleErr"></p>
  </div>`;
  root.appendChild(wrap);
  const err = wrap.querySelector('#roleErr');

  let chars = {}, dmClaimed = null;
  const unsubs = [
    store.sub(`campaigns/${cid}/characters`, v => { chars = v || {}; renderList(); }),
    store.sub(`campaigns/${cid}/dmClaimedBy`, v => { dmClaimed = v; renderList(); }),
  ];

  function renderList() {
    const list = wrap.querySelector('#roleList');
    list.innerHTML = '';
    list.appendChild(row('👑', 'Dungeon Master', !dmClaimed, () => take('dm', `campaigns/${cid}/dmClaimedBy`)));
    for (const [id, ch] of Object.entries(chars)) {
      const free = !ch.claimedBy;
      const label = esc(ch.name) + (ch.hidden ? ' (inactive)' : '') + (ch.speed ? ` · ${ch.speed} ft` : '');
      list.appendChild(row(ch.imageB64, label, free, () => take('char', `campaigns/${cid}/characters/${id}/claimedBy`, id)));
    }
  }

  function row(img, label, free, onClick) {
    const div = document.createElement('div');
    div.className = `role-row ${free ? 'free' : 'taken'}`;
    div.innerHTML = (img && img.startsWith('data:') ? `<img src="${img}">` : `<span>${img}</span>`)
      + `<span>${label}</span><span style="margin-left:auto">${free ? '' : 'taken'}</span>`;
    if (free) div.onclick = onClick;
    return div;
  }

  async function take(kind, path, charId) {
    err.textContent = '';
    try {
      if (!(await store.claim(path))) { err.textContent = 'Already claimed — pick another.'; return; }
      if (kind === 'char' && chars[charId]?.hidden) {
        await store.write(`campaigns/${cid}/characters/${charId}/hidden`, null); // claiming un-hides
      }
      close();
      onRole(kind === 'dm' ? { kind } : { kind, charId });
    } catch (e) { err.textContent = e.message; }
  }

  wrap.querySelector('#ncCreate').onclick = async () => {
    err.textContent = '';
    const name = wrap.querySelector('#ncName').value.trim();
    const speed = Number(wrap.querySelector('#ncSpeed').value);
    const file = wrap.querySelector('#ncImg').files[0];
    if (!name || !file) { err.textContent = 'Name and image required.'; return; }
    try {
      const { b64 } = await processTokenImage(file);
      const charId = crypto.randomUUID().replaceAll('-', '');
      await store.write(`campaigns/${cid}/characters/${charId}`,
        { name, speed, imageB64: b64, claimedBy: sessionId });
      // The write above sets claimedBy for instant UI; this claim() transaction
      // exists to register the onDisconnect presence release, not for race-safety.
      const won = await store.claim(`campaigns/${cid}/characters/${charId}/claimedBy`);
      if (!won) {
        // No presence hook exists yet for this node — delete it or it's stuck
        // "taken" forever with a dead owner.
        await store.del(`campaigns/${cid}/characters/${charId}`);
        err.textContent = 'Claim failed, try again.';
        return;
      }
      close();
      onRole({ kind: 'char', charId });
    } catch (e) { err.textContent = e.message; }
  };

  function close() { unsubs.forEach(u => u()); wrap.remove(); }
}
