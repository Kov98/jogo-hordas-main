# Task 3 — exploração e áudio

Implementação entregue em `js/exploration.js`, `js/soundscape.js`, `js/audio.js`
e nos hooks restritos de `js/enemies.js`. Sem bibliotecas novas, Git, Chrome,
API ou instalação de dependências. Integração de cenas/UI/scripts pelo root.

## Contratos para integração

- `ExplorationSystem(scene, saved = {})`: `update(dt)`, `interact(): boolean`,
  `getPrompt(): string`, `getStatus()`, `onKill(enemy)`, `beforeBossFight()`,
  `capture()`, `destroy()`.
- `getStatus()` retorna `{altarsUsed, altarCount, symbolsFound, symbolCount,
  secretState, boss}`; `boss` é `null` ou `{name, hp, maxHp}`. A barra opcional
  deve consultar esse objeto, sem tratar o encontro como chefe oficial.
- O menu define `exploration.menuOpen` e `scene.explorationOpen` antes de pausar.
  O chamador deve retornar imediatamente após a interação abrir menu, e impedir
  baú, level-up, pausa adicional e travessia enquanto esse latch estiver ativo.
  Teclas e toque devem chamar a mesma prioridade de interação.
- `capture()` retorna `{altars:[{used}], symbols:[boolean], secretState,
  rewardClaimed, chestDelivered, rewardPosition, recorded}`. Usar somente no
  checkpoint da própria fase; não transportar consumo para a próxima fase.
  Encontro ativo restaurado vira santuário pronto, sem restaurar objeto/UID ou
  conceder recompensa. O checkpoint de entrada continua determinando o retry.
- Registrar `exploration.js` depois de `data.js` e `sprites.js`, antes de
  `stages.js`. O módulo registra `ENEMIES.forest_oathkeeper` e arte customizada
  `ENEMY_ART.forest_oathkeeper.fn = drawOathkeeperSprite`, quatro quadros.
  `SPR.generateAll(scene)` deve chamar `drawExplorationAssets(scene)`; gera
  `exploration_altar`, `exploration_symbol_0/1/2`, `exploration_shrine`.
- `MetaProgress.record({type:'altar',id:'<stage>:altar_<1|2>'}, scene.metaProfileKey)`
  ocorre na confirmação. O segredo usa exatamente
  `record({type:'secret',id:'forest-oathkeeper'}, scene.metaProfileKey)`.
  Hooks são opcionais e falhas cosméticas não interrompem a partida. O estado
  capturado preserva os IDs já emitidos; root mantém a identidade inicial do perfil.
- `Soundscape(scene).update(dt)/destroy()` compartilha `Sfx.ctx/master`.
  `syncBlock()` é útil logo após atribuir `cinematic/transitioning/ended`.
  `silence()` remove nós imediatamente; `syncBlock()` também fecha o master.
  Destruição deve ocorrer no shutdown, já registrado internamente.

## Comportamento e limites

Há dois altares por fase. A escolha mostra três relíquias disponíveis, descrição,
contrapartida, custo de 25% do HP máximo e risco de emboscada de 35%. Confirmação
revalida HP não letal, inventário máximo de três, propriedade e estado do menu.
Cancelar, erro ao abrir diálogo, inventário cheio e oferta inválida não cobram.
Emboscadas tentam no máximo oito spawns e respeitam a capacidade do pool existente.

Floresta: altares em `(1040,3260)/(2820,1020)`, símbolos em
`(650,1680)/(3470,2310)/(1540,1110)` e santuário em `(1160,1190)`.
Castelo: altares nas praças `(850,3150)/(3150,850)`. Catacumbas: pontos reservados
pelo owner do mapa `(1100,1160)/(2900,2860)`. Todos passam por constraint/clearance
de obstáculos e separação. As texturas não criam emissores ou timers.

Três símbolos distintos ativam o santuário. Pool cheio mantém invocação pendente.
O Guardião usa `isBoss` e `isExplorationBoss`, sem `isMiniBoss`; um objeto e UID
capturados validam o crédito. Tem investida anunciada, dano de contato controlado,
selos fixados antes de explodir (1,25 s; na segunda metade três selos, até 1,5 s).
As ameaças próprias carregam `explorationUid` e são removidas ao encerrar.
Sua morte real entrega um baú, com retry se o pool de baús estiver cheio, e libera
uma escolha opcional de relíquia sem custo ao retornar ao santuário. O visual
Juramentado é evento local. Nada chama vitória, conclusão da fase ou boss oficial.

`EnemyManager.spawn` limpa `isExplorationBoss` em todo objeto reutilizado.
`EnemyManager.kill` chama exploração depois do retorno de morte silenciosa.
O diretor exclui `explorationOnly`, peso zero e `from:Infinity`; seu fallback só
aceita fase ausente/Castelo. Listas vazias não causam spawn inválido. A flag
`isBoss` protege o Guardião contra desalojamento pelo diretor de mini-chefes.

Áudio: até dois loops (vento filtrado e drone) e seis vozes musicais; agenda pelo
update, sem intervalos. Tema varia por fase e intensidade por proximidade,
chefe/segredo e fúria. Só gesto de usuário cria AudioContext. `Sfx.muted=true` e
`Sfx.toggle()` zeram o master e encerram fontes correntes imediatamente.
Pausa/sleep, blur/foco, visibilidade, diálogo e shutdown removem loops/vozes;
pausa também corta SFX em execução. Sem WebAudio, o jogo continua utilizável.

## Verificação

RED inicial: sete checks falharam por ausência dos dois módulos. GREEN final:
`node tests/exploration_audio_checks.cjs` — **14 checks passaram**. Casos incluem
custo/cancelamento/consumo único/HP letal, capacidade e propriedade alteradas,
falha de diálogo, menu sobreposto, limiar 35%, pool de inimigos cheio, símbolos
distintos, UID reciclado, morte silenciosa, cleanup antes do boss oficial,
baú cheio/checkpoint/entrega única, exclusão do diretor, mute imediato,
limites e lifecycle do áudio, SFX correntes, ausência de WebAudio e fábricas de arte.
O décimo quarto check carrega `GameScene.damageEnemy` real e aplica um primeiro
golpe e um golpe fatal ao Guardião real do pool: HP/dano contabilizado, ausência
de knockback, apenas uma morte/baú/evento local e nenhuma conclusão oficial.
Regressões novas tiveram RED confirmado antes da correção: diálogo não liberava
pausa, ID local do segredo incompatível, modal sobreposto aceitava confirmação,
baú pendente não era entregue durante o boss oficial, fallback incluía Catacumbas.

Revisão independente encontrou P1 no contrato `isBoss`: o dispatch de dano
chamava `hurt()`, exclusivo dos chefes oficiais, para o Guardião do pool.
Reprodução RED confirmou `e.hurt is not a function`. Root corrigiu a condição
de `GameScene.damageEnemy` para `e.isBoss && !e.isExplorationBoss`, mantendo as
flags defensivas do encontro opcional. O RED seguinte confirmou knockback de
500 indevido; `forest_oathkeeper.def.kb = 0` corrigiu essa parte. GREEN final:
os 14 checks passaram, incluindo o caminho real de morte e recompensa.

`node --check` passou para os quatro arquivos de produto e o teste.
Na execução ampliada de `tests/*_checks.cjs`, passaram também Catacumbas (16),
evoluções/relíquias (18), metaprogressão (6), novos poderes (17), novas criaturas
(4), gates e ambiente. `finale_checks.cjs` saiu com código 0.

Limites da execução ampliada: `forest_cinema_checks.cjs` e `selector_checks.cjs`
falharam ao carregar `playwright` ausente, antes de abrir navegador;
`state_transfer_checks.cjs` falhou em IDs de relíquias do snapshot durante a
integração concorrente do root. Esses três resultados foram informados ao root.
Validação visual, navegador, HTTP e revisão independente ficam com o controlador;
não foram reivindicados por esta tarefa.

## Revisão P2 — nascimento depois da projeção de paredes

O controlador autorizou adicionalmente `js/encounters.js` e o novo
`tests/safe_spawns_checks.cjs` para corrigir a garantia de distância nas
Catacumbas. RED com `CatacombWorld` real confirmou quatro falhas: ponto oeste
aceito antes de ir para apenas 10 px do jogador, horda ainda fora da área
caminhável, eventos sem projeção prévia e mini consumido em posição insegura.

Contrato novo em `EnemyManager`:

- `projectSpawn(typeId,x,y,minDistance=480)` projeta usando `def/radius/ghost`
  reais, exige posição estável em até 12 constraints, verifica obstáculos e
  distância **final** maior que 480 px. Posição inválida retorna `null`.
- `spawnPoint(minD,maxD,typeId?)` conserva os dois argumentos antigos e aceita
  espécie opcional; tenta até oito candidatos já projetados e revalidados.
- `spawnAway(typeId,x,y,hpMul,summoned=false,scheduled=false)` publica somente
  a posição segura. Diretor e eventos ring/swarm/pack usam essa entrada,
  inclusive depois do jitter. Eventos omitem candidatos inseguros; o pack não
  usa mais o fallback não validado `player.x+600`.
- Mini-chefes passam seu ID antes da busca, mantendo o raio correto. Sem
  destino seguro, a chamada futura tenta novamente e nenhum inimigo é
  desalojado antecipadamente, mesmo com o pool lotado.
- `spawn()` permanece exato para invocações intencionais, encontro secreto,
  emboscadas anunciadas e colocações diretas de testes. Não há nova fila,
  pool, atraso global ou alteração da capacidade reservada dos mini-chefes.

GREEN: seis checks de `safe_spawns_checks.cjs` passaram com `World`,
`ForestWorld`, `CatacombWorld`, `EnemyManager` e `EncounterDirector` reais.
Cobrem a reprodução (700,700)/(190,700), espécies de raios distintos, horda,
três formatos de evento, mini adiado com pool cheio, retry posterior seguro,
invocação direta preservada e destinos estáveis/longe do jogador na Floresta
e no Castelo. Sintaxe de enemies/encounters/test passou.

Regressão ampliada nessa revisão: exploração14, evoluções19, novos poderes17,
novas criaturas4, gates, ambiente, meta6, state-transfer e finale passaram.
`catacombs_checks.cjs` apresentou duas falhas nos fixtures convidados
(avanço e vitória esperavam callbacks do perfil atual), após a alteração
concorrente do contrato de perfil inicial pelo root; nenhuma passa por
EnemyManager/EncounterDirector. Resultados informados ao controlador para
atualizar os fixtures. Nenhum Chrome ou API foi executado nesta revisão.
