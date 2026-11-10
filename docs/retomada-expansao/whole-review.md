> Revisão inicial de 03/11. Os cinco achados abaixo foram encerrados em
> 04/11; veja [whole-fix-review.md](whole-fix-review.md) e
> [whole-fix-report.md](whole-fix-report.md) para a situação atual.

# Whole-branch review — expansão

Reviewed baseline `ec950d0` against the current uncommitted implementation, the supplied `whole-diff.txt`, plan, public expansion documentation, progress ledger, and surrounding integration code. Read-only review; no application changes or commits. The only written artifact is this report.

## Strengths

- Difficulty is bound to the server-side run at creation; result submission cannot substitute it. Ranking filtering is parameterized and legacy results acquire `medium` without losing scores. Factory settings migrate only when the complete old-default object matches.
- Recipe eligibility is revalidated when applied. Transformations destroy owned orbitals/zones/pending callbacks, preserve passives, consume ingredients, and block their normal reacquisition. Unions actually release one slot.
- Dash movement uses collision substeps, ends smoke immunity when interrupted, and keeps cooldown independent of movement. New effects have explicit budgets.
- Miniboss rewards use the normal non-silent kill path and are guarded against repeated reward claims. Final encounter cleanup does not reward surviving minibosses.
- DOM dialogs retain the established input/focus management, and reward selection/pause now explicitly guard against open account/guide dialogs.
- The provided validation evidence covers backend/auth regression, real browser controls, every recipe, weapon damage, and a 900-second integration simulation. No established suites were rerun during this review.

## Critical

None found.

## Important

### 1. Simultaneous joystick + DASH cannot receive the second finger

**Location:** `js/main.js:12` (missing multi-pointer configuration); `js/ui.js:31`; `tests/browser_expansion.cjs` final touch check.

The Phaser config does not set `input.activePointers`, and no application code calls `addPointer`. The bundled Phaser defaults `input.activePointers` to **1**; its `onTouchStart` assigns only an inactive touch pointer. Hold a finger on the joystick and tap DASH with a second finger: the sole pointer remains occupied by the joystick, so the DASH handler receives no second touch. The existing test taps DASH with no held joystick, so it cannot catch this failure. This contradicts the explicit simultaneous touch-control requirement.

**Fix:** provision at least two touch pointers and validate a held, moving joystick finger plus a separate DASH tap, including release of the DASH finger without cancelling the joystick.

### 2. Supplemental chests can be permanently outside the playable map

**Location:** `js/progression.js:57`, with collection threshold at `:62`; world boundary in `js/map.js:320`.

At 03:00, 07:00, or 12:00, stand against the east wall. The chest is placed at `player.x + 70`, although the player is already at the maximum allowed x. Its nearest possible distance remains at least 70 px, exceeding the 36 px pickup range. The timer is nevertheless marked delivered. This permanently loses one of the limited progression rewards without player error and also breaks the promise that ground chests remain collectible.

**Fix:** choose a reachable chest position within the current world/arena boundaries, accounting for collision clearance, before marking the supply delivered. Add an east-boundary delivery/pickup check.

### 3. Event hordes consume the slots reserved for scheduled minibosses

**Location:** `js/enemies.js:216`, `:218`, `:234`; `js/encounters.js:26`.

The normal director reserves two slots, but `runEvent` spawns directly until the physical pool fills. In Hardcore, 238 existing enemies followed by the shield-ring event at 04:30 fills all 240 slots. If no enemy dies before 05:00, the first miniboss cannot spawn; it is delayed until a kill frees space. The same condition can persist after later event packs and affect the second encounter. Thus the promised 05:00/10:00 schedule depends on player DPS despite the apparent reservation.

A focused, non-browser VM probe against the actual director/event functions confirmed `238 -> 240` after the 270-second event and zero remaining mini slots.

**Fix:** enforce pending-encounter reservations for all ordinary spawn sources, including event packs (and retain explicit bypass for scheduled minibosses). Verify a saturated ordinary population through both encounter deadlines.

## Minor

### 4. Legal admin limits of one or two enemies suppress ordinary spawns

**Location:** `js/enemies.js:218`.

The admin/server still accept `maxEnemies` from 1 to 240. With limits 1 or 2, the new `maxEnemies - 2` cap is -1 or 0, so even `alive === 0` stops the ordinary spawn loop. A new run remains empty until the first special event at 00:50; this is a regression in preserved custom rules. A focused VM probe confirmed ordinary spawn counts of 0, 0, and 1 for configured limits 1, 2, and 3 respectively.

**Fix:** make reservation aware of very small configured pools so at least one ordinary slot remains available; define scheduled-encounter precedence when a custom pool cannot fit both minis.

### 5. Result-screen difficulty text renders behind both panels

**Location:** `js/scenes.js:206`.

The difficulty text is added before the full-screen and central nearly opaque rectangles, at the same default depth. Those rectangles cover it, so the new result-screen mode label is effectively invisible.

**Fix:** add the text after the backgrounds or set its depth above them; inspect a result screen.

## Declined to judge / limits

- Human balance, whether Hardcore feels appropriately “insane,” and whether an ordinary player can assemble a satisfying build before 15 minutes: the supplied automated run starts with evolved weapons, uses invincibility, and auto-selects rewards. It establishes integration and bounded state, not human difficulty.
- FPS, frame pacing, GPU load, or mobile-device performance: CPU time from a synchronous 18,000-frame simulation does not measure those properties.
- Research-source accuracy and exact behavior in Vampire Survivors/Cuphead: documentation records the sources and deliberate adaptation, but this review inspected code and supplied evidence rather than conducting another external research pass.
- Backup restoration: the ledger documents snapshot artifacts; no restore of private production account data was attempted.
- Cheat-proof scoring: the pre-existing client-authoritative simulation is explicitly outside this change's security promise. The new server-side difficulty binding was reviewed on its own merits.
- No independent claim that all evidence suites currently pass: their outcomes are supplied in the ledger; final touch/polish rerun is owned by the root agent. Only the targeted director probes described above were executed here.

## Verdict

**Not ready for final commit until the three Important findings are addressed.** Resolve the two small Minor regressions in the same focused fix wave, then verify the changed touch, boundary, spawn-reservation, and result-label paths. No other blocking correctness issue was found in the reviewed integration.
