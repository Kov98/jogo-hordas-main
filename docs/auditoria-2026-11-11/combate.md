# Auditoria de combate — 11/11/2026

Escopo: `powers.js`, `player.js`, `enemies.js`, `boss.js`, `forest-boss.js`, `catacombs-boss.js`, catálogos e grade espacial. Execução local em Node/VM, sem navegador, HTTP ou servidor. Apenas o renderizador foi substituído nos testes; dano, poderes, grade, IA, gemas, dificuldades e pools executam código real.

## Problemas confirmados e corrigidos

| ID | Severidade | Evidência anterior à correção | Correção |
| --- | --- | --- | --- |
| C-01 | Média | A grade é construída antes dos ataques do jogador. Um `skel_warrior` morto pelo golpe real permanece nela até o próximo quadro; `EnemyManager.update` ainda aplica contato, reduzindo HP de **110 para 104**, mesmo com `alive === false`. Também pode causar morte se o jogador tiver pouca vida. | `enemies.js`: contato ignora entidades mortas. |
| C-02 | Média | Com `magnetAll`, gema a 1015 px e `dt = 0.05` permitido pelo jogo, a aceleração chega a 700 px/s. Passos de 35 px deixam a gema alternando entre +17,5 e −17,5 px; a condição antiga exigia distância anterior menor que 16. Após 100 quadros, XP continuava **0**, em vez de **1**. A mesma movimentação também afeta carne de cura. | `enemies.js`: coleta antes do movimento quando o passo alcança o jogador, evitando ultrapassagem e oscilação. |
| C-03 | Baixa | A onda do Cavaleiro Sombrio ignorava `difficulty.projectileMul`. No Hardcore permanecia a **330 px/s**, enquanto o multiplicador de 1,25 exige **412,5 px/s**; as ondas dos chefes da floresta e catacumbas já aplicavam esse fator. | `boss.js`: aplica o multiplicador de velocidade uma vez. Teste também confirma dano **39,6 = 22 × 1,8**, sem duplicar multiplicador de dano. |

As três regressões foram escritas e executadas antes da respectiva alteração de produção. Os dois primeiros testes falharam com `104 !== 110` e `0 !== 1`; o terceiro falhou por velocidade Hardcore incorreta. Após alterações mínimas, todos passaram. Testes em `tests/combat_audit_checks.cjs`.

## Cobertura e verificações

| Comando | Resultado |
| --- | --- |
| `node tests/combat_audit_checks.cjs` | 3 verificações passaram |
| `node tests/new_powers_checks.cjs` | 22 verificações passaram |
| `node tests/evolutions_relics_checks.cjs` | 19 verificações passaram |
| `node tests/new_creatures_checks.cjs` | 4 verificações passaram |
| `node tests/catacombs_checks.cjs` | 16 verificações passaram |
| `node tests/safe_spawns_checks.cjs` | 6 verificações passaram |

O Feixe de Luz foi revisado com os testes existentes: selo circular anunciado antes do dano; pulsos espaçados; raio e alcance modificados; coordenadas fixas após reciclagem de UID; fonte acima da câmera e acompanhamento de movimento da câmera; expiração e cancelamento por `destroy`. Nenhuma nova falha de dano ou geometria do feixe foi reproduzida nesse ambiente.

Também foram verificados: níveis máximos, modificadores e relíquias sem deriva, interrupção de efeitos na evolução, orçamento de imagens persistentes, pools saturados, UID novo ao reutilizar inimigos, meteoros em posição anunciada, telegráficos dos inimigos e limite de invocações do chefe das catacumbas.

## Limitações e encaminhamentos

Não houve validação visual em navegador, medição de desempenho real, áudio, input físico ou comunicação com backend. Os testes de renderização confirmam posição/dimensão/visibilidade declaradas, não os pixels finais do Phaser.

O processamento restante do quadro após a morte do jogador e os bloqueios em `GameScene.damageEnemy` foram encaminhados ao responsável pela auditoria de campanha, que corrigiu esse escopo separadamente.

Há uma observação visual encaminhada para inspeção posterior: durante filmes de derrota dos chefes, a atualização dos poderes fica suspensa e algumas imagens de ataques ativos podem permanecer congeladas. Não foi tratada como falha confirmada, pois a aparência final não foi reproduzida no navegador; `game.js` e `finale.js` pertencem à revisão de campanha.
