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

function watchKick(root, charId) {
  const unsub = store.sub(`campaigns/${ctx.cid}/characters/${charId}`, ch => {
    if (ctx.role?.kind !== 'char' || ctx.role.charId !== charId) { unsub(); return; }
    if (kickReason(ch, sessionId)) { unsub(); toast('You were removed — pick a role.'); pickRole(root); }
  });
}

export async function releaseRole(root) {
  if (ctx.role?.kind === 'dm') await store.release(`campaigns/${ctx.cid}/dmClaimedBy`);
  if (ctx.role?.kind === 'char') await store.release(`campaigns/${ctx.cid}/characters/${ctx.role.charId}/claimedBy`);
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
