# D&D Campaign Map

Free shared battle map for remote D&D: one link per campaign, claimable DM and
character roles, 5 ft grid with calibration, fog of war, doors, monsters with
HP tracking, live token movement with distance rulers.

## Setup (once)

1. Follow `docs/firebase-setup.md` (Firebase project + rules + `js/config.js`).
2. Push this repo to GitHub → repo Settings → Pages → deploy from `main`, root.
3. Open the published URL, enter the site password (the one you put in the
   Firebase rules), create a campaign, share the link with your table.

## How it works

- Everyone uses the same campaign link. First to claim DM is DM; everyone else
  claims or creates a character (name, token image, walk speed).
- DM: upload map → place two points on grid intersections (pan/zoom freely,
  a third click adjusts) → OK → fine-tune → set start tile. New maps start
  fully revealed with the grid hidden — paint fog ON and toggle the grid as
  you like. Doors, monsters, and HP tracking live in the left rail.
- Players: drag your token (only within revealed squares — the label shows
  distance in feet and turns red past your walk speed). The 📏 button toggles
  rulers for yourself.
- Everything syncs live and persists — come back to the same URL next session.

## Notes and known behaviors

- **Honest security note:** role enforcement is client-side. Anyone with the
  link and dev-tools knowledge could peek under the fog. Play with people you
  trust; don't reuse the site password anywhere else. The password is only
  enforced server-side for campaign creation.
- **Stuck claim:** if a role shows "taken" but nobody holds it (rare network
  race), open the Firebase console → Realtime Database → delete that
  character's `claimedBy` key (or `dmClaimedBy`). Claims normally auto-release
  when a tab closes.
- **Token under fog:** if the DM re-fogs the square a character stands on,
  that player can't move until the DM reveals it or drags them out — intended.
- **Cancelled drags** (alt-tab mid-drag) snap the token to its last streamed
  position, not the drag origin.
- Safari stores token images as PNG instead of WebP (slightly larger, fine).

## Development

No build step. `python3 -m http.server 8080` from the repo root and open
`http://localhost:8080`. Tests: `node --test` (Node ≥ 20).
