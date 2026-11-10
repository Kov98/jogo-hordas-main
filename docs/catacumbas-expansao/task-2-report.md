# Task 2 — Catacumbas e campanha frontend

Implementação entregue ao controlador em 2026-11-09. Produção liberada para os
hooks sequenciais de integração. Não foram usados Git, Chrome ou servidor HTTP
por este owner.

## Conteúdo

- `STAGES`: floresta → castelo → catacumbas; só Catacumbas termina a campanha.
  Castelo usa filtro explícito `!stage || stage === 'castle'`.
- Seis comuns exclusivos: `crypt_ghost`, `crypt_bone_archer`, `crypt_crawler`,
  `crypt_acolyte`, `crypt_sentinel`, `crypt_banshee`.
- Minis aos tempos já existentes (05:00/10:00): `crypt_executioner` e
  `crypt_soulkeeper`. Eventos próprios, todos no pool compartilhado.
- `CatacombWorld` contém quatro câmaras laterais, arena central, corredores
  conectados, sarcófagos, nichos, braseiros e entrada sul. `routes` expõe as
  rotas garantidas livres para verificação geométrica. Colisão projeta para a
  união caminhável e preserva o círculo da arena durante o boss.
- Oito armadilhas fixas, advertências de 1,3/1,7 s, cooldown individual 7 s,
  no máximo quatro advertências ambientais simultâneas; só ativam próximas
  da câmera/jogador. Suspensas durante cinema, boss, fim e exploração pausada.
- Necromante com nova silhueta/atlas, selos fixados na posição anunciada,
  anel de almas pelo pool de projéteis e invocações de até seis fantasmas.
  Invocações guardam UID; limpeza silenciosa não mata uma entidade reciclada.
- Cavaleiro agora revela escadaria por cinema e devolve controle. O jogador
  caminha à escadaria, interage, atravessa com fade e sai da entrada sul das
  Catacumbas com caminhada/fade. A travessia da floresta foi preservada.
- Fatal-hit de todos os chefes oficiais trava cinema no mesmo quadro. Efeitos
  atrasados de morte verificam a identidade da cena/chefe antes de concluir.
- `SoulFinale` libera almas em vez de fazer o herói cair; somente esta fase
  registra vitória, uma única vez. `CastleFinale` antigo permanece disponível
  para compatibilidade, mas não é mais escolhido pela campanha.
- Seleção/dificuldade reconhecem três fases, bloqueio correto e prévia própria.

## Hooks para integração sequencial

1. Carregar `catacombs-enemies.js` depois de `ENEMIES`/`ENEMY_ART` e antes de
   `stages.js`. Registra os oito IDs e `CATACOMB_ENEMY_IDS/CATACOMB_EVENTS`.
2. Carregar `catacombs-boss.js` depois de `Boss` e antes de `stages.js`.
   Exportações clássicas: `CATACOMB_BOSS`, `NecromancerBoss`,
   `drawNecromancerAssets(scene)`.
3. Carregar `catacombs-art.js` antes da geração. Chamar
   `drawCatacombAssets(scene)` em `SPR.generateAll` antes do loop `ENEMY_ART`.
   Ela já chama `drawNecromancerAssets`, portanto não duplicar essa chamada.
4. Carregar `catacombs.js` depois de `map.js`, antes de criar `GameScene`.
   `CatacombWorld.entry = {x:2000,startY:3806,endY:3520,wallY:3750}`.
   A entrada não possui props sólidos no corredor.
5. API genérica: `nearStageExit()`, `enterNextStage()`; wrappers antigos
   `nearCastleGate()` e `enterCastle()` permanecem exclusivos da floresta.
   UI/toque deve chamar a API genérica. Escadaria usa `world.gate/gateOpen`,
   `world.isAtStageExit(entity)` e `world.openCatacombStairs()`.
6. Portal chamado como `advanceRun(runId,targetStage)`,
   `recordGuestAdvance(targetStage)` e `recordGuestVictory(stageId)`.
   Resposta de avanço com `stage` é mesclada ao run preservado.
7. `cinematicAwait(promise)` registra um cancelador em `cinematicWaits` e
   resolve `{ok:false}` imediatamente no shutdown, inclusive com rede pendente.
   Respostas/rejeições tardias são consumidas e não reiniciam outra partida.
8. Carry contém o estado existente de build/progressão, totais, partida e
   fase inicial. Falha de avanço conserva a partida e continua em treino.
   Multiplicadores de carry da fase 3: HP 2,6; spawn 1,3; dano 1,4.
9. `startBossFight` cura por `player.heal(maxHp*.5)` para respeitar relíquias.
   Root ainda integra relic IDs, aparência/loadout/checkpoint em `stages.js`,
   exploração/áudio em `game.js` e HUD/menu/portal/backend.
10. Pontos livres de exploração compartilhados com Task3: câmaras
    (1100,1100), (2900,1100), (1100,2900), (2900,2900). Altares sugeridos
    (1100,1160) e (2900,2860). Raio 40 validado nos centros/rotas.

Texturas novas: `crypt_ground`, `crypt_floor`, `crypt_wall`,
`crypt_sarcophagus`, `crypt_niche`, `crypt_brazier`, `crypt_spikes`,
`crypt_arena`, `crypt_stairs`, `crypt_seal`, `crypt_glow`,
`crypt_necromancer`, `crypt_soul`; animação `crypt_necromancer_walk`.

## Verificação

RED real antes da implementação: `node tests/catacombs_checks.cjs` falhou em
cadeia de fases, mundo ausente, boss ausente, segunda travessia ausente e
vitória ainda no Castelo. O teste posterior de cancelamento de rede falhou
antes de adicionar `cinematicAwait`. O teste de callbacks de morte também
detectou e corrigiu uma variável capturada no escopo incorreto.

GREEN atual: 16 checks VM no arquivo acima, executando os métodos reais:
catálogo/filtros; rotas e entrada com raios 12/24/40; armadilhas/limites;
selos/projéteis/invocações; fatal-hit; callbacks antigos; duas travessias;
carry/totais; offline/guest; menus/porta fechada; cinema de revelação;
fábrica e cura do boss; seleção; duas formas de cancelamento;
vitória final e conclusão única do desfecho.

Também passaram:

- `node tests/gates_checks.cjs` (cinco grupos geométricos legados).
- `node tests/forest_cinema_checks.cjs --unit` (bloqueio de diálogo/HUD).
- `node tests/new_powers_checks.cjs` (17 checks).
- `node tests/ambient_fx_checks.cjs`.
- `node --check` dos onze arquivos de produção sob ownership.

`node tests/new_creatures_checks.cjs`: três checks de criaturas passaram;
o check de seleção de heróis falhou por `window is not defined` na fixture
após mudanças concorrentes de `scenes.js`. Controlador informado e corrigirá
a fixture no seu ownership. Não foi alterado por Task2.

## Pendências e limites

- Integração do root e teste visual/browser são necessários antes de afirmar
  campanha completa funcionando na aplicação. Não houve medição física.
- As suítes browser antigas que esperam vitória no Castelo precisam atualizar
  as expectativas para escadaria e vitória no Necromante.
- `EnemyManager` ainda possuía fallback `stage !== 'forest'` quando recebido
  sem `scene.stage`; o caminho real usa `STAGES.*.enemyIds`. Root foi avisado
  para estreitar esse fallback no arquivo de ownership de Task3.
- Revisão independente final deve ocorrer após os hooks de integração.
