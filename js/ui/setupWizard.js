import * as store from '../store.js';
import { ctx, toast } from '../campaign.js';
import { processMapImage } from '../imageUtil.js';
import { openCalibration } from '../tools/calibrate.js';

// First-run guided setup — the campaign creator is assumed to be the DM.
// Upload map → calibration flow (step 2) → paint fog → share link.
export function runSetup(rail) {
  stepUpload();

  function stepUpload() {
    rail.showPopover(p => {
      p.innerHTML = `<h3>Set up your campaign — step 1 of 3</h3>
        <p class="help">Upload the battle map your party will play on.
        PNG or JPG, up to 8&nbsp;MB. You can add more maps later in ⚙ Settings.</p>
        <label for="suFile">Map image</label>
        <input id="suFile" type="file" accept="image/*">`;
      p.querySelector('#suFile').onchange = async e => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
          const image = await processMapImage(file);
          const mapId = crypto.randomUUID().replaceAll('-', '');
          await store.write(`campaigns/${ctx.cid}/maps/${mapId}`, {
            name: file.name.replace(/\.[^.]+$/, ''),
            image,
            grid: { cellPx: 50, offX: 0, offY: 0, color: '#000000', opacity: 0.4, visible: false },
          });
          await store.write(`campaigns/${ctx.cid}/activeMapId`, mapId);
          const m = await store.readOnce(`campaigns/${ctx.cid}/maps/${mapId}`);
          openCalibration(rail, mapId, m, stepFog); // step 2 of 3 is calibration
        } catch (err) { toast(err.message); }
      };
    });
  }

  function stepFog() {
    // Activate the fog tool first (its popover opens via the tool listener),
    // then replace that popover with the wizard's instructions — tool stays on.
    rail.setTool('fog', rail.rail.querySelector('button[data-tool="fog"]'));
    rail.showPopover(p => {
      p.innerHTML = `<h3>Fog of war — step 3 of 3</h3>
        <p class="help">The map starts fully visible. Paint fog over anything the
        party shouldn't see yet: <b>click</b> a square to toggle it, <b>drag</b> to
        paint an area. Starting a drag on fog erases instead. You can change fog
        any time during play with the ☁ tool.</p>
        <button class="primary" id="suDone">Finish setup</button>`;
      p.querySelector('#suDone').onclick = async () => {
        await store.write(`campaigns/${ctx.cid}/meta/setupDone`, true);
        share();
      };
    });
  }

  function share() {
    rail.showPopover(p => {
      p.innerHTML = `<h3>Invite your players</h3>
        <p class="help">Anyone with this link can join as a character or the DM.
        It's the same link every session — everything is saved automatically.</p>
        <input id="suLink" readonly>
        <button class="primary" id="suCopy">Copy link</button>
        <button id="suClose">Start playing</button>`;
      p.querySelector('#suLink').value = location.href;
      p.querySelector('#suCopy').onclick = async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          p.querySelector('#suCopy').textContent = 'Copied ✓';
        } catch {
          p.querySelector('#suLink').select(); // clipboard blocked: leave it selected
        }
      };
      p.querySelector('#suClose').onclick = () => rail.closePopover();
    });
  }
}
