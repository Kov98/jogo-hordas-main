# Requirements

Spec: docs/superpowers/specs/2026-11-06-poderes-cinema-floresta-design.md

## Global Constraints

- Floresta escura e luzes laranja da alteração anterior preservadas.
- Quatro armas comuns novas com níveis 1–8; seis armas equipadas.
- Canalizador (`channeler`): 110 HP, velocidade 165, poder inicial `plasma`.
- IDs novos: `cyclone`, `radiant_beam`, `plasma`, `meteor`, `forest_witch`, `forest_storm_mage`.
- Respeitar pools existentes: 240 inimigos, 160 tiros do jogador e 140 inimigos.
- Sem dependências novas de execução do jogo; sem alterações em contas existentes.
- Sem .git nesta pasta: trabalhar no local autorizado, com backup ZIP já criado.

### Task 1: Quatro poderes e definição do herói

**Files:** `js/data.js`, `js/powers.js`, `js/progression.js`; teste `tests/new_powers_checks.cjs`.

**Interfaces:** produzir POWERS e POWER_IMPL para os quatro IDs; registrar
CHARACTERS.channeler; `drawProgressionAssets(scene)` gera todos os ícones/texturas.
Consumir FX.ring/burst/bolt e `FX.embers(x,y,count=1)`; todos os danos via damageEnemy.

- [ ] Testar catálogo/níveis, dano efetivo, UID reciclado e limpeza; observar RED.
- [ ] Implementar tornado móvel, faixa de luz sustentada, projéteis de plasma e meteoros com sete upgrades próprios cada.
- [ ] Testar níveis 1/8, modificadores e limites, sem atingir alvos depois de destroy.
- [ ] Conferir sintaxe e registrar resultados para revisão.
