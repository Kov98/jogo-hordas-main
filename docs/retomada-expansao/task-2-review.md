# Task 2 review

Spec verdict: changes required.
Code quality verdict: changes required before approval.

Scope: js/enemies.js, js/encounters.js, js/difficulty.js only. Reviewed the task brief, implementation report, supplied diff, plan contracts, and current source. Related player/game/data source was read only to validate interfaces. No runtime edits, commits, or implementer-report test reruns.

## Important finding

1. **Storm Warden loses its defining lightning attack during ordinary combat** — `js/enemies.js:324–335` and `js/encounters.js:7`.

Both shot and shell attacks use `e.atkCd`. The shot branch executes first and assigns a positive cooldown, making the subsequent shell condition false. The Warden tries to maintain 240px distance, and its shot range is 650px, so its telegraphed lightning cross cannot occur during normal fighting. Shell attacks only work when the player stays between 650 and 850px. This violates the distinct telegraphed storm mini pattern and the report's claim that it fires spreads plus a lightning cross.

Focused independent reproduction used the actual EnemyManager.ai and actual Warden definition with stubbed rendering/movement interfaces: 600 updates at dt=.1 and player 240px away produced **23 shot volleys and 0 hazards**. Fix with independent resettable shell/shot cooldowns or explicit attack alternation, and verify both attack families at the intended keep distance. Any new cooldown must reset on pooled spawn.

## Minor finding

2. **Invalid inherited-property difficulty IDs do not resolve to medium** — `js/difficulty.js:13`.

`DIFFICULTIES[id] || DIFFICULTIES.medium` looks up Object.prototype too. `resolveDifficulty('toString')` returns a function; `constructor` and `__proto__` also bypass the fallback. That violates the advertised valid-object/default contract and can yield undefined/NaN multipliers when callers pass persisted/untrusted IDs. Focused evaluation confirmed `resolveDifficulty('toString') === DIFFICULTIES.medium` is false. Use an own-property check or a null-prototype difficulty map.

## Checked without further blocking findings

- Difficulty tables contain requested values. Enemy HP, movement, contact/shot/hazard damage, XP, and health-drop chance each apply their relevant multiplier once; current GameScene.dmgScale is time-only and Player.gainXp does not multiply again. Final boss multipliers remain outside this review's ownership.
- Hardcore uses 2.8x spawn and 2.6x target cap without enlarging the actual 240-sprite pool, and dangerous unlocks advance 2.5x. Late selection suppresses hp<=20 weights to a .25 floor while unlocked tougher enemies retain their weights.
- Exactly two director flags cover 300/600 seconds, loop handles crossed thresholds, no 900-second encounter, and ended/final-boss checks prevent new encounters. Failed pool/position allocations retry. Regular target cap reserves two slots; event filling can consume them but retry remains supported.
- Minis use normal grid/pool flags and zero base XP. Non-silent kills call the reward hook; silent cleanup returns beforehand. Direct 250/600 XP scaling, guaranteed chest request, announcement, and reward idempotence are present.
- Pool spawn clears mini flags, slow state, hit tracking, and spiral state. Active minis are deduplicated even when the same pooled object is reused. Frost slow affects actual AI movement; shots clear tint/slow on reuse and apply player slow only after takeDamage succeeds, so smoke immunity can reject both.
- New ranged/shell/spiral attacks check spawning/end/final state. They use the existing 140-shot pool and existing scene hazard bound. The latter currently admits 41 hazards due to its pre-existing >40 check; root-owned GameScene is outside this task and the task introduces no unbounded hazard container.
- Enemy art references existing humanoid renderer options. Poison uses the explicitly authorized delayed burst alternative.

Validation limits: source/interface review plus two focused independent reproductions above. Browser playtesting and full integration remain with root; reported implementer tests were read but not rerun.

## Fix round 1 re-review

Spec verdict: approved within task 2 scope.
Code quality verdict: approved within task 2 scope.

Reviewed `task-2-fix1-diff.txt`, appended implementer evidence, and current fix lines. Both original findings are addressed:

- `shellCd` is initialized on every pooled spawn, decremented by AI, and independently checked/reset by shell attacks. Shot cooldown updates cannot suppress the Warden lightning cross. Existing shell-only enemies still have correctly initialized cooldowns; spawning/end/final guards and damage scaling are retained. Reported actual-AI regression evidence at 240px over 60 seconds shows 22 volleys and 110 hazard requests, plus pooled cooldown reset verification.
- `resolveDifficulty` now checks own properties through `Object.prototype.hasOwnProperty.call`, retaining the four valid definitions and routing inherited names to medium. Reported invalid-ID regression evidence covers the original cases.

No new issue found in fix lines. Tests were not rerun per review instructions; this re-review relies on code inspection and the supplied execution evidence. Prior browser/integration limits still apply.
