import { firebaseConfig } from './config.js';
import * as store from './store.js';
import { showLanding } from './ui/landing.js';

store.init(firebaseConfig);

async function route() {
  const root = document.getElementById('app');
  root.innerHTML = '';
  const m = location.hash.match(/^#\/c\/([A-Za-z0-9]+)/);
  if (!m) { showLanding(root); return; }
  const cid = m[1];
  const meta = await store.readOnce(`campaigns/${cid}/meta`);
  if (!meta) {
    root.innerHTML = `<div class="landing"><h1>Campaign not found</h1>
      <button onclick="location.hash=''">Create one</button></div>`;
    return;
  }
  const { enterCampaign } = await import('./campaign.js');
  enterCampaign(root, cid, meta);
}

window.addEventListener('hashchange', route);
route();
