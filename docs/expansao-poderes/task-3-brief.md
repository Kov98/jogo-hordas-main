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

### Task 3: Cutscene e travessia completa

**Files:** `js/game.js`, `js/boss.js`, `js/forest.js`, `js/finale.js`, `js/forest-art.js`,
`js/ui.js`, `js/portal.js`; teste `tests/forest_cinema_checks.cjs`.

**Interfaces:** `GameScene.cinematic` é null ou nome do estado; todo bloqueio usa
seu valor booleano. `beginForestVictory()` inicia o bloqueio no golpe fatal.
`ForestWorld.animateCastleGate(): Promise<boolean>` abre folhas sem animar toda
a fachada; `openCastleGate()` continua disponível para geometria/imediato.
Registrar fontes de fogo em `this.fireSources.push({x,y,rate})` no forestLantern.
Consumir FX.embers; preservar carry/runStart/initialization e CastleFinale existente.

- [ ] Reproduzir ausência de cinema/entrada, tempo pós-golpe fatal e atalhos; observar RED.
- [ ] Implementar derrota→raízes→câmera→portão→retorno; stageCleared apenas ao concluir.
- [ ] Animar entrada pela abertura, fade para preto, avanço uma vez, saída com fade.
- [ ] Atualizar bloqueio UI/portal e limpeza em shutdown; testar FPS baixo/restart/rede.
- [ ] Registrar resultados e riscos para revisão.
