# Task 1 report — powers and progression

Implemented only owned runtime files: `js/data.js`, `js/powers.js`, new `js/progression.js`.

## Implementation

- Three eight-level base weapons: returning axes with independent outgoing/return collision passes, frost area damage with timed slow, poison persistent ground zones.
- Six evolved weapons: soulblade life steal; tempest staggered lightning area strikes; inferno initial eruption plus burning ground; returning spiral reaper axes with execute damage; blizzard repeating mobile slow aura; miasma ground poison spreading when a victim dies.
- Two unions: celestial_ring counter rotating oscillating defense crowns, singularity enemy attraction with periodic damage and final implosion.
- All evolved/union definitions `obtainable:false`, max one level. Base weapon upgrades remain seven each.
- Nine `PROGRESSION_RECIPES`, including smoke_dash; all gated by scene time >=300 and required passive, maxed bases or dash level >=3. Ingredients are arrays of IDs; recipes provide result/icon/name/description/kind.
- `ProgressionSystem` offers eligible transformations first, filters standard choice fallback, revalidates application, consumes bases and destroys callbacks/orbitals/weapon-owned effects, retains passives, blocks consumed bases. Unions replace two instances with one.
- Eight physical chest cap; supplemental drops at180/420/720, recorded only after successful spawn. Pickup distance36; false return keeps chest; level/chest/ended pauses pickups. `destroy()` cleans chest sprites.
- Original procedural pixel icons, projectiles/effects and chest via `drawProgressionAssets(scene)`.
- Persistent zones capped12 per weapon; active axes capped12, no additional scene timer callbacks.

## Verification

`node --check js/data.js`, `node --check js/powers.js`, `node --check js/progression.js`: passed.

`node /tmp/progression-test.cjs`: passed. Lightweight Node VM checks all nine recipes incomplete/complete, time gating, repeated application rejection, consumed/evolved offer exclusion; unions clear pending callbacks, destroy orbit sprites and free one slot; axes inflict real combat damage; chests enforce cap, preserve rejected pickup and pause while menu open; all three new bases have eight levels. Initial mock chainability error was fixed in test harness, then all assertions passed.

## Self review and integration notes

- Root must load progression after powers, call procedural asset hook, create progression after enemy manager, call its update, filter ordinary new offers through canOfferPower, and provide openEvolutionChest.
- Frost/blizzard emit `enemy.slowUntil`/`enemy.slowFactor` (0.45); root notified to integrate these in EnemyManager movement.
- No browser integration verification performed by this task; root owns Playwright and whole game flow checks.
- No git commit, no edits outside owned runtime files and this report.

## Review fix 1 — Celestial Ring orbital coverage

Confirmed review P2: parity rotation plus index quarter turns overlapped every fourth body. Updated only `js/powers.js` to assign crown parity and position within each crown, spread all four bodies per crown over a full turn, and add a quarter-step phase to the second crown. Counter rotation, oscillating radius and shared damage cooldown remain intact.

Saved exact fix-only diff: `.superpowers/sdd/EXPANSAO-PLANO/task-1-fix1-diff.txt`.

Verification commands and output:

```text
$ node --check js/powers.js
(exit 0, no output)
$ node /tmp/celestial-ring-test.cjs
PASS: Celestial Ring has 8 distinct coordinates at t=1.37; each counter-rotating crown has 4 equally spaced bodies.
$ node /tmp/progression-test.cjs
PASS: nine recipe eligibility/revalidation/repeat checks; union cleanup/slot; transformed offer exclusion; axes combat; chest cap/accept/pause; eight levels.
```

Self review: test executes the real PowerInstance/POWER_IMPL with coordinate-recording sprite mocks, checks all28 pairwise distances at generic nonzero time and verifies quarter-turn spacing/equal radius for each four-body crown. No new integration concerns.
