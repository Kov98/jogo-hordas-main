# Task 2 — queda automática e enquadramento do Inferno

Implementado em `js/game.js` e `js/finale.js`.

## Fluxo e interfaces

- O golpe fatal do Cavaleiro continua chamando `beginBossDefeat()` imediatamente.
  `beginCastleVictory()` esconde o HUD, limpa ameaças e fixa `castle-defeat` antes
  dos efeitos de morte. `castleVictory` guarda a mesma promessa em chamadas repetidas.
- `playCastleVictory(initialization)` espera os 2700 ms da morte, esconde a barreira
  e inicia o **CastleFinale existente** com `cinematic === 'castle-fall'`. O filme
  mantém rachaduras, lava, caminhada, queda e fade; termina aos 11 s do próprio filme.
- O callback do filme resolve uma espera cancelável. Só então ocorre o avanço
  explícito para `catacombs`; o Castelo não abre escadaria, não retoma combate,
  não marca `stageCleared` e não envia vitória.
- `commitStageAdvance(advance)` compartilha captura do carry, espera de `runStart`,
  `advanceRun(run_id, targetStage)`, crédito de visitante e restart com a travessia
  Floresta→Castelo. O argumento precisa ser exatamente o token privado
  `#stageAdvance`, criado internamente depois da guarda de entrada ou durante a
  queda. Flags externas `force`/`automatic` não liberam passagem. A promessa do
  commit é única e a identidade da cena é verificada antes/depois das esperas.
- `enterCastle()`, `nearCastleGate()` e `enterNextStage()` continuam compatíveis
  com as fixtures antigas. A entrada manual ainda exige chefe vencido, saída
  aberta, proximidade, cena ativa e ausência de menus. O fluxo normal do Castelo
  usa somente a queda automática, portanto helpers de browser devem aguardar
  `g.finale instanceof CastleFinale` e depois `gameReady && stageId==='catacombs'`.
- `castleVictory` resolve `true` quando o restart foi solicitado e `false` em
  cancelamento. `CastleFinale.elapsed`, `opening`, `lava`, `complete` permanecem
  disponíveis. `onComplete` é limpo ao completar ou no shutdown; capturar o
  callback antes de terminar caso o teste queira simular uma chamada duplicada.

## Carry e cancelamento

Mantidos run ID, início da campanha, dificuldade, perfil/metaRunId, build,
relíquias, loadout, dash, XP/nível, totais, receitas, consumidos e níveis pendentes.
Tempo de cinema não entra em `totalTime`. Falha em `advanceRun` mantém o run e a
build, registra um aviso e segue em prática fora do ranking; uma campanha já
offline não tenta registrar nova passagem.

As esperas de morte, filme, run inicial e rede usam os canceladores existentes.
Shutdown invalida o token privado e a inicialização, resolve esperas com falha,
restaura a política do relógio de tweens e cancela o callback do filme. Respostas
ou rejeições tardias são consumidas sem reiniciar a nova partida. A própria
instância de CastleFinale também verifica a identidade da cena antes de atualizar.

## Chegada e chefe

`playStageArrival()` normaliza alpha/escala/rotação/visibilidade do sprite, sombra,
zoom 1 e follow antes da chegada. Ao terminar, restaura HUD e concede a proteção
de chegada já existente. O carry não contém o estado visual da queda.

O Inferno agora para o follow e enquadra o centro da arena, com pan/zoom até `.65`
em 1400 ms. A arena cabe na tela e o jogador em `A.y + 360` e o chefe em
`A.y - 170` compartilham o enquadramento. Horário 900 s, posições, atributos,
ataques e intro do chefe permanecem intactos. Outras fases mantêm zoom `.85`.

## Evidências

- RED observado no novo teste: CastleFinale ausente depois dos 2700 ms, chegada
  permanecia em escala `.06` e câmera do chefe continuava seguindo o herói.
- `node tests/castle_fall_checks.cjs`: **10/10**, usando GameScene, Boss, Player,
  CastleFinale e lógica de relógio/rede reais em VM; apenas renderizador e avanço
  dos tweens são fixtures. Inclui golpe fatal real, aviso/queda/fade, duplicate
  callback, carry, offline, visitante, run inicial pendente, rede pendente,
  shutdown antes/durante/depois do filme, chegada e gatilho natural aos 900 s.
- `node tests/catacombs_checks.cjs`: **16/16**, expectativa antiga de escadaria
  substituída por CastleFinale→Inferno; compatibilidade das duas travessias mantida.
- `node tests/state_transfer_checks.cjs`: passou.
- `node tests/forest_cinema_checks.cjs --unit`: passou.
- `node tests/interaction_input_checks.cjs`: passou (interação/dash e listeners).
- `node tests/gates_checks.cjs`: passou (portão, corredores e chegada do Castelo).
- Sintaxe de `js/game.js`, `js/finale.js` e teste novo: passou com `node --check`.

Browser/Chrome, API e capturas ficam com o root conforme divisão da tarefa.
