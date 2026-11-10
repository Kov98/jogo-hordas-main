# Criaturas adicionais da floresta — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Adicionar quatro inimigos com arte/ataques próprios à primeira fase.
**Architecture:** Registros em ENEMIES/ENEMY_ART e eventos exclusivos da floresta;
reutilização da IA e dos pools existentes, com whitelist administrativa sincronizada.
**Tech Stack:** JavaScript, Phaser 3.80.1, Python stdlib, Playwright.
**Spec:** docs/superpowers/specs/2026-11-06-criaturas-floresta-design.md

## Global Constraints

Sem dependências novas; noite macabra sem Halloween; até 240 inimigos;
minis 300/600 s e chefe 900 s; sprites menores que árvores; castelo preservado.

## Review Focus

- Os quatro tipos devem aparecer nas hordas, não apenas no menu administrativo.
- Não devem aparecer na seleção normal de inimigos do castelo.
- Arte e animações precisam existir no Phaser real, sem textura substituta.
- Investida/golpe precisam ser anunciados; tiros respeitam cadência e pool.
- Backend deve autorizar os IDs novos e continuar recusando IDs desconhecidos.

## Task 1: Criaturas, ondas e integração administrativa

**Files:** js/forest-enemies.js, server.py, tests/browser_forest.cjs,
tests/test_accounts.py, docs/FLORESTA.md, docs/CHECKPOINT.md.
**Interfaces:** ENEMIES/ENEMY_ART, FOREST_ENEMY_IDS/FOREST_EVENTS,
EnemyManager.spawn/ai/pickType, /api/admin/command.

- [x] Adicionar teste no Phaser real para os quatro ataques, arte e seleção por fase;
      ampliar simulação para exigir as doze criaturas e testar spawn administrativo.
- [x] Rodar os testes e observar falha por ausência dos novos inimigos.
- [x] Registrar os tipos, desenhar quatro animações originais e inserir ondas progressivas.
- [x] Rodar API e floresta completas; inspecionar uma captura das criaturas.
- [x] Revisar o diff com um revisor independente, atualizar documentação e commitar na main.
