# Task 1 — quatro poderes e definição do Canalizador

Revisão de entrega: 07/11/2026. Implementação conforme
`docs/expansao-poderes/task-1-brief.md` e a spec aprovada.

## Arquivos e comportamento

- `js/data.js`: registra os poderes comuns `cyclone`, `radiant_beam`, `plasma`
  e `meteor`, cada um com sete melhorias próprias e níveis 1–8. Registra
  `CHARACTERS.channeler`: 110 HP, velocidade 165 e poder inicial `plasma`.
- `js/powers.js`: implementa os quatro ataques, animação, mira, modificadores
  e limpeza. Todos os novos danos passam por `scene.damageEnemy`.
- `js/progression.js`: `drawProgressionAssets(scene)` gera os quatro ícones
  e as texturas de combate, sem arquivos externos nem dependências novas.
- `tests/new_powers_checks.cjs`: 17 verificações executáveis em Node VM,
  carregando os catálogos e implementações reais com uma cena mínima.

O Mini Tornado avança na direção da horda, pulsa dano e atrai levemente apenas
inimigos comuns; respeita a resistência a empurrão. O Feixe de Luz mantém uma
faixa branca/dourada ancorada no jogador, com dano periódico em todos os alvos
dentro dela. Plasma usa esferas ciano animadas, rastros elétricos e perfuração;
a colisão percorre o segmento entre quadros para reduzir saltos sobre alvos.
Meteoros fixam coordenadas no aviso, descem com fogo e brasas e explodem em área.

As melhorias usam os modificadores existentes de dano, frequência, alcance e
área. Não foram acrescentadas receitas ou evoluções. A entrada dos poderes no
catálogo comum usa a rolagem existente, que mantém o limite de seis armas.

## Orçamentos e ciclo de vida

| Recurso | Limite por instância |
| --- | --- |
| Tornados | 6 sprites reutilizados |
| Feixe sustentado | 1 sprite reutilizado |
| Meteoros | 8 posições, com 1 marca e 1 rocha por posição: 16 sprites |
| Plasma | Pool global existente de 160 tiros do jogador |

Os quatro poderes juntos acrescentam até 23 sprites persistentes próprios;
nenhum deles cria sprites novos durante o combate. Anéis, raios, faíscas e
brasas passam pelos pools/emissores compartilhados de FX. Os limites de
inimigos e tiros inimigos não foram alterados.

`PowerInstance.destroy()` é idempotente, limpa eventos pendentes e impede
atualizações posteriores. Os novos poderes destroem seus sprites próprios.
Cada tiro de plasma conhece sua instância proprietária: a limpeza cancela
somente seus tiros, preservando tiros de outras armas. Os impactos de meteoro
não retêm referências a inimigos reciclados; usam a posição registrada e
consultam os inimigos vivos no momento do impacto.

## Verificação observada

Antes da implementação, `node tests/new_powers_checks.cjs` falhou como esperado
com `AssertionError: missing common weapon cyclone` (RED).

Após a implementação, e novamente na revisão de 07/11/2026:

```text
node tests/new_powers_checks.cjs
new_powers_checks: 17 checks passed
```

As verificações cobrem:

- catálogo comum, sete melhorias diferentes, mudanças efetivas em cada nível,
  limite no nível 8 e atributos do Canalizador;
- oito casos de dano: quatro poderes nos níveis 1 e 8, com modificadores;
- ausência de dano e de sprites próprios vivos após `destroy()`;
- faixa do feixe: perfuração de alvos alinhados e exclusão dos laterais/traseiros;
- deslocamento e atração do tornado, com chefes imóveis;
- reutilização de objeto inimigo com UID novo durante um tiro de plasma;
- coordenadas de meteoro preservadas quando o alvo original é reciclado;
- cancelamento de meteoro durante o aviso;
- limpeza seletiva dos tiros de plasma;
- pool de 160 tiros e ausência de novas alocações de sprites sob frequência 1000;
- execução dos desenhos procedurais e presença de todos os nomes de textura.

Também passaram, sem mensagens de erro, os quatro comandos de sintaxe:

```text
node --check js/data.js
node --check js/powers.js
node --check js/progression.js
node --check tests/new_powers_checks.cjs
```

## Integração e limites desta entrega

IDs e nomes de assets foram comunicados ao integrador. Texturas disponíveis:
`i_cyclone`, `i_radiant_beam`, `i_plasma`, `i_meteor`, `fx_cyclone` (4 quadros),
`fx_radiant_beam` (4), `p_plasma` (4), `p_meteor` (1), `fx_meteor_mark` (4).
Meteoros consomem `FX.embers(x, y, count)`, fornecido pela integração.

A primeira tentativa de Chrome em 06/11/2026 encerrou com timeout de 30 s ao
aguardar `Game.gameReady`, durante saturação da máquina por processos paralelos.
Ela não chegou aos testes de dano nem às capturas dos quatro poderes. Não há
validação visual concluída ou medição de FPS nesta entrega. A tentativa usava
contexto de navegador novo e não alterou contas existentes.

Por orientação do integrador, nenhum Chrome ou servidor foi iniciado na retomada.
O integrador executará sequencialmente a validação Phaser real, capturas,
transporte de poderes entre fases e suítes completas de regressão. A VM valida
a lógica de combate e os contratos usados pelos desenhos; não substitui a
verificação de legibilidade e renderização no navegador.

Não foram alterados backend, contas, testes existentes, arte dos heróis/criaturas,
cinematografia ou arquivos sob responsabilidade dos demais agentes.
