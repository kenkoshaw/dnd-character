import * as store from '../store.js';

export function showLanding(root) {
  root.innerHTML = `
    <div class="landing">
      <h1>D&amp;D Campaign Map</h1>
      <input id="sitePw" type="password" placeholder="Site password">
      <input id="campName" placeholder="Campaign name">
      <button id="createBtn">Create campaign</button>
      <p class="err" id="landErr"></p>
    </div>`;
  const pwEl = root.querySelector('#sitePw');
  pwEl.value = localStorage.getItem('vtt_site_pw') || '';

  root.querySelector('#createBtn').onclick = async () => {
    const pw = pwEl.value.trim();
    const name = root.querySelector('#campName').value.trim();
    const err = root.querySelector('#landErr');
    if (!pw || !name) { err.textContent = 'Password and campaign name required.'; return; }
    localStorage.setItem('vtt_site_pw', pw);
    const cid = crypto.randomUUID().replaceAll('-', '');
    try {
      // Creation rule validates meta/pw server-side in this single set();
      // deleted immediately after so the site password never sits readable
      // in campaign data.
      await store.write(`campaigns/${cid}`, { meta: { name, createdAt: Date.now(), pw } });
      await store.del(`campaigns/${cid}/meta/pw`);
      location.hash = `#/c/${cid}`;
    } catch {
      err.textContent = 'Creation rejected — wrong site password?';
    }
  };
}
