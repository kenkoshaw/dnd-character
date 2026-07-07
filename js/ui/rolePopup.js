import * as store from '../store.js';
import { processTokenImage } from '../imageUtil.js';
import { esc } from './esc.js';
import { ctx } from '../campaign.js';

// onRole({ kind: 'dm' }) or onRole({ kind: 'char', charId })
// Roles are freely selectable — no claims or locks. A role only scopes what
// actions this browser can take; two tabs picking the same character is fine.
export function showRolePopup(root, cid, onRole) {
  root.querySelector('.modal-backdrop')?.remove(); // never stack two popups
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal">
    <h2>Choose your role</h2>
    <div id="roleList"></div>
    <h2 style="margin-top:16px">New character</h2>
    <label for="ncName">Character name</label>
    <input id="ncName">
    <label for="ncSpeed">Walk speed (ft)</label>
    <input id="ncSpeed" type="number" min="0" step="5" placeholder="30">
    <label for="ncImg">Token image</label>
    <input id="ncImg" type="file" accept="image/*">
    <button class="primary" id="ncCreate">Create &amp; play</button>
    <p class="err" id="roleErr"></p>
  </div>`;
  root.appendChild(wrap);
  const err = wrap.querySelector('#roleErr');

  let chars = {};
  const unsubs = [
    store.sub(`campaigns/${cid}/characters`, v => { chars = v || {}; renderList(); }),
  ];
  ctx.unsubs?.push(...unsubs); // popup subs die with the campaign if never closed

  function renderList() {
    const list = wrap.querySelector('#roleList');
    list.innerHTML = '';
    list.appendChild(row('👑', 'Dungeon Master', () => choose({ kind: 'dm' })));
    for (const [id, ch] of Object.entries(chars)) {
      if (ch.hidden) continue; // DM re-activates hidden characters via Settings
      const label = esc(ch.name) + (ch.speed ? ` · ${ch.speed} ft` : '');
      list.appendChild(row(ch.imageB64, label, () => choose({ kind: 'char', charId: id })));
    }
  }

  function row(img, label, onClick) {
    const div = document.createElement('div');
    div.className = 'role-row free';
    div.innerHTML = (img && img.startsWith('data:') ? `<img src="${img}">` : `<span>${img}</span>`)
      + `<span>${label}</span>`;
    div.onclick = onClick;
    return div;
  }

  function choose(role) {
    close();
    onRole(role);
  }

  wrap.querySelector('#ncCreate').onclick = async () => {
    err.textContent = '';
    const name = wrap.querySelector('#ncName').value.trim();
    const speedRaw = Number(wrap.querySelector('#ncSpeed').value);
    const speed = Number.isFinite(speedRaw) && speedRaw > 0 ? speedRaw : 30; // blank → 5e default
    const file = wrap.querySelector('#ncImg').files[0];
    if (!name || !file) { err.textContent = 'Name and image required.'; return; }
    try {
      const { b64 } = await processTokenImage(file);
      const charId = crypto.randomUUID().replaceAll('-', '');
      await store.write(`campaigns/${cid}/characters/${charId}`, { name, speed, imageB64: b64 });
      choose({ kind: 'char', charId });
    } catch (e) { err.textContent = e.message; }
  };

  function close() { unsubs.forEach(u => u()); wrap.remove(); }
}
