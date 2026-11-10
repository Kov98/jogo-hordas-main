# Revisão independente — campanha, exploração e áudio

Revisão de 2026-11-09, após a integração de `game.js`/`stages.js` pelo
controlador. Foram lidos especificação, plano, preflight e relatórios das
Tasks 2/3. A revisão inicial foi sem edição do produto. Na última rodada,
o controlador delegou exclusivamente ao revisor a correção do latch de
interação descrita abaixo. Sem Chrome, servidor HTTP ou API nesta revisão.

## Achados materiais

### P1 — Guardião não recebia dano pelo caminho real de combate — corrigido

- Local: `js/game.js:413`, em combinação com `js/exploration.js:244`–`246`
  e a classe `Enemy` em `js/enemies.js:101`.
- O encontro marca o inimigo do pool como `isBoss`. `damageEnemy` encaminhava
  qualquer `isBoss` para `e.hurt(dmg)`, método que só os chefes oficiais
  possuem. Primeiro ataque no Guardião lançava `TypeError: e.hurt is not a
  function`, impedindo combate/recompensa do segredo.
- Reprodução independente em VM: instanciar o `EnemyManager` real e
  `ExplorationSystem` com três símbolos, interagir no santuário e chamar
  `GameScene.prototype.damageEnemy` no inimigo invocado. Antes da correção:
  `forest_oathkeeper`, `isBoss=true`, `hurt=undefined`, HP 2300; dano 100 lança
  a exceção acima. Os testes anteriores matavam diretamente pelo manager,
  sem atravessar o caminho de dano do jogador.
- Correção do controlador revisada: `isBoss && !isExplorationBoss` seleciona
  apenas o caminho dos chefes oficiais e `kb:0` em `js/exploration.js:26`
  conserva a imunidade a empurrão. O novo teste integrado de dano/abate,
  contagem, recompensa única e ausência de avanço oficial passou.

### P2 — Projeção de spawns nas paredes podia fazer hordas/minis surgirem sobre o jogador — corrigido

- Local original: `js/catacombs.js:49`–`50`, em combinação com
  `spawnPoint`, diretor/eventos e a chamada de `constrain` na IA em
  `js/enemies.js`. Correção atual em `js/enemies.js:215`–`292` e
  `js/encounters.js:28`–`38`.
- `spawnPoint` aceitava a distância antes de respeitar as câmaras/corredores.
  No primeiro update, `CatacombWorld.constrain` projetava o inimigo de uma
  parede para a posição caminhável mais próxima, sem verificar a distância
  do jogador novamente. A geometria nova invalida a garantia de nascimento
  longe do jogador usada pelo diretor e pelos minis.
- Reprodução geométrica com o `CatacombWorld` real da VM: jogador em
  `(700,700)` é caminhável. Um candidato `(190,700)` passa o teste `>480`
  após o clamp da borda. Com raio 12, `constrain` o leva a `(672,700)`,
  apenas 28 pixels do jogador. Para mini de raio 30, o destino é `(690,700)`,
  dentro do raio de contato combinado. Esse candidato é produzido ao sortear
  direção oeste com as distâncias normais de spawn de 620–780.
- Correção do controlador revisada: `projectSpawn` estabiliza a posição com
  o raio e propriedades reais da espécie, recusa obstáculos/resíduos de
  colisão e valida distância `>480` depois da projeção. Diretor e eventos
  usam `spawnAway` para validar também cada offset/grupo e espécie. Minis
  só desalojam um inimigo comum depois de encontrar ponto seguro. Invocações
  intencionais continuam usando o `spawn` de coordenadas explícitas.
- O novo teste `tests/safe_spawns_checks.cjs` passou em seis grupos usando
  os três mundos reais. Ele reproduz o candidato oeste, cobre jitter,
  eventos, raio dos minis, adiamento sem desalojamento e preservação de
  invocações. Nenhuma regressão material identificada no re-review.

## Ajuste adicional de mute revisado

`js/audio.js:18`–`25` agora cancela a automação do master desde zero e define
`gain.value` diretamente. O controlador informou RED no Chrome real com a
versão anterior (`muted=true`, loops encerrados, mas ganho ainda em 0,22).
A alteração preserva suspensão por proprietário e limpeza imediata das
fontes. Revisão estática e os 14 checks VM de exploração/áudio passaram.
O resultado browser pertence ao controlador e não foi reproduzido nesta
revisão independente.

## Re-review do latch de interação rápida

O controlador adicionou `requestInteract` em `js/game.js`, alimentado por
`keydown-E`/`keydown-ENTER`, para preservar taps cujo keyup ocorre antes do
próximo update. O consumo eager dos dois flags de `JustDown` evita a segunda
interação no quadro seguinte. Guards recusam teclas durante cinema, menus,
transições, morte e inicialização; `buildScene`/`clearCinematicInput` zeram o
latch em reinícios e nas duas pontas de um cinema.

**P2 — interação enfileirada antes da pausa atravessava o menu — corrigido.**
O latch ainda não era limpo nos eventos `pause`/`sleep`. Reprodução VM com
`buildScene` e `readInput` reais: emitir `keydown-E`, pausar e retomar antes
do próximo update resulta em `requestInteract=true` durante a pausa e
`readInput().interact=true` ao retomar. Perto de um altar/saída, isso abre
a interação depois do menu. Phaser zera seus próprios flags na pausa,
mas o latch adicionado é independente.

Sob delegação exclusiva do controlador, o revisor adicionou a limpeza do
latch e dos dois `Key`s em `js/game.js:176`–`194`, para pause/sleep, blur do
jogo e blur da janela. Shutdown limpa o latch e remove todos esses listeners,
inclusive os dois de keydown, para não acumular callbacks no novo build.
`tests/interaction_input_checks.cjs` executa `buildScene`/`readInput` reais:
antes da correção, falharam as expectativas de pausa e cleanup (RED);
depois, passaram os grupos correspondentes (GREEN). Os grupos cobrem consumo único
do tap, bloqueios/cinema, descarte nas quatro fronteiras e shutdown/rebuild.

A revisão separada confirmou o cleanup, e encontrou uma borda adicional:
o `Key.onDown` real do Phaser marca `JustDown` no primeiro autorepeat depois
do reset da pausa. Ignorar só `event.repeat` deixava o fallback de `readInput`
aceitar essa repetição como uma nova interação. A confirmação usou `Key` e
`JustDown` reais extraídos do bundle Phaser em VM, sem browser. O teste
adicional falhou antes da correção; `queueInteraction` agora consome ambos
os flags no ramo repeat (`js/game.js:163`–`167`) sem apagar um tap genuíno já
enfileirado. Os cinco grupos de `interaction_input_checks.cjs` passaram.

Na mesma execução independente, uma tecla emitida com menu já aberto não
enfileirou ação; `clearCinematicInput` e novo `buildScene` não deixaram ação
pendente; e o segundo `readInput` não repetiu a interação. O browser focado
informado pelo controlador não foi aberto nesta revisão.

## Evidência e alcance

Após as correções P1/P2 e os ajustes de mute/interação, passaram nesta revisão:

- `node tests/interaction_input_checks.cjs`: cinco grupos, com RED→GREEN
  confirmado para a interação acumulada, cleanup dos listeners e autorepeat
  depois do reset da pausa.
- `node tests/safe_spawns_checks.cjs`: seis grupos com geometria real.
- `node tests/exploration_audio_checks.cjs`: 14 checks, incluindo dano real
  no Guardião, altares não letais, cancelamento, UID reciclado/morte silenciosa,
  pool cheio/recompensa única e ciclo de mute/pausa/blur/shutdown.
- `node tests/catacombs_checks.cjs`: 16 checks, incluindo rotas e entrada,
  armadilhas, selos/almas/invocações, duas travessias, cancelamento de rede e
  vitória somente nas Catacumbas.
- `node tests/state_transfer_checks.cjs`: carry/checkpoint, relíquias, loadout
  e origem do perfil da partida.
- `node --check` de `enemies.js`, `encounters.js`, `audio.js`, `game.js` e
  `interaction_input_checks.cjs`.

Status do último re-review: nenhum achado material aberto. A revisão
separada confirmou o cleanup de pausa e revelou o autorepeat acima, que
também foi corrigido e validado por RED→GREEN. No retorno final, o revisor
separado executou os cinco grupos e confirmou com `Key`/`JustDown` reais,
tanto E quanto Enter, que autorepeat é descartado e um tap genuíno pendente
permanece válido exatamente uma vez. Sem achados materiais remanescentes.

A revisão estática não identificou outros problemas materiais nas saídas
de fase, acesso à escadaria, exclusividade dos inimigos/minis, dano do
Necromante, vitória final, cancelamento de operações assíncronas, pagamento
de altares, identidade do Guardião ou limites/limpeza do áudio. A validação
visual/browser e HTTP pertence ao controlador; não foi reivindicada aqui.
