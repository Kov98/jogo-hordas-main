# Inferno e magia — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Substituir Catacumbas por uma fortaleza do Inferno e melhorar o visual do tornado/feixe.
**Architecture:** Três tarefas de arte em paralelo com arquivos exclusivos;
root integra nomes, menus, cinema, áudio e verifica no navegador. IDs de
persistência e contratos de combate permanecem compatíveis.
**Tech Stack:** Phaser local, JavaScript clássico, Canvas/WebAudio e Python existente.
**Spec:** `docs/superpowers/specs/2026-11-10-inferno-e-magia-design.md`.

## Global Constraints

- Direção escolhida pelo usuário: fortaleza demoníaca com correntes e fogo.
- Sem dependências novas, novos pedidos de aprovação ou mudança de balanceamento.
- Sem Git; backup: `../backups-jogo-hordas/pre-inferno-fortaleza-20261110-161418.zip`.
- Preservar IDs `catacombs`, `crypt_*`, assinatura das classes e funções públicas.
- Não abrir Chrome/API nos agentes; o root coordena execução sequencial.

## Review Focus

- Entrada, rotas e avisos permanecem fisicamente transitáveis/legíveis.
- Objetos novos não vazam após destruição ou reinício da cena.
- Herói e inimigos continuam visíveis sob brilho, fumaça e correntes.
- Perfis e partidas anteriores continuam reconhecendo a terceira fase.
- Sem texto residual Catacumbas/Necromante no produto referente à fase final.

### Task 1 — Fortaleza e ambiente

**Files:** `js/catacombs.js`, `js/catacombs-art.js`.
**Interfaces:** CatacombWorld, drawCatacombAssets e chaves `crypt_*` existentes.

- [x] Reconstruir texturas/props/arena/entrada como fortaleza com correntes e fogo.
- [x] Integrar luz, brasas e detalhes limitados; preservar colisões e rotas.
- [x] Executar sintaxe, catacombs_checks e safe_spawns_checks; relatar limites.

### Task 2 — Tornado e feixe

**Files:** `js/powers.js`, `js/progression.js`; teste existente se necessário ao lifecycle.
**Interfaces:** POWER_IMPL.cyclone/radiant_beam, fx_cyclone/fx_radiant_beam existentes.

- [x] Reconstruir sprites e compor espirais, detritos, halo, núcleo e impactos.
- [x] Reutilizar objetos limitados e limpar em destroy; manter dano/alcance/cadência.
- [x] Executar new_powers_checks/evolutions_relics_checks e sintaxe.

### Task 3 — Demônios e chefe

**Files:** `js/catacombs-enemies.js`, `js/catacombs-boss.js`.
**Interfaces:** CATACOMB_ENEMY_IDS, CATACOMB_BOSS, NecromancerBoss e arte existentes.

- [x] Desenhar seis comuns/dois minis infernais e Arquidemônio das Cinzas.
- [x] Adaptar nomes, eventos, cores de projéteis/avisos e efeitos do chefe.
- [x] Executar catacombs_checks e sintaxe; preservar cap de seis invocações.

### Task 4 — Integração e entrega (root)

**Files:** stages/selection/stage-art/game/ui/scenes/config/portal/meta/finale/
soundscape/ambience, texto de server.py, docs e runners relevantes.

- [x] Trocar identidade apresentada e adaptar seleção, transição/desfecho e ambiente.
- [x] Conferir checks existentes relevantes e compatibilidade de progresso.
- [x] Rodar Chrome com capturas da fortaleza, demônios, tornado/feixe e campanha.
- [x] Revisão independente, correções, relatório final e instruções para jogar.
