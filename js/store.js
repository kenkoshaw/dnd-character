// All Firebase access lives here. Everything else imports store, never firebase.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getDatabase, ref, onValue, set, update, remove, get, runTransaction, onDisconnect,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { decideClaim, sessionId } from './session.js';

let db;

export function init(config) { if (!db) db = getDatabase(initializeApp(config)); }

// Subscribe; returns unsubscribe. cb receives plain value (null if absent).
export function sub(path, cb) {
  return onValue(ref(db, path), snap => cb(snap.val()));
}

export const write = (path, val) => set(ref(db, path), val);
export const patch = (path, obj) => update(ref(db, path), obj);
export const del = (path) => remove(ref(db, path));
export const readOnce = async (path) => (await get(ref(db, path))).val();

// Atomically claim a role slot; auto-release on disconnect. True if won.
// Network/permission failures also return false — callers treat any false
// as "you don't have the slot" (the reconnect banner covers connectivity).
export async function claim(path) {
  const r = ref(db, path);
  try {
    const res = await runTransaction(r, cur => decideClaim(cur, sessionId));
    if (res.committed) onDisconnect(r).remove();
    return res.committed;
  } catch {
    return false;
  }
}

// Release a claimed slot. Narrow accepted race: if this tab disconnects in the
// ~ms before cancel() reaches the server, the stale onDisconnect from claim()
// can wipe a slot someone else just took. Self-heals: the kick watcher bounces
// them to the role popup and they re-claim.
export async function release(path) {
  const r = ref(db, path);
  await onDisconnect(r).cancel();
  await remove(r);
}

// Firebase built-in connectivity flag.
export function onConnectionChange(cb) {
  return onValue(ref(db, '.info/connected'), snap => cb(!!snap.val()));
}
