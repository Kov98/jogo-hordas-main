# Feixe celeste e queda — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Coluna de luz vinda do alto, restauração da queda na lava e chefe do Inferno visível.
**Architecture:** Poder e filme em tarefas paralelas com ownership exclusivo;
root integra texto/boss, adapta browsers e verifica todos os fluxos.
**Tech Stack:** Phaser/Canvas, JavaScript e servidor Python existentes.
**Spec:** `docs/superpowers/specs/2026-11-10-feixe-celeste-e-queda-design.md`.

## Global Constraints

- Sem Git, dependências ou migração de IDs; backup pre-feixe-celeste-queda-lava-20261110-165133.zip.
- IDs persistidos `catacombs` e nomes de classes existentes são compatíveis.
- Chrome/API pesados exclusivos do root; outros agentes só VM/sintaxe.
- Objetos/pools limitados e cleanup; sem dano nos quadros de aviso/filme.

## Review Focus

- Feixe não acompanha jogador nem inimigo reciclado; pegada e dano coincidem.
- Queda não credita vitória nem tempo de cinema; retry não duplica avanço.
- Shutdown/recomeço cancela filmes e esperas de rede sem restaurar cena velha.
- Personagem chega com sprite normal e HUD visível, preservando build.
- Boss aparece pelo agendamento normal e cabe na visão junto do jogador.

### Task 1 — Feixe celeste

**Owner files:** powers.js, progression.js, descrição/upgrades radiant_beam em data.js;
new_powers_checks.cjs e teste focado se necessário.

- [x] RED: alvo fixo e área circular, aviso sem dano, movimento/UID e destruição.
- [x] Implementar coluna vinda do alto com selo/impacto e objetos reutilizados.
- [x] GREEN: níveis, multiplicadores, cap, expiração, evolução e sintaxe.

### Task 2 — Queda e passagem automática

**Owner files:** game.js, finale.js, catacombs_checks.cjs e teste focado novo.

- [x] RED: derrotar Castelo inicia CastleFinale e avança após cair, uma vez.
- [x] Restaurar filme e compartilhar commit seguro do avanço com travessia existente.
- [x] Enquadrar arena do boss do Inferno, mantendo posições e horário.
- [x] GREEN: build/tempo/rede/shutdown e câmera/HUD restaurados.

### Task 3 — Integração e verificação (root)

- [x] Atualizar seleção/guia, helpers de browser e teste normal do agendamento do boss.
- [x] Executar VM/sintaxe e Chrome com conta, feixe, lava/queda e boss visível.
- [x] Revisão independente, corrigir achados, capturas e relatório final.
