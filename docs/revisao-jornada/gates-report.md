# Task 2 — Fachada física e entrada sul

Implementação limitada a `js/forest.js`, `js/map.js`, `js/forest-art.js` e
`tests/gates_checks.cjs`. Sem commit, agentes adicionais, dependências ou
reinício do servidor 5501.

## Interfaces e geometria

- `ForestWorld.gate` continua `{x:2000,y:500}`.
- A face física da muralha atravessa toda a largura em `y=500`. Fechada,
  contém entidades ao sul de `500 + raio`, incluindo o centro da porta.
- Aberta, preserva as alas sólidas e libera apenas o corredor entre
  `x=1928` e `x=2072`. O fundo em `y=400` impede caminhar sobre a construção;
  o círculo do personagem deve caber entre as ombreiras. Os cantos usam
  distância círculo/retângulo e os subpassos do dash continuam contidos.
- `isAtCastleDoor(entity)` é uma consulta geométrica: centro em
  `2000 ± (72 - raio)`, entre `400 + raio` e `600`. O ponto legado
  `(2000,580)` é aceito e as laterais são recusadas. O GameScene continua
  responsável por exigir `gateOpen` e `stageCleared` antes da transição.
- `World.entry = {x:2000,startY:3806,endY:3640}`. A animação pode começar
  dentro da porta sul, caminhar 166 pixels para o norte e liberar o jogo.
  O corredor e suas margens não recebem sólidos aleatórios; foi percorrido
  com raios 12, 24 e 40, inclusive com deslocamentos laterais de ±24.
- `entry` nasce em `World.build()`, não no construtor compartilhado.
  `ForestWorld.build()` virtual não cria uma porta sul nem herda a reserva.

## Cenário

Fachada central de 768×480 pixels com torres de guarda, ombreiras, brasão,
pedras desencontradas, correntes, fissuras, hera e lanternas proporcionais.
Alas repetidas de pedra chegam às duas bordas e se ligam às árvores.
O portão troca entre folhas fechadas e passagem iluminada. O castelo recebe
somente a vista interna da porta sul, tochas, estandartes e piso de chegada.

`inCastle` reserva toda a faixa ao norte de `y=610`; `free` respeita essa
faixa. A trilha principal, os encontros e o restante do ambiente foram
preservados. O teste antigo que esperava a trilha livre até a coordenada
da porta deve deixar de exigir passagem pela própria porta fechada.

## Verificação

TDD RED observado antes da implementação:
`node tests/gates_checks.cjs` falhou com
`Closed facade crossed: r12 x200, y227.51385855913009`.

GREEN final:

- `node tests/gates_checks.cjs`: 4 grupos aprovados usando os builders,
  grade e colisões reais em VM; apenas o desenho é substituído.
- Exportação `async function(page)` executada em Chrome/Phaser reais contra
  o servidor 5501: 5 grupos aprovados, nenhum `pageerror`. Além da geometria,
  usa `Player.update` real para dash nos níveis 1/2/3, com e sem fumaça:
  porta fechada, entrada aberta, alas, saída lateral e fundo do corredor.
- `node --check` nos três arquivos de produção e no teste; `git diff --check`.
- Chegada real em `?char=mage&god&nointro&stage=castle`: `gameReady=true`
  com jogador exatamente em `{x:2000,y:3640}` após a animação integrada.
- Capturas inspecionadas em `/tmp/journey-gates/closed.png`, `open.png`,
  `wing.png`, `edge.png` e `castle.png`; sem imagem de castelo duplicada.

A suíte integral de API e navegador permanece com a integração da raiz;
este relatório descreve a verificação específica da Task 2.
