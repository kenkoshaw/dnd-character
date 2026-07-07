# D&D Campaign Map

Free shared battle map for remote D&D: one link per campaign, freely chosen DM
and character roles, 5 ft grid with calibration, fog of war, doors, monsters with
HP tracking, live token movement with distance rulers.

## Setup (once)

1. Follow `docs/firebase-setup.md` (Firebase project + rules + `js/config.js`).
2. Push this repo to GitHub → repo Settings → Pages → deploy from `main`, root.
3. Open the published URL, enter the site password (the one you put in the
   Firebase rules), create a campaign, share the link with your table.

## How it works

- Creating a campaign walks the DM through setup: upload a map, calibrate its
  grid, paint fog of war, then share the invite link it shows at the end.
- Everyone uses that same link. Pick DM or a character freely — roles only
  decide what your browser can do, nothing is locked. (Two people picking the
  same character just means two hands on one token.)
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
- **Shared roles:** roles aren't locked — coordinate over voice so two people
  don't drive the same token. Worst case, both move it.
- **Token under fog:** if the DM re-fogs the square a character stands on,
  that player can't move until the DM reveals it or drags them out — intended.
- **Cancelled drags** (alt-tab mid-drag) snap the token to its last streamed
  position, not the drag origin.
- Safari stores token images as PNG instead of WebP (slightly larger, fine).

## Development

No build step. `python3 -m http.server 8080` from the repo root and open
`http://localhost:8080`. Tests: `node --test` (Node ≥ 20).
