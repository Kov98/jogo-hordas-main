# Re-revisão dos cinco achados — 04/11/2026

Escopo: fechamento dos cinco achados de `whole-review.md`, usando o diff
`/tmp/muralha-review-retomada.diff` de `ec950d0` para a árvore atual, o
checkpoint `dbecd323be88999d56bf9f4c69e572486fcc5b40` e a evidência atual de
`whole-fix-report.md`. Revisão de leitura; este relatório é o único arquivo
escrito. Sem alterações de runtime, commits, subagentes ou repetição de suítes.

As correções centralizam as duas decisões que antes podiam divergir: a
posição física dos baús passa por `dropChest`, e toda criação comum de
inimigos passa pela reserva em `spawn`. A soltura do joystick continua
vinculada ao identificador do próprio ponteiro.

## 1. Dois dedos e soltura independente — ADDRESSED

- Código: `js/main.js:11–12`, `js/ui.js:31–34` e `js/game.js:100–109`.
  `activePointers: 3` habilita os dois contatos utilizados pelos controles.
  Conferi somente trechos do `InputManager` em `js/phaser.min.js`: o mouse
  ocupa `pointers[0]`; `onTouchStart`, `onTouchMove` e `onTouchEnd` percorrem
  `1 <= i < pointersTotal`. Portanto, com o contador 2 havia apenas um
  contato utilizável; com 3 os índices 1 e 2 são processados.
- O botão solicita DASH sem trocar o identificador do joystick. O handler
  `pointerup` do jogo ignora um identificador diferente daquele do joystick.
- Regressão lida: `tests/browser_expansion.cjs:301–327` segura e move o
  contato 1, confirma deslocamento real do jogador, adiciona o contato 2,
  observa a recarga do DASH e solta o contato 2 preservando o joystick.
  Depois encerra o contato restante e observa o joystick inativo.
- Evidência fornecida: `whole-fix-report.md:23–48` distingue a falha real do
  contador da soltura incorreta no antigo comando CDP, e registra o probe
  corrigido aprovado. `touch-probe.log` permanece como evidência histórica
  da falha com 2, não como resultado da árvore atual.
- Nenhuma quebra nova identificada nas linhas corrigidas.

## 2. Baús alcançáveis e retry — ADDRESSED

- Código: `js/progression.js:47–83`, em conjunto com
  `js/map.js:312–328`. O baú usa o raio do jogador e `world.constrain`, que
  aplica limites do mundo, obstáculos ou o limite circular da arena ativa.
  O laço reconfirma a posição depois dos deslocamentos por colisão; uma
  posição ainda sobreposta a sólidos é recusada. A posição do jogador é
  uma segunda candidata quando o ponto pedido não se resolve.
- O limite de oito baús permanece. Uma tentativa sem posição válida ou sem
  orçamento retorna `null`; o suprimento só entra em `supplemental` se
  `dropChest` devolver o baú, permitindo retry nos próximos updates.
- Regressões lidas: `tests/browser_expansion.cjs:161–187` verificam os
  quatro cantos com coleta física após `constrain`, entrega dentro da
  arena já bloqueada, obstáculo, limite de oito e entrega posterior quando
  o orçamento volta a permitir.
- Evidência fornecida: os 12 grupos atuais incluem esses cenários
  (`whole-fix-report.md:58–64`). Nenhuma quebra nova identificada no fluxo
  corrigido de posicionamento e entrega.

## 3. Reserva central para os encontros de 300/600 s — ADDRESSED

- Código: `js/enemies.js:133–143`, `:221–255`, `:344–352` e
  `js/encounters.js:26–39`. O limite comum está em `spawn`, portanto cobre
  diretor, eventos ring/swarm/pack e invocação, inclusive chamadas com
  `summoned: true`. Somente os encontros agendados passam `scheduled: true`,
  ainda sujeitos à existência de um objeto livre no pool físico.
- A reserva acompanha os encontros ainda não criados. No pool 240, o
  limite total de spawns comuns é 238 antes do primeiro encontro e 239
  depois dele enquanto o segundo está pendente. Como `alive` também conta
  o miniboss vivo, a vaga seguinte permanece livre sem depender de mortes.
- Regressão lida: `tests/browser_expansion.cjs:192–203` satura o pool comum,
  tenta o evento de 270 s, cria o primeiro mini em 300 s, satura novamente
  com chamadas de invocação, tenta outro evento e cria o segundo em 600 s.
  A simulação registrada chegou a 900,05 s e pico 240 com os dois encontros.
- Nenhuma quebra nova identificada nas linhas da reserva ou do bypass.

## 4. Limites customizados 1/2, prioridade e ausência de XP grátis — ADDRESSED

- Código: `js/enemies.js:133–135`, `:166–182` e
  `js/encounters.js:30–39`. A reserva deixa ao menos uma vaga para hordas
  comuns. Se o pool estiver fisicamente cheio quando um encontro vence,
  somente um inimigo comum pode ceder lugar por `kill(ordinary, true)`.
  Esse caminho retorna antes de abates, XP, gemas, cura ou recompensa mini.
- Miniboss e chefe vivos não são escolhidos para remoção. Com capacidade
  1, o segundo encontro permanece pendente enquanto o primeiro ocupa a
  vaga e tenta novamente após a morte dele. Com capacidade 2 há espaço
  para ambos. A ordem do loop real (`js/game.js:371–372`) mantém a
  prioridade do encontro mesmo se o diretor ocupar uma vaga naquele frame.
- Regressão lida: `tests/browser_expansion.cjs:204–222` exige horda inicial
  em ambos os limites, primeiro encontro, preservação do mini vivo no
  limite 1, retry posterior e ausência de alteração em XP/abates durante
  as remoções silenciosas.
- Nenhuma quebra nova identificada; o atraso no segundo encontro com uma
  única vaga corresponde à decisão explícita registrada em `progress.md:28`.

## 5. Dificuldade na tela End — ADDRESSED

- Código: `js/scenes.js:206–209`. O texto agora é inserido após os dois
  retângulos de fundo, acima deles na ordem de desenho de mesma profundidade.
- Regressão lida: `tests/browser_expansion.cjs:289–300` confere presença,
  visibilidade, alpha e ordem/profundidade dos retângulos sobrepostos.
- Inspecionei a captura existente
  `/tmp/muralha-expansao/resultado-hardcore.png`: `HARDCORE` está legível
  acima do título e dos fundos. Nenhuma quebra nova identificada.

## Limites / comportamentos não reabertos

- Funcionalidades fora dos cinco achados, autenticação e backend: fora
  desta re-revisão; não foi feita nova revisão integral.
- Transição de baús já existentes para a arena do chefe: fora da mudança
  revisada em `dropChest`; a conferência da arena acima cobre criação com
  `arenaLock` já ativo, conforme a regressão fornecida.
- Equilíbrio humano, FPS, frame pacing e aparelhos móveis físicos: a
  simulação com invencibilidade não mede esses comportamentos.
- Nova execução independente das suítes: expressamente dispensada nesta
  tarefa. Os 12 grupos e zero erros JavaScript são resultados fornecidos
  em `whole-fix-report.md`, não uma alegação de execução por este revisor.

## Veredito

**Aprovado no escopo: 5/5 ADDRESSED.** Nenhum achado crítico/importante
remanescente dos cinco itens e nenhuma quebra nova identificada nas linhas
corrigidas. A conclusão combina leitura dos caminhos reais, inspeção da
captura atual e a evidência de testes registrada pelo implementador.
