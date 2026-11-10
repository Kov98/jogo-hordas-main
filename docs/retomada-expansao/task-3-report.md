# Task 3 — Dash and smoke evolution

Implemented only `js/player.js`, `js/fx.js`, and new `js/dash-art.js`.

## Behavior and interfaces
- Every hero starts with ready level-1 dash: 100px in 0.15 seconds, 1.8-second cooldown. Levels 2/3 increase distance to 115/130px and decrease cooldown to 1.4/1.05 seconds. `upgradeDash()` caps at level 3; `dashCooldown` exposes current total cooldown.
- Exposes `dashLevel`, `dashT`, `dashCd`, `dashSmoke`, `enableSmokeDash()` and bidirectional `smokeDash` accessor alias. Uses current movement direction or last aim when stationary; no independent input listeners.
- Dash movement subdivides at radius/2 maximum, calling the actual World constraint each step. At any correction it restores the last safe point and ends dash immediately, preventing repeated pushes from carrying the player through or around an obstacle. Final normal World constraint remains intact. Map edges and circular arena lock respected.
- Basic dash retains ordinary damage behavior. Smoke immunity checks `dashSmoke && dashT > 0`; expiry or obstruction removes it immediately. Smoke sprite alpha is 0.18 only during that interval and restores normal hurt/invulnerability visuals afterward.
- `slowT` decays to zero, slows normal movement to 55%, correctly integrates expiry inside a frame, and never slows dash.
- Existing powers, XP, HP/maxHp, mods, healing, damage feedback, god mode and destruction interfaces preserved.

## Visual implementation
- Hero-frame afterimages tinted with each hero color; smoke evolution changes to pale spectral trails with a translucent hero.
- Start/end pixel smoke puffs, radial streaks and rings emphasize launch and arrival.
- Fixed reusable pools: 12 afterimages and 24 puffs. Expiration hides each image; FX.destroy clears active dash effects. Exhaustion drops a new visual instead of allocating.
- `drawDashAssets(scene)` registers pixel art `i_dash`, `fx_dash_trail`, `fx_dash_smoke` via existing SPR.make. Does not duplicate progression's `i_smoke_dash`.

## Verification
Passed `node --check` on all three owned JavaScript files.

Passed `node /tmp/test-dash.cjs`, a temporary Node VM verification using the actual Player, FX, Grid and World.constrain methods (Phaser display objects stubbed). Assertions cover ready initial cooldown; exact level-1 and level-3 travel; level cap/cooldown improvement; static circle collision without tunneling; map bounds; arena bounds; smoke active damage refusal and damage after expiry; basic dash still taking damage; slow expiration and integrated movement; fixed FX budgets, natural expiration, and restart clearing.

Output: `PASS: movement, upgrades, wall/map/arena bounds, smoke window, ordinary damage, slow expiry, pool caps/expiry/clear`.

## Self-review and limitations
No external assets, unbounded dash arrays, or extra listeners. Frame-time overshoot is split between dash and normal movement; dash displacement itself stays fixed regardless of dt. Obstacle hits intentionally stop short by at most radius/2 rather than sliding. Existing world collision handling during ordinary movement was preserved. Browser rendering/gameplay verification remains with root's planned Playwright end-to-end pass; VM checks validate logic and lifecycle rather than actual pixels.
