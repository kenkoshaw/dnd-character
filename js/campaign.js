import * as store from './store.js';
import { sessionId, kickReason } from './session.js';
import { showRolePopup } from './ui/rolePopup.js';

// Shared per-campaign context, extended by later tasks.
export const ctx = {
  cid: null, role: null, // {kind:'dm'} | {kind:'char', charId}
  grid: null, revealed: new Set(), activeMapId: null, mapSize: { w: 0, h: 0 },
  characters: {},
};

export function enterCampaign(root, cid, meta) {
  ctx.cid = cid;
  document.title = meta.name;
  const viewport = document.createElement('div');
  viewport.id = 'viewport';
  root.appendChild(viewport);
  // Task 9 mounts world/map layers into viewport here.
  pickRole(root);
}

function pickRole(root) {
  ctx.role = null;
  showRolePopup(root, ctx.cid, role => {
    ctx.role = role;
    if (role.kind === 'char') watchKick(root, role.charId);
    startUi(root, role); // grows in later tasks
  });
}

let kickUnsub = null;
function watchKick(root, charId) {
  kickUnsub?.(); // never two kick watchers
  const unsub = store.sub(`campaigns/${ctx.cid}/characters/${charId}`, ch => {
    if (ctx.role?.kind !== 'char' || ctx.role.charId !== charId) { unsub(); return; }
    if (kickReason(ch, sessionId)) { unsub(); toast('You were removed — pick a role.'); pickRole(root); }
  });
  kickUnsub = unsub;
}

export async function releaseRole(root) {
  // Clear the role BEFORE the release write: the removal echoes synchronously
  // through the local watchKick subscription, which must see no active role
  // (else it fires a spurious kick toast and a second stacked popup).
  const prev = ctx.role;
  ctx.role = null;
  if (prev?.kind === 'dm') await store.release(`campaigns/${ctx.cid}/dmClaimedBy`);
  if (prev?.kind === 'char') await store.release(`campaigns/${ctx.cid}/characters/${prev.charId}/claimedBy`);
  pickRole(root);
}

function startUi(root, role) {
  // Placeholder until Task 10 adds the rail; shows current role + release.
  document.querySelector('#roleTag')?.remove();
  const tag = document.createElement('div');
  tag.id = 'roleTag';
  tag.style.cssText = 'position:fixed;top:10px;right:10px;z-index:60';
  tag.innerHTML = `<button id="releaseBtn">${role.kind === 'dm' ? 'DM' : 'release role'}</button>`;
  document.body.appendChild(tag);
  tag.querySelector('#releaseBtn').onclick = () => releaseRole(root);
}

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
