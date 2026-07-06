import { esc } from './ui/esc.js';

export function enterCampaign(root, cid, meta) {
  root.innerHTML = `<div class="landing"><h1>${esc(meta.name)}</h1><p>campaign ${cid} — role popup comes next task</p></div>`;
}
