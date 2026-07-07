# Pre-release manual checklist (two browser windows: DM + player)

- [ ] Create campaign (wrong pw rejected, right pw works, no `pw` field left in DB)
- [ ] Claim DM / claim character / create character — races show "already claimed"
- [ ] Close player tab → claim frees within ~60 s
- [ ] Role popup background = fogged player view, never the bare map
- [ ] Map upload → calibrate (two clicks) → grid matches the map's printed grid
- [ ] Transparent-PNG map: transparent regions render white, not black
- [ ] Start tile: claiming character spawns there; map switch → players follow,
      positions restored per map
- [ ] Grid visible toggle + color/opacity sync to the player window
- [ ] Player drag: live in DM window, blocked by fog, snaps back on fog drop
- [ ] Ruler: shows both directions, red past walk speed, per-user toggle,
      clears on release and on toggle-off; killed tab mid-drag leaves no ghost
- [ ] Fog: click toggles; drag from clear start adds fog; drag from fog start
      reveals; player updates only on release; reveal all / hide all
- [ ] Doors: snap preview h/v flips near intersections, add, delete (preview
      never blocks deleting), hidden under fog for players
- [ ] Monsters: add PNG with HP, spawn at view center, copy (stays in bounds),
      delete, resize ¼/1×1/2×2, fog culling for players, HP edit, "HP visible
      to players" toggle, library default max updates for future copies
- [ ] DM hide/delete character → player bounced to role popup; roster labels
- [ ] Delete campaign (typed name) → data gone; players sent to landing on
      their next kick; refresh shows "Campaign not found"
- [ ] Reconnect banner on network loss; queued moves replay after
- [ ] `node --test` green (Node ≥ 20)
