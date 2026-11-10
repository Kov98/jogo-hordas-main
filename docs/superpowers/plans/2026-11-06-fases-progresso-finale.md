# Fases e desfecho — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans; tarefas independentes delegadas conforme dispatching-parallel-agents.

**Goal:** Porta física, seleção/bloqueio por conta, retry atual e cutscene final.
**Architecture:** Contratos de perfil/entrada na spec permitem backend, cenário
e seleção trabalharem em arquivos separados; integração e finale no GameScene.
**Tech Stack:** Phaser 3.80.1, JavaScript, Python/SQLite, Playwright.
**Spec:** docs/superpowers/specs/2026-11-06-fases-progresso-finale-design.md

## Global Constraints

Não apagar dados, não expor credenciais; sem dependências; mesma run na
passagem, nova run no retry; minis 300/600 e chefe 900; main autorizada.

## Review Focus

Bloqueio no servidor; conta trocada sem dados misturados; portas sem atalhos
ou dash através da parede; retry sem duplicar score; cutscene única e sem dano.

## Task 1: Backend de perfil e desbloqueio

Arquivos: server.py, tests/test_accounts.py. Interfaces: progress/stats da spec.
- [x] RED: bloqueio inicial, desbloqueio idempotente, persistência/isolamento, migração.
- [x] Implementar e rodar API completa em banco descartável.

## Task 2: Fachada e porta de entrada

Arquivos: js/forest.js, js/map.js, js/forest-art.js; teste de geometria dedicado.
Interfaces: gate/isAtCastleDoor e World.entry da spec.
- [x] RED: parede fechada/aberta, cantos, dash e entrada interna desobstruída.
- [x] Implementar fachada proporcional com colisão e entrada sul no castelo.

## Task 3: Seleção e perfil no portal

Arquivos: js/selection.js, js/portal.js; testes dedicados de seleção/perfil.
- [x] RED: StageSelect, bloqueios e perfil de contas separado de convidado.
- [x] Implementar StageSelect, APIs do portal e estatísticas na conta.

## Task 4: Integração, retry e cutscene

Arquivos: js/game.js, js/scenes.js, js/main.js, index.html, js/finale.js, testes navegador.
- [x] RED: fluxo das cenas, chegada, retry atual e desfecho antes de End.
- [x] Implementar checkpoint de entrada e cutscene; integrar contratos.
- [x] Executar API e suítes de navegador apropriadas, conferir capturas.
- [x] Revisão independente, documentação e commit na main.
