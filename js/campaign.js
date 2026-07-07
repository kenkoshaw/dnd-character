import * as store from './store.js';
import { sessionId, kickReason } from './session.js';
import { showRolePopup } from './ui/rolePopup.js';
import { createWorld } from './world.js';
import { createMapLayer } from './render/mapLayer.js';
import { createGridLayer } from './render/gridLayer.js';
import { createTokenLayer } from './render/tokenLayer.js';
import { createFogLayer } from './render/fogLayer.js';
import { createOverlayLayer } from './render/overlayLayer.js';
import { createDoorLayer } from './render/doorLayer.js';
import { createRail } from './ui/rail.js';
import { showDmPanel } from './ui/dmPanel.js';
import { showCharacterPanel } from './ui/characterPanel.js';
import { createFogTool } from './tools/fogTool.js';
import { createDoorTool } from './tools/doorTool.js';
import { createMonsterTool } from './tools/monsterTool.js';

// Shared per-campaign context, extended by later tasks.
export const ctx = {
  cid: null, role: null, // {kind:'dm'} | {kind:'char', charId}
  grid: null, revealed: new Set(), activeMapId: null, mapSize: { w: 0, h: 0 },
  characters: {},
};

export function enterCampaign(root, cid, meta) {
  // Tear down any previous campaign's subscriptions (landing → A → landing → B
  // in one tab): stale subs would keep writing into ctx and detached layers.
  // Every store.sub this module or later layers create must register here.
  ctx.unsubs?.forEach(u => u());
  ctx.unsubs = [];
  ctx.cid = cid;
  document.title = meta.name;
  const viewport = document.createElement('div');
  viewport.id = 'viewport';
  root.appendChild(viewport);

  ctx.world = createWorld(viewport);
  ctx.layers = {
    map: createMapLayer(ctx.world.el),
    grid: createGridLayer(ctx.world.el),
    // later tasks append: doors, monsters, fog, characters, overlay (this order)
  };
  ctx.layers.tokens = createTokenLayer(ctx.world.el);
  ctx.layers.doors = createDoorLayer(ctx.world.el, ctx.layers.tokens.monstersEl);
  ctx.layers.fog = createFogLayer(ctx.world.el, ctx.layers.tokens.charsEl);
  ctx.layers.overlay = createOverlayLayer(ctx.world.el);
  ctx.world.registerHandler(e => ctx.layers.tokens.dragHandler(e));
  ctx.unsubs.push(store.sub(`campaigns/${cid}/characters`, chars => {
    ctx.characters = chars || {};
    ctx.layers.tokens.renderCharacters(ctx.characters);
  }));

  // Drag rulers: my own in-flight drag (via the tokenLayer hook) merged with
  // other sessions' streamed drags; each viewer's ruler toggle gates rendering.
  let remoteDrags = {};
  let myDrag = null;
  const redrawRulers = () => {
    const rulers = Object.entries(remoteDrags)
      .filter(([sid]) => sid !== sessionId)
      .map(([, d]) => ({
        startX: d.startX, startY: d.startY, x: d.x, y: d.y,
        speed: d.charId ? ctx.characters?.[d.charId]?.speed ?? null : null,
      }));
    if (myDrag?.active) rulers.push({
      startX: myDrag.start.x, startY: myDrag.start.y,
      x: myDrag.current.x, y: myDrag.current.y, speed: myDrag.speed ?? null,
    });
    ctx.layers.overlay.drawRulers(rulers);
  };
  ctx.unsubs.push(store.sub(`campaigns/${cid}/drags`, v => { remoteDrags = v || {}; redrawRulers(); }));
  ctx.onDragUpdate = d => { myDrag = d; redrawRulers(); };

  ctx.monsterLib = {}; ctx.monsterData = {};
  ctx.unsubs.push(store.sub(`campaigns/${cid}/monsterLibrary`, v => {
    ctx.monsterLib = v || {};
    ctx.layers.tokens.renderMonsters(ctx.monsterData, ctx.monsterLib);
  }));

  // Reconnect banner (Firebase buffers writes while offline and replays them).
  document.querySelector('.banner')?.remove();
  const banner = document.createElement('div');
  banner.className = 'banner';
  banner.textContent = 'Reconnecting…';
  banner.style.display = 'none';
  document.body.appendChild(banner);
  ctx.unsubs.push(store.onConnectionChange(ok => banner.style.display = ok ? 'none' : 'block'));

  let unsubMap = null;
  ctx.unsubs.push(() => unsubMap?.());
  ctx.unsubs.push(store.sub(`campaigns/${cid}/activeMapId`, mapId => {
    ctx.activeMapId = mapId;
    unsubMap?.();
    ctx.grid = null; // no snapping/rendering against the old map's grid while the new map loads
    if (!mapId) { ctx.layers.map.clear(); return; }
    unsubMap = store.sub(`campaigns/${cid}/maps/${mapId}`, map => {
      if (!map?.image) return;
      ctx.grid = map.grid;
      ctx.mapSize = { w: map.image.w, h: map.image.h };
      ctx.startTile = map.startTile || null;
      ctx.revealed = new Set(Object.keys(map.fog || {}));
      ctx.layers.fog.draw(ctx.revealed, ctx.fogPreview || null);
      ctx.layers.doors.render(map.doors);
      ctx.monsterData = map.monsters || {};
      ctx.layers.tokens.renderMonsters(ctx.monsterData, ctx.monsterLib);
      ctx.layers.map.setImage(map.image);
      ctx.layers.grid.draw(map.grid, map.image.w, map.image.h);
      ctx.layers.tokens.renderCharacters(ctx.characters);
    });
  }));

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
let toolCleanups = [];
function watchKick(root, charId) {
  kickUnsub?.(); // never two kick watchers
  const unsub = store.sub(`campaigns/${ctx.cid}/characters/${charId}`, ch => {
    if (ctx.role?.kind !== 'char' || ctx.role.charId !== charId) { unsub(); return; }
    if (kickReason(ch, sessionId)) {
      unsub();
      // If the whole campaign is gone (DM deleted it), go home — a role popup
      // on a dead campaign only offers zombie slots the rules reject anyway.
      store.readOnce(`campaigns/${ctx.cid}/meta`).then(meta => {
        if (!meta) { location.hash = ''; return; }
        toast('You were removed — pick a role.');
        pickRole(root);
      });
    }
  });
  kickUnsub = unsub;
  ctx.unsubs?.push(unsub);
}

export async function releaseRole(root) {
  // Clear the role BEFORE the release write: the removal echoes synchronously
  // through the local watchKick subscription, which must see no active role
  // (else it fires a spurious kick toast and a second stacked popup).
  const prev = ctx.role;
  if (!prev) return; // release already in flight or no role held
  ctx.role = null;
  if (prev?.kind === 'dm') await store.release(`campaigns/${ctx.cid}/dmClaimedBy`);
  if (prev?.kind === 'char') await store.release(`campaigns/${ctx.cid}/characters/${prev.charId}/claimedBy`);
  pickRole(root);
}

function startUi(root, role) {
  ctx.rail?.closeExclusive?.(); // calibration must not outlive the rail that owns it
  const rail = createRail(role);
  ctx.rail = rail;
  // Tear down the previous role's tool handlers/listeners — the stale-rail
  // guards make leftovers inert, but they'd still accumulate per re-pick.
  toolCleanups.forEach(f => f());
  toolCleanups = [];
  if (role.kind === 'dm') {
    rail.button('☁', 'Fog of war', b => rail.setTool('fog', b)).dataset.tool = 'fog';      // handler Task 12
    rail.button('🚪', 'Doors', b => rail.setTool('door', b)).dataset.tool = 'door';         // handler Task 14
    const monsterTool = createMonsterTool(rail, () => ctx.monsterLib);
    toolCleanups.push(monsterTool.bindTokenMenus(document.querySelector('#viewport')));
    rail.button('👾', 'Monsters', () => monsterTool.showPopover());
    rail.button('⚙', 'Settings', () => showDmPanel(rail));
    const fogTool = createFogTool(rail);
    toolCleanups.push(ctx.world.registerHandler(e => fogTool.pointerHandler(e)));
    rail.onToolChange(t => { if (t === 'fog') fogTool.showPopover(); });
    const doorTool = createDoorTool(rail, document.querySelector('#viewport'));
    toolCleanups.push(ctx.world.registerHandler(e => doorTool.pointerHandler(e)));
    toolCleanups.push(doorTool.dispose);
    rail.onToolChange(t => { if (t !== 'door') ctx.layers.doors.hidePreview(); });
  }
  if (role.kind === 'char')
    rail.button('🧝', 'Edit character', () => showCharacterPanel(rail, role.charId));
  const rulerBtn = rail.button('📏', 'Ruler on/off', b => {             // used from Task 13
    const on = localStorage.getItem('vtt_ruler') !== 'off';
    localStorage.setItem('vtt_ruler', on ? 'off' : 'on');
    b.classList.toggle('active', !on);
    ctx.layers.overlay?.drawRulers([]); // clear immediately; next event redraws if on
  });
  rulerBtn.classList.toggle('active', localStorage.getItem('vtt_ruler') !== 'off');
  rail.button('⏏', 'Release role', () => releaseRole(root));
}

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
