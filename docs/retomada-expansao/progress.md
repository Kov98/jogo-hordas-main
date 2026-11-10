# SDD ledger — plan: /home/escola/Downloads/jogo-hordas/docs/EXPANSAO-PLANO.md
Ruling: autorização explícita para implementação e Gitmain nesta sessão; editar o jogo ativo compartilhado com ownershipde arquivos, semworktree que o servidor deixariade ler.
Snapshot ec950d0 tag snapshot/pre-expansao-20261103-100040; tar.gz fora do repo; banco externo com backupprivado.
Pesquisa concluída em4consultas/10resultados + páginaswiki/Cuphead/Reddit; regras adaptadas para15min e chest5min.
Tarefas1/2/3 a delegar; root tarefa4 integração.

## Preflight
| Tasks | Shared interface / internal consistency | Ruling |
|1/2|chest via scene.progression, enemy rewards via encounters|root wires both; no shared files|
|1/3|smoke recipe calls enableSmokeDash|method contract defined; no shared files|
|1/4|choices/assets/chest/recipes|root consumes public APIs; 5min chest adaptation|
|2/4|difficulty/mini active/hook|root creates director and stores selected difficulty server-side|
|3/4|input.dash and public HUD cooldown|root consumes dash fields, worker owns player/fx|
|1|power definitions/impl/recipes coherent|verify destroy orbitals and blocked ingredients|
|2|two minis 300/600 and pool240|reserve2 slots; no third at900|
|3|smoke invulnerability only during dash|substeps walls, expiry verified|
|4|900 defaults/auth/ranking/UI|migration preserves custom values; rank by difficulty|
Ruling: dispatch implementers sequentially per SDD; root performs independent integration concurrently. Workers do not commit shared tree; root makes one reviewed final commit on main as explicitly authorized.

Task 1: fix round 1/5 — orbital overlap addressed; scoped reviewer approved. Implementation data/powers/progression, no intermediate commit per main ruling.
Task 1: complete (task-1-review.md spec+quality approved, focused VM checks passed).
Task 2: fix round 1/5 — independent shellCd restores lightning; own-property difficulty resolution; reviewer approved.
Task 2: complete (task-2-review.md spec+quality approved, focused VM checks passed).
Task 3: complete (task-3-review.md spec+quality approved, actual World constraint VM checks passed).
Task 4 root: integrated four difficulty scene, 900sec final, chest menus, HUD, grimorio, controls, boss scaling, API migration/difficulty score/ranking. Backend19 tests passed; controls8 browser checks passed. Full browser expansion and account flow testing in progress.
Task 4: complete pending whole-branch review. Backend19 passed; accountbrowser7 passed; controls8 passed; expansion8 passed with900.05s simulation/peak240/noJSerrors. Final touch/screenshot polish rerun in progress. No parked/deferred findings.
Whole-branch review found 3Important/2Minor: touchsecondpointer, reachablechest, eventsbypassreservation, tinycapordinary, Endlabeldepth. Dispatching single finalfixwave; all five accepted.
Ruling: custom capacity1 cannot host2simultaneousminis; preserve livingmini and retry pendingone rather than silently destroyit; defaults240 mustspawnontime withreserves. Cost: administrativecustomextreme can defersecondmini.

Retomada04/11: contadorPhaser3.80.1 usa intervalo1<=i<pointersTotal; activePointers3 habilita2toques. CDP touchEnd corrigido para soltar contato2, preservandojoystick1. Expansão12 passou900.05s/pico240; API19 passou; controles8 passou; contas7 passou emsuíteoriginalisolada apósprimeirotimeout (auditoriasemrequestlevel; causanãoconfirmada). Re-revisão5/5 ADDRESSED emwhole-fix-review.md. Nenhumblockerremanescente. Usuário autorizou conclusãoecommitna main.
