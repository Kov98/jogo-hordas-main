# Cinco reforços para a legião do Inferno

O Inferno passa de seis para onze espécies ordinárias. Os seis IDs antigos,
Carrasco Acorrentado, Carcereiro Infernal e Arquidemônio das Cinzas permanecem.
Todas as novas definições e artes estão em `js/catacombs-enemies.js`; não houve
mudança em `EnemyManager`, `GameScene` ou nos limites globais.

| ID | Nome | Entrada no Médio | Vida / velocidade / dano de contato | Peso / limite no diretor | Papel e leitura visual |
| --- | --- | --- | --- | --- | --- |
| `inferno_ember_bat` | Morcego da Fornalha | 65 s | 24 / 117 / 6 | 4 / 18 | Voador frágil, movimento ondulado; asas largas e rasgadas, corpo pequeno em brasa. |
| `inferno_chain_lancer` | Lanceiro Acorrentado | 130 s | 78 / 56 / 12 | 3,3 / 10 | Guarda de lança longa e grilhões; linha de 0,9 s anuncia investida de direção fixa, seguida por recuperação. |
| `inferno_pyromancer` | Piromante do Abismo | 220 s | 88 / 39 / 8 | 2,2 / 4 | Manto dividido, máscara em chamas, braseiro e cajado bifurcado; um círculo de fogo com raio 48, aviso de 1,35 s, dano 17 e recarga de 7,5 s. |
| `inferno_furnace_golem` | Golem da Fornalha | 410 s | 270 / 29 / 20 | 1,7 / 5 | Fornalha ambulante com duas chaminés, punhos de ferro e boca gradeada; proteção frontal existente, resistência a empurrão e cone lento de 1,2 s. |
| `inferno_ash_reaper` | Ceifador das Cinzas | 565 s | 112 / 86 / 12 | 2,1 / 6 | Capuz inclinado, manto arrastado e foice longa; aproximação ágil e cone de alcance 175, anunciado por 0,8 s. |

Valores de vida/dano acima são a base. O caminho existente aplica os
multiplicadores de dificuldade, vida da fase e crescimento do diretor uma vez.
Os desbloqueios continuam adiantados por 1,3 no Difícil e 2,5 no Hardcore;
Fácil/Médio usam os segundos da tabela. O golem usa `shield:true` para a redução
frontal já suportada pelo jogo e `kb:.12`; o ceifador usa `kb:.65`.

Dois pequenos packs adicionam composição sem aumentar a capacidade: aos 305 s,
oito morcegos, três lanceiros e dois piromantes; aos 705 s, dois golens, quatro
ceifadores e cinco lanceiros. Os sete eventos anteriores permanecem, totalizando
nove eventos, todos anteriores ao chefe dos 15 minutos. `maxAlive` limita a
escolha aleatória do diretor, seguindo o contrato existente; eventos fixos usam
o teto global compartilhado e podem ultrapassar o limite aleatório de uma espécie.

As cinco artes têm quatro quadros próprios em uma grade 24×24. Não são
recolorações das criaturas antigas. O golem usa `k:2.5` (60 px) e os demais
`k:2` (48 px), com `visualScale:1`. A geração normal de `SPR.generateAll` registra
as chaves `e_<id>` e `walk_e_<id>`; a derrota reutiliza `e_<id>`, quadro zero,
no pool de corpos existente. O custo bruto das cinco folhas é **205.056 bytes
RGBA**, antes de sobrecarga de textura da plataforma. A arte é gerada uma vez;
não acrescenta objetos de exibição, emissores, luzes ou desenho por quadro.

Não há novos projéteis, invocações, timers ou callbacks. Os ataques usam as
rotinas existentes de `flyer`, `charge`, `shell` e `sweep`. O piromante cria
somente um perigo por recarga; cada cone cria somente um perigo. O pool mantém
240 inimigos, com as duas reservas existentes para os minibosses. Ao morrer,
a criatura deixa de receber IA e não pode iniciar ataques. Como nas espécies
anteriores, um perigo já anunciado pertence à cena e termina mesmo se o autor
morrer; as limpezas gerais de cinema/chefe/fim de fase continuam removendo os
perigos. Não foi adicionada uma política diferente para os cinco reforços.

## Verificação local

- RED: a nova VM falhou em 6/11 espécies, 7/9 eventos e definições/artes ausentes.
- GREEN: `node tests/inferno_legion_checks.cjs` — 9 grupos passaram. Executa os
  catálogos, diretor, IA, pen de pixels e derrota reais; cobre isolamento de fase,
  desbloqueio e limite nas quatro dificuldades, avisos fixos, recarga, pausa de
  ataque, direção da investida, escala de vida/dano, reserva de minibosses,
  limpeza silenciosa, morte e chaves de textura. O raster de 20 quadros comprova
  que nenhuma pintura excede 24×24, as cinco silhuetas diferem sem depender da
  paleta e cada espécie tem ao menos três poses visualmente distintas.
- `node tests/catacombs_checks.cjs` — 16 grupos passaram, incluindo progressão,
  minis/chefe, cinema, passagem de fase e cancelamento de esperas antigas.
- `node tests/safe_spawns_checks.cjs` — 6 grupos passaram, preservando projeção
  segura, posição de eventos e reservas dos minis.
- `node --check js/catacombs-enemies.js` — passou.

Não foram usados Chrome, API ou servidor nesta subtarefa. A validação visual
no navegador e a inclusão dos IDs no whitelist de `server.py` ficam com a
integração principal; os testes VM não comprovam a renderização final do Phaser.
