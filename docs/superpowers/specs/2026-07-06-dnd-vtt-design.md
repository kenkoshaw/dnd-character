# D&D Remote Campaign Map (VTT) — Design Spec

Date: 2026-07-06
Status: Approved pending user review

## 1. Purpose

A free, easy-to-share virtual tabletop for remote D&D groups. The DM loads a map
PNG, controls fog of war, doors, and monsters; up to 8 players join via a link,
claim a character, and move their token on a shared 5 ft grid in real time.
Voice, dice, and rules stay outside the app (Discord / at the table).

## 2. Locked decisions (from brainstorm)

| Topic | Decision |
|---|---|
| Hosting / sync | Static site on GitHub Pages + Firebase Realtime Database (free tier) |
| Accounts | None. Unguessable player link + secret DM link |
| Tech stack | Vanilla JS ES modules, no build step, Firebase SDK via CDN |
| Fog model | Grid-cell based reveal; players see pure black under fog |
| Grid calibration | Two-click intersection calibrate + fine-tune sliders |
| DM layout | Minimal floating left tool rail with popover panels |
| Movement | Free drag (no snap), straight-line distance, rounded to 5 ft |
| Walk speed | Visual indicator only (label turns red past speed), never blocks |
| Maps | Multiple per campaign, one active; per-map start tile |
| Scope | No dice, chat, initiative, HP for characters. Ruler toggle is in. |

## 3. Architecture

- **GitHub Pages** serves `index.html` + ES modules. Deploy = push to `main`.
- **Firebase Realtime Database** holds all campaign state. Every interaction is
  a small field write; Firebase fans it out to all subscribed clients (~50 ms).
- **Routing** is hash-based (no server):
  - `#/` — landing: create campaign (name it → get both links)
  - `#/c/<campaignId>` — player link
  - `#/c/<campaignId>/dm/<dmSecret>` — DM link
- **Presence:** each tab gets a session id; `onDisconnect` handlers release
  character claims automatically when a tab closes or drops.

### Security stance (documented, accepted)

`campaignId` and `dmSecret` are long random strings — capability URLs.
DM-only actions are enforced client-side only. A player using dev tools could
read the fogged map or move monsters. Acceptable for trusted friend groups;
stated plainly in the README. No PII beyond a chosen character name and
uploaded images.

## 4. Data model (Firebase paths)

```
campaigns/<cid>/
  meta: {name, createdAt, dmSecret}
  activeMapId: <mapId>
  characters/<charId>:
    name, imageB64, speed          # all editable during campaign
    claimedBy: <sessionId> | null  # transaction-guarded, presence-released
    hidden: bool                   # DM-set; hidden token not rendered
    positions/<mapId>: {x, y}      # px in map coords, kept per map
  monsterLibrary/<libId>:
    imageB64, label, defaultMaxHp  # defaultMaxHp updated to last-used max
  maps/<mapId>/
    name
    image: {b64, w, h}             # client-side re-encode, JPEG ≤ ~2 MB
    grid: {cellPx, offX, offY, color, opacity, visible}  # DM-set, synced
    startTile: {col, row}
    fog/<"col_row">: true          # revealed cells; absent = fogged (default)
    doors/<doorId>: {x, y, orientation: "h" | "v"}  # grid-line snapped
    monsters/<tokenId>:
      libRef, size: 0.5 | 1 | 2    # side length in cells: ¼-area, 1×1, 2×2
      x, y
      hp: {cur, max}
      hpVisible: bool              # DM choice per monster, default false
```

Notes:

- **Images in RTDB as base64.** Maps re-encoded client-side to JPEG capped
  ~2 MB (sources > 8 MB rejected with a message). Token/monster images
  downscaled to 128 px (~30 KB). Free tier (1 GB storage, 10 GB/mo egress)
  comfortably covers a hobby group.
- **Fog** is a sparse set of *revealed* cells; a new map starts fully fogged.
- **Character positions per map:** returning to an earlier map restores
  everyone's previous spots; first arrival on a map spawns the character at
  `startTile`. Characters are not grid-locked — several can overlap one cell.
- **Token sizes:** characters are always ¼ of a cell's area (half the cell's
  side length). Monsters are ¼, 1×1, or 2×2 cells.

## 5. Roles and flows

### Create campaign (anyone)
Landing page → enter campaign name → app generates `campaignId` + `dmSecret`,
writes `meta`, shows the two links with copy buttons. DM link also cached in
localStorage and always recoverable from the DM settings panel.

### DM map setup
Upload PNG → calibration screen:

1. Click two grid intersections on the map, enter how many squares apart →
   `cellPx` + offsets computed.
2. Fine-tune sliders (cell size, offset x/y) with live grid overlay.
3. Grid styling: color, opacity, and **visible on/off** — a per-map DM
   decision synced to everyone (players have no grid toggle).
4. Click a cell to set the start tile.
5. Activate map. Switching the active map moves all players to it.

### Player join
Open player link → popup lists the campaign's characters with claimed/free
badges → claim a free one, **or** create new (name + image PNG + walk speed).
Claiming is a Firebase transaction — two people cannot hold the same
character; losing a race shows "already claimed". Disconnect auto-releases.
Manual "release character" button exists. Name, image, and speed are editable
mid-campaign from the player's own character panel.

### DM player management
DM sees the character roster and can:

- **Hide** a character (inactive this session): token disappears for everyone,
  claim is cleared, and the claiming player is kicked back to the join popup.
  Hidden characters appear in the join list marked inactive; claiming one
  un-hides it.
- **Delete** a character permanently (confirmation required). Claiming player
  is kicked back to the join popup.

## 6. Rendering and layering

One "world" `<div>` panned/zoomed via CSS transform; all layers are children
so they move together. Coordinate spaces: screen ↔ world px ↔ grid cell.

Layer order (bottom → top):

| # | Layer | Implementation | Player view | DM view |
|---|---|---|---|---|
| 1 | Map image | `<img>`, `pointer-events: none` | revealed only (under fog) | full |
| 2 | Grid | canvas | if DM enabled | if DM enabled |
| 3 | Doors | DOM elements | all | all |
| 4 | Monster tokens | DOM elements | hidden if center cell fogged | all, with HP on hover |
| 5 | Fog | canvas | opaque black on fogged cells | 50 % black wash |
| 6 | Character tokens | DOM elements | always visible (above fog) | always visible |
| 7 | Overlays | rulers, drag lines, hover labels | | |

Tokens always render above the grid. Name labels (characters and monsters)
appear **only on hover**. The map image itself is never clickable or
selectable.

## 7. Interactions

### Navigation (everyone)
Drag empty space = pan. Scroll / pinch = zoom toward cursor, 10 %–400 %.
No mode switch: pointer-down on a token starts a token drag, anywhere else
starts a pan.

### Token movement
Players drag only their claimed character; DM drags any token. While
dragging, if the user's **ruler toggle** is on: a line from the drag origin
plus a distance label (straight-line px → ft via grid scale, rounded to the
nearest 5 ft); the label turns red beyond the character's walk speed
(monsters: neutral color always). Positions stream to other clients throttled
at ~100 ms for smooth live movement.

### Ruler (toggle, all users)
A ruler on/off toggle per user (local preference).

- ON: your own token drags show the distance ruler, **and** you see other
  users' in-flight drag rulers (origin line + ft label).
- OFF: no rulers shown to you, yours included.
There is no free-measure drag on empty ground (that gesture pans).

### Fog tool (DM only)
DM always sees fog as a 50 % black wash; players see opaque black.

- Click a cell: toggle fogged ↔ revealed.
- Drag: paints whole cells; the **starting cell decides the stroke mode** —
  start on a clear cell → the whole stroke adds fog (even over already-fogged
  cells); start on a fogged cell → the whole stroke removes fog.
- Players see the result only when the mouse is released (stroke commits as
  one multi-cell write).
- Popover buttons: **reveal all** / **hide all** (confirmation on hide all).

### Door tool (DM only)
Doors are brown rectangles one cell-edge long, horizontal or vertical (no
other rotations). They snap to **grid lines** — not cell edges — so a door
can sit centered across the boundary of two cells anywhere along a line.
Hover shows a snapped preview; click places it; click an existing door
deletes it. No open/close state — DM adds and removes doors as play unfolds.
Doors are visible to all players.

### Monsters (DM only)
Monster popover shows a thumbnail grid of every PNG used this campaign plus
"add PNG" (file picker → downscale → library, prompts for label + max HP).
Click a thumbnail → token spawns at the center of the DM's current view
(clamped to map bounds), size 1×1 default, HP = that monster type's
`defaultMaxHp`.

- Right-click token → context menu: **copy** (duplicate at slight offset,
  same max HP), **delete**, **size ¼ / 1×1 / 2×2**.
- Hover → name + HP bar beneath the token (DM only, unless `hpVisible`).
- Click (DM) → panel to edit current and max HP and toggle **"HP visible to
  players"** per monster (default off). Editing a monster's max HP updates
  the library's `defaultMaxHp` so future copies inherit it.
- HP is bookkeeping only — no mechanical effect.

## 8. Sync and realtime behavior

- Field-granular writes: a token move writes only that token's `x, y`.
- Token drags: throttled ~100 ms streaming; final position written on release.
- Fog strokes: buffered locally, committed on mouse release as one update.
- Claims: transactions on `claimedBy`; presence (`onDisconnect`) clears them.
- Late joiner: subscribes to campaign subtree, receives full current state.
- Clients render from the Firebase mirror — local echo applied optimistically,
  authoritative state overwrites on conflict (last-write-wins is fine here).

## 9. Error handling

| Failure | Behavior |
|---|---|
| Connection drop | "Reconnecting…" banner; Firebase SDK buffers writes and replays |
| Claim race lost | "Character already claimed" toast, back to join list |
| Character hidden/deleted while claimed | Client detects, shows join popup again |
| Image source > 8 MB | Rejected with clear message |
| Image 2–8 MB | Auto-downscaled/re-encoded client-side |
| Bad/missing campaign id | "Campaign not found" page with create link |
| DM link lost | Recoverable from DM settings panel; cached in localStorage |

## 10. Out of scope (v1)

Dice roller, text chat, initiative tracker, character HP, free-measure ruler,
door open/close states, server-side permission enforcement, D&D Beyond API
integration (character images are manual PNG uploads), mobile-optimized UI
(desktop-first; basic touch pan/zoom works via pointer events).

## 11. Testing

- **Unit tests** (`node:test`, plain ESM, no toolchain): coordinate
  transforms (screen ↔ world ↔ cell), fog stroke semantics (start-cell mode,
  resulting cell set), distance calculation and 5 ft rounding, door grid-line
  snapping, image downscale dimensions, claim-transaction logic against a
  mocked store.
- **Store abstraction:** all Firebase access behind `store.js` so logic tests
  run without Firebase.
- **Manual two-browser checklist** (DM + player side by side) before each
  release: join/claim/release, live token drag, fog reveal on release, door
  add/delete, monster spawn/copy/HP, map switch + start tile, reconnect.

## 12. Module layout

```
/index.html
/css/app.css
/js/
  main.js            # hash routing, role detection, boot
  store.js           # Firebase init + all reads/writes/subscriptions
  session.js         # session id, presence, claims
  world.js           # pan/zoom transform, coordinate conversions
  render/
    map.js grid.js fog.js tokens.js doors.js overlays.js
  tools/
    fogTool.js doorTool.js rulerTool.js calibrate.js monsterTool.js
  ui/
    landing.js joinFlow.js rail.js popovers.js characterPanel.js dmPanel.js
  imageUtil.js       # downscale, re-encode, base64
/tests/              # node:test unit tests
```

## 13. Future ideas (non-binding)

Shared free-measure ruler, door open/close, Firebase anonymous-auth
hardening, bloodied-state indicator instead of exact HP, map image chunking
for > 2 MB maps, initiative tracker.
