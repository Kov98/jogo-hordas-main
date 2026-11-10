# Task 1 review

Scope: inspected brief, implementation report, saved diff and current owned files (`js/data.js`, `js/powers.js`, `js/progression.js`). Read Player, game combat/choice consumers, existing orbital implementations and sprite texture sizing where needed. No tests rerun; existing report records syntax and focused VM checks. No runtime files changed.

## Verdicts

- **Spec compliance: substantially compliant.** All nine recipes have correct ingredients/passives, max-base gates, time >=300 and application revalidation. Smoke requires dash level >=3 and speed and consumes no weapon slot. Transformation destroys ingredients, clears their pending callbacks through `PowerInstance.destroy`, removes orbital sprites through their existing implementation destroy hooks, retains passives and blocks consumed bases. A union replaces two powers with one. Non-obtainable result definitions prevent ordinary offers. Three eight-level bases and six evolutions/two unions are present, with mechanically useful damage/slow/lifesteal/zone/pull/execute differences. Chest cap, supplemental thresholds, distance gate, menu blocking and conditional pickup consumption match the brief. Scene-level loading, six-slot enforcement and menu wiring are root-owned integration responsibilities; current consumers were inspected only to confirm compatibility.
- **Code quality: changes requested.** One concrete gameplay correctness issue below. No other important owned-file issues found by inspection. Browser behavior and balancing remain outside this inspection's evidence.

## Finding

### P2 — Celestial Ring's eight orbitals collapse into four positions

Location: `js/powers.js:473-474` (inside `POWER_IMPL.celestial_ring.update`).

`p.s.count` is eight, but angles use `i * Math.PI / 2`, while direction and radius depend only on parity. Therefore indexes 0/4, 1/5, 2/6 and 3/7 each have identical direction and radius and differ only by a full turn. Every pair overlaps at all times. The union visibly provides four bodies instead of its configured eight, with just two bodies in each counter-rotating crown. Because all sprites share `e.hitT.celestial_ring`, the overlapped copy cannot deal extra damage either: these are wasted sprites and collision queries, and the union loses half its intended coverage.

Fix: assign crown = i % 2 and position within crown = Math.floor(i / 2); distribute four distinct positions per crown with `position * 2 * Math.PI / (count / 2)`, then add crown-dependent rotation and any intended crown phase. Keep the shared enemy hit cooldown if that is the intended damage cap. Verify that all eight coordinates are distinct for a generic nonzero time and both crowns contain four evenly spaced bodies.

## Evidence boundaries

The implementer's syntax/VM verification is recorded in `task-1-report.md`; it was not repeated, as requested. The orbital issue is established directly by the angle/radius formulas, independent of Phaser or mocks. No findings are assigned to files owned by other tasks or ongoing root integration.

## Scoped re-review — fix 1

**ADDRESSED.** Inspected `task-1-fix1-diff.txt` and the appended verification in `task-1-report.md`; did not rerun recorded tests. With eight configured bodies, `position = floor(i / 2)` takes values 0–3 separately for each parity crown, and angle spacing is 2π/4. Thus each crown now has four evenly spaced distinct coordinates, with opposite rotation and independent oscillating radius retained. The second crown's π/4 phase also separates the crowns at initialization; the report confirms eight distinct coordinates at generic time t=1.37 using the real implementation. Occasional intersections while crowns counter-rotate are expected and do not recreate permanent paired overlap. Shared damage cooldown and cleanup behavior are unchanged. No new issue found in the changed lines.

Updated verdicts: **spec compliance approved; code quality approved for reviewed scope.** Original evidence boundaries remain applicable.
