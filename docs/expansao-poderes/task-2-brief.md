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

### Task 2: Criaturas e seleção do Canalizador

**Files:** `js/forest-enemies.js`, `js/enemies.js`, `js/art.js`, `js/sprites.js`,
`js/scenes.js`, `js/config.js`, `LEIA-ME.txt`; teste `tests/new_creatures_checks.cjs`.

**Interfaces:** consumir CHARACTERS.channeler de Task 1. Produzir c_channeler,
walk_channeler, e_forest_witch/e_forest_storm_mage e animações. Catálogo contém
14 comuns da floresta; seus IDs continuam excluídos do diretor do castelo.

- [ ] Testar inclusão/isolamento, padrões anunciados e quatro posições acessíveis; observar RED.
- [ ] Desenhar herói e criaturas com animações próprias; adicionar ataques/ondas progressivas.
- [ ] Adaptar seleção para quatro cartões, descrições/poder/atributos, setas e 1–4.
- [ ] Verificar arte, seleção e ataques; registrar resultados para revisão.
