# Catacumbas e segredos — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Entregar todas as sete novidades aprovadas como expansão integrada.
**Architecture:** Módulos novos sobre Phaser/WebAudio e servidor atual; três
tarefas de conteúdo em paralelo, integração e persistência pelo controlador.
**Tech Stack:** JavaScript clássico, Phaser 3.80.1 local, Python/SQLite, Node/Chrome.
**Spec:** `docs/superpowers/specs/2026-11-09-catacumbas-e-segredos-design.md`.

## Global Constraints

- Usuário autorizou “bora fazer todas”; seguir sem novos pedidos de aprovação.
- Preservar cenário escuro, offline, contas e resultados históricos.
- Pools globais: 240 inimigos, 160 tiros do jogador, 140 tiros inimigos.
- Sem dependências novas de runtime; máximo três relíquias únicas.
- Sem Git: backup `../backups-jogo-hordas/pre-catacumbas-expansao-20261109-145224.zip`.
- Ownership abaixo é exclusivo; dependências/hook edits serão sequenciais.

## Review Focus

- Carry/retry não duplica relíquias nem apaga armas/evoluções/loadout.
- Retry de avanço de uma fase não avança a próxima; sessão e versão preservadas.
- Altares/segredo recusam recompensa dupla, morte silenciosa e UID reciclado.
- Diálogos/filmes/blur bloqueiam interação e áudio, inclusive no quadro de abertura.
- Troca de conta/storage indisponível não mistura desbloqueios ou impede jogar.

### Task 1: Evoluções e relíquias

**Files:** `js/data.js`, `js/powers.js`, `js/progression.js`, `js/player.js`,
novo `js/relics.js` se útil; `tests/evolutions_relics_checks.cjs`.
**Interfaces:** RELICS catálogo por ID; player.relics array, addRelic(id):boolean,
removeRelic(id):boolean, relicMultiplier(stat):number, projectileCount(base):number.
IDs, receitas, efeitos e limites exatos da spec. Root salva/restaura IDs em stages.

- [x] RED: quatro receitas ausentes, dano/área/limpeza e limites; relíquias ausentes.
- [x] Implementar quatro evoluções, texturas/ícones, modificadores derivados e contrapartidas.
- [x] GREEN: níveis, UID reciclado, pool cheio, cancelamento, cura e remoção sem deriva.
- [x] Sintaxe, relatório e revisão independente.

### Task 2: Catacumbas e campanha frontend

**Files:** novos `js/catacombs.js`, `js/catacombs-art.js`,
`js/catacombs-enemies.js`, `js/catacombs-boss.js`; `js/game.js`, `js/boss.js`,
`js/map.js`, `js/finale.js`, `js/stages.js`, `js/selection.js`, `js/stage-art.js`.
**Tests:** `tests/catacombs_checks.cjs`. Root integra scripts, geração de assets,
HUD, textos de scenes.js, portal e backend depois, sem editar junto esses arquivos.
**Interfaces:** CatacombWorld, NecromancerBoss, CATACOMB_BOSS/CATACOMB_ENEMY_IDS,
STAGES.catacombs; enterNextStage()/nearStageExit(), wrappers antigos mantidos.
GamePortal.advanceRun(runId,targetStage), recordGuestAdvance(targetStage),
recordGuestVictory(stage). Exploração/áudio/relíquias serão integrados pelo root.

- [x] RED: estágio/filtros/fábricas/segunda travessia e ausência de vitória no Castelo.
- [x] Implementar mapa, arte, seis comuns, dois minis, armadilhas e Necromante.
- [x] Generalizar vitória/transição/fábricas/seleção mantendo primeira travessia.
- [x] GREEN: dano, fase exclusiva, caminhos, carry/retry/cancelamento e desfecho final.
- [x] Sintaxe, relatório e revisão independente.

### Task 3: Exploração e áudio

**Files:** novos `js/exploration.js`, `js/soundscape.js`; `js/audio.js` e
`js/enemies.js` apenas hook de morte; `tests/exploration_audio_checks.cjs`.
**Interfaces:** ExplorationSystem e Soundscape da spec; drawExplorationAssets(scene).
Exploração chama player.addRelic e lê RELICS; MetaProgress.record(event) com eventos
altar/secret/evolution é hook opcional (root). Root cuida game/ui/stages/boot.

- [x] RED: custo/cancelamento/repetição/UID e limites do áudio.
- [x] Implementar dois altares/fase, símbolos/santuário/guardião e diálogos.
- [x] Implementar ambientação/trilha limitada, mute imediato e limpeza.
- [x] GREEN: pool cheio, morte silenciosa, checkpoint, bloqueios e áudio pós-shutdown.
- [x] Sintaxe, relatório e revisão independente.

### Task 4: Integração, metaprogressão e servidor (root)

**Files:** `server.py`, `js/portal.js`, novo `js/meta.js`, `js/scenes.js`,
`js/ui.js`, `js/sprites.js`, `index.html`, docs e testes. Após Tasks 1–3,
hooks pontuais em game/stages/progression serão do root, em sequência.

- [x] RED HTTP: Catacumbas bloqueadas, avanço explícito/idempotente, migração e final.
- [x] Implementar migração aditiva/versão3, progresso/allowlists e portal convidado/conta.
- [x] RED VM: desbloqueios/loadout/storage por perfil e prioridade de checkpoint.
- [x] Implementar coleção/seleção/skins/alternativas e integrar áudio/exploração/carry/HUD.
- [x] Integrar scripts/arte, testes Chrome e ajustar expectativas antigas de 2 fases.
- [x] Rodar VM/sintaxe/API/browser em sequência adequada; conferir capturas.
- [x] Revisão final independente, corrigir achados e entregar com instruções.

## Estado e execução

Ledger permanente: `docs/catacumbas-expansao/progress.md`. Nenhuma tarefa concluída
será reiniciada se créditos/contexto acabarem; retomar por relatórios e logs.
