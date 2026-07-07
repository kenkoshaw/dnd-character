// All Firebase access lives here. Everything else imports store, never firebase.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getDatabase, ref, onValue, set, update, remove, get, onDisconnect,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

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

// Arm presence cleanup for an arbitrary path (e.g. in-flight drag streams):
// if this tab dies, the server deletes the node.
export function dropOnDisconnect(path) {
  onDisconnect(ref(db, path)).remove();
}

// Firebase built-in connectivity flag.
export function onConnectionChange(cb) {
  return onValue(ref(db, '.info/connected'), snap => cb(!!snap.val()));
}
