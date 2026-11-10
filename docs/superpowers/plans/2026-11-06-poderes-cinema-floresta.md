# Poderes e cinema da floresta — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Entregar quatro poderes, dois inimigos, um herói e uma passagem cinematográfica com partículas.

**Architecture:** Estender os catálogos e os pools existentes do Phaser. Um estado
cinematográfico comum bloqueia gameplay sem congelar cenário/FX e preserva os
contratos de run, checkpoint e portas. Tarefas paralelas têm arquivos separados.

**Tech Stack:** JavaScript clássico, Phaser 3.80.1, Python/SQLite, Node/Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-poderes-cinema-floresta-design.md`

## Global Constraints

- Floresta escura e luzes laranja da alteração anterior preservadas.
- Quatro armas comuns novas com níveis 1–8; seis armas equipadas.
- Canalizador (`channeler`): 110 HP, velocidade 165, poder inicial `plasma`.
- IDs novos: `cyclone`, `radiant_beam`, `plasma`, `meteor`, `forest_witch`, `forest_storm_mage`.
- Respeitar pools existentes: 240 inimigos, 160 tiros do jogador e 140 inimigos.
- Sem dependências novas de execução do jogo; sem alterações em contas existentes.
- Sem .git nesta pasta: trabalhar no local autorizado, com backup ZIP já criado.

## Review Focus

- Reinício enquanto há tween ou resposta de avanço: não afetar a nova tentativa.
- Teclas/toque/pausa durante cinema: não mover, abrir menu nem bloquear a sequência.
- UID de alvo reciclado e armas destruídas: não reaproveitar dano/referências antigos.
- Emissão/ataques fora da câmera e em hordas cheias: orçamento fixo e limpeza.
- Quarto cartão e novos IDs autenticados: seleção acessível e servidor compatível.

### Task 1: Quatro poderes e definição do herói

**Files:** `js/data.js`, `js/powers.js`, `js/progression.js`; teste `tests/new_powers_checks.cjs`.

**Interfaces:** produzir POWERS e POWER_IMPL para os quatro IDs; registrar
CHARACTERS.channeler; `drawProgressionAssets(scene)` gera todos os ícones/texturas.
Consumir FX.ring/burst/bolt e `FX.embers(x,y,count=1)`; todos os danos via damageEnemy.

- [x] Testar catálogo/níveis, dano efetivo, UID reciclado e limpeza; observar RED.
- [x] Implementar tornado móvel, faixa de luz sustentada, projéteis de plasma e meteoros com sete upgrades próprios cada.
- [x] Testar níveis 1/8, modificadores e limites, sem atingir alvos depois de destroy.
- [x] Conferir sintaxe e registrar resultados para revisão.

### Task 2: Criaturas e seleção do Canalizador

**Files:** `js/forest-enemies.js`, `js/enemies.js`, `js/art.js`, `js/sprites.js`,
`js/scenes.js`, `js/config.js`, `LEIA-ME.txt`; teste `tests/new_creatures_checks.cjs`.

**Interfaces:** consumir CHARACTERS.channeler de Task 1. Produzir c_channeler,
walk_channeler, e_forest_witch/e_forest_storm_mage e animações. Catálogo contém
14 comuns da floresta; seus IDs continuam excluídos do diretor do castelo.

- [x] Testar inclusão/isolamento, padrões anunciados e quatro posições acessíveis; observar RED.
- [x] Desenhar herói e criaturas com animações próprias; adicionar ataques/ondas progressivas.
- [x] Adaptar seleção para quatro cartões, descrições/poder/atributos, setas e 1–4.
- [x] Verificar arte, seleção e ataques; registrar resultados para revisão.

### Task 3: Cutscene e travessia completa

**Files:** `js/game.js`, `js/boss.js`, `js/forest.js`, `js/finale.js`, `js/forest-art.js`,
`js/ui.js`, `js/portal.js`; teste `tests/forest_cinema_checks.cjs`.

**Interfaces:** `GameScene.cinematic` é null ou nome do estado; todo bloqueio usa
seu valor booleano. `beginForestVictory()` inicia o bloqueio no golpe fatal.
`ForestWorld.animateCastleGate(): Promise<boolean>` abre folhas sem animar toda
a fachada; `openCastleGate()` continua disponível para geometria/imediato.
Registrar fontes de fogo em `this.fireSources.push({x,y,rate})` no forestLantern.
Consumir FX.embers; preservar carry/runStart/initialization e CastleFinale existente.

- [x] Reproduzir ausência de cinema/entrada, tempo pós-golpe fatal e atalhos; observar RED.
- [x] Implementar derrota→raízes→câmera→portão→retorno; stageCleared apenas ao concluir.
- [x] Animar entrada pela abertura, fade para preto, avanço uma vez, saída com fade.
- [x] Atualizar bloqueio UI/portal e limpeza em shutdown; testar FPS baixo/restart/rede.
- [x] Registrar resultados e riscos para revisão.

### Task 4: Partículas, servidor e integração (controlador)

**Files:** `js/fx.js`, `js/map.js`, `server.py`, `tests/test_accounts.py`,
`tests/browser_accounts.py`, `tests/browser_new_content.cjs`, helpers dos testes
de floresta/jornada quando necessário, documentação da expansão.

**Interfaces:** `World.fireSources` inicializado antes de build(); tochas e lampiões
registram fontes. `FX.embers(x,y,count=1)` usa emissor compartilhado, limitado,
ascendente e pequeno. FX.update anima fontes visíveis com relógio próprio.
Servidor reconhece todos os novos IDs sem migração de esquema.

- [x] Adicionar teste HTTP do herói/allowlists e teste de orçamento/visibilidade de brasas; observar RED.
- [x] Implementar brasas/fumaça/impactos e allowlists; corrigir fechamento SQLite e retorno Playwright nos helpers necessários.
- [x] Integrar módulos de teste e ajustar esperas de cinema/restart preservando asserções.
- [x] Rodar sintaxe, API, novo conteúdo e regressões de floresta/jornada/expansão/controles/contas conforme mudanças.
- [x] Inspecionar capturas dos quatro poderes, seleção, inimigos, cinema e porta.
- [x] Revisão independente dos diffs, correções, documentação e entrega.

## Execução

Usuário aprovou a implementação (“sim bora”); sem nova aprovação intermediária.
Backup: `../backups-jogo-hordas/pre-poderes-cinema-20261106-152230.zip`.
Progresso e relatórios: `docs/expansao-poderes/`.

Conclusão em 09/11/2026: implementação, revisões independentes e validação final
concluídas. Evidências finais em `docs/expansao-poderes/progress.md`.
