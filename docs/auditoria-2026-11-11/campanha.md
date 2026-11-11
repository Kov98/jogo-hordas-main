# Auditoria de campanha, filmes e controles — 2026-11-11

Escopo: `js/game.js`, `js/finale.js`, leitura de `js/ui.js` e `js/selection.js`, controles e encerramento das cenas. Usei investigação de causa e teste de regressão antes de cada correção. Não abri Chrome, servidor nem API; a integração visual ficou com o root. Não houve alteração de IDs, cadeia de fases, carry, origem de campanha ou fórmula de ranking.

## Achados corrigidos

### P2 — o fade do Castelo podia ser cortado ao cruzar o fim em um quadro longo

O achado de `docs/feixe-e-queda/review.md` foi reproduzido. Antes da correção, iniciar a queda e executar um único quadro de 11 s (ou 9 s seguido de 2 s) disparava `fadeOut(1400)` e avançava a campanha no mesmo quadro. Com o efeito **real** Fade do Phaser local, a opacidade capturada durante `scene.restart` era `Number.MIN_VALUE` (`5e-324`), em vez de 1. Um quadro de 9 → 10,1 s também começava o efeito com opacidade inicial quando deveria estar na metade.

`CastleFinale.update` agora adianta o efeito pela diferença entre o progresso do fade e o relógio do filme. Como o Phaser atualiza os efeitos da câmera antes de `Scene.update`, esse ajuste cobre o trecho do quadro que ultrapassou 9,4 s, sem somar novamente o tempo já processado. O filme continua terminando aos 11 s; o avanço observa opacidade 1, sem prolongar artificialmente a transição.

Testes RED/GREEN em `tests/castle_fall_checks.cjs`: quadros `[11]`, `[9,2]`, `[9.3,.8,.9]` e opacidade intermediária de 0,5 aos 10,1 s. O teste carrega somente a classe Fade do bundle do Phaser, sem inicializar DOM ou navegador.

### P2 — o filme final do Inferno tinha o mesmo corte de fade

`SoulFinale.update` iniciava o fade aos 7 s, mas concluía aos 9 s mesmo quando o primeiro quadro a cruzar 7 s já atingia o fim. A reprodução com `[9]` ou `[6,3]` mostrava o resultado com opacidade `5e-324`. A mesma sincronização foi aplicada ao fade de 1.800 ms; a duração de 9 s e a chamada única de conclusão foram preservadas. Teste RED/GREEN cobre saltos longos e uma atualização posterior à conclusão.

### P2 — morte do jogador permitia combate e recompensas no restante do mesmo quadro

`GameScene.update` verificava `ended` no início, mas continuava processando sistemas depois de um golpe fatal durante o quadro. Na reprodução com dano fatal em `enemies.update`, ainda executava encounters, chefe, projéteis do jogador, projéteis inimigos, gemas, perigos, exploração e progressão. Além disso, `damageEnemy` aceitava dano após `ended`: um inimigo de HP 50 caía para 40 e o dano total aumentava durante a animação da morte. Isso permitia alterar dano, mortes, XP, nível ou cura antes da tela de resultado.

O loop agora retorna quando `ended` ou `cinematic` surge após jogador, inimigos, chefe, projéteis do jogador, projéteis inimigos ou perigos. `damageEnemy` também rejeita callbacks quando a partida acabou. `EncounterDirector.update` foi lido: apenas agenda/gera minis e anuncia; não causa dano direto ao jogador. `startBossFight` já rejeita partidas encerradas.

Testes RED/GREEN em `castle_fall_checks.cjs` cobrem mortes nas fases de inimigos, chefe, tiros inimigos e perigos, além de callback tardio de dano. O resultado esperado é nenhum sistema de combate/recompensa posterior à morte e nenhum incremento de dano.

### P2 — joystick móvel continuava movendo após pausa ou perda de foco

O callback `discardActions` descartava dash/interação, mas deixava `joy.active`, `joy.x` e `joy.y`. Um toque arrastado à direita gerava `readInput().x === 1`; após pause/resume sem `pointerup`, ainda gerava 1. Isso também ocorria em sleep/wake e nos eventos de blur do jogo e da janela, permitindo movimento involuntário ao voltar de outro aplicativo.

O callback agora desativa o joystick, zera ambos os eixos e limpa o desenho. O teste novo em `tests/interaction_input_checks.cjs` dispara os handlers reais de pointerdown/pointermove e os quatro eventos de lifecycle sem pointerup. Foi observado RED com `1 !== 0` antes da mudança e GREEN depois.

### P2 — fim do Inferno podia travar ao reutilizar uma legenda destruída

Na validação Chrome do root, `journey_regressions.cjs` revelou uma sequência específica: queda automática do Castelo, chegada ao Inferno, derrota imediata do próximo chefe. O encerramento da sobreposição da chegada ainda estava na fila quando a derrota começou. Ao fim dos efeitos de morte, `setCinematic` enfileirava o relançamento da sobreposição, mas `SoulFinale` já escrevia no `caption` antigo, cujo Text havia sido destruído. O stack confirmou `Frame.setSize → Text.updateText → Text.setText → new SoulFinale`, com `Cannot read properties of null (reading 'cut')`; a atribuição de `g.finale` era interrompida e a campanha permanecia travada em `soul-finale`.

`FinaleOverlayScene` agora zera `caption` em shutdown, cobrindo o intervalo até o próximo create. `onBossDefeated` passa a frase específica do início do filme nos dados do launch existente; assim o create posterior a preserva sem acessar o Text destruído. Não foi criada nova API nem alterada a decisão de relançar somente uma sobreposição inativa.

O teste novo de lifecycle enfileirado em `castle_fall_checks.cjs` reproduziu o mesmo erro no RED. No GREEN, a construção de `SoulFinale` termina, a fila cria uma nova sobreposição com `AS CORRENTES DO ARQUIDEMÔNIO CEDEM.` e a atualização aos 4,1 s muda a frase normalmente. O rerun real da jornada ficou com o root.

## Correção coordenada de checkpoint

O agente de persistência demonstrou que um retry de fase podia transferir poderes, relíquias e loadout de um perfil para outro após logout/login. Sob contrato combinado, `phaseCheckpoint` recebeu `metaProfileKey` e `GameScene.create` passou a descartar checkpoint sem origem ou cuja origem difere do perfil efetivamente devolvido por `beginRun`, antes de `buildScene`. Isso inclui troca durante o refresh assíncrono. O carry de uma campanha em andamento continua com sua origem. A descrição completa e as alterações de `EndScene.again` estão em `persistencia.md`; `tests/persistence_checks.cjs` passou após os dois REDs observados pelo agente responsável.

## Verificação e limites

- `node tests/castle_fall_checks.cjs`: 16 verificações passaram (antes eram 10).
- `node tests/interaction_input_checks.cjs`: 11 verificações passaram (antes eram 10).
- `node tests/persistence_checks.cjs`: 2 grupos passaram.
- `node tests/new_powers_checks.cjs`: 22 verificações passaram.
- `node tests/catacombs_checks.cjs`: 16 verificações passaram.
- `node tests/state_transfer_checks.cjs`: 3 verificações passaram.
- `node tests/evolutions_relics_checks.cjs`: 19 verificações passaram.
- `new_creatures_checks.cjs`, `safe_spawns_checks.cjs`, `meta_progress_checks.cjs`, `exploration_audio_checks.cjs` e `ambient_fx_checks.cjs`: passaram.
- `node tests/forest_cinema_checks.cjs --unit`: 2 grupos passaram.
- `node --check js/game.js` e `node --check js/finale.js`: passaram.

As fixtures validam callbacks, opacidade do efeito real, cancelamento, input e estado; não comprovam o resultado visual composto nem a renderização real. O root ficou responsável pela campanha e pelos filmes no Chrome. O agente de combate sugeriu examinar efeitos persistentes de poderes congelados durante filmes; isso não foi reproduzido visualmente por este agente e permanece uma observação, sem correção especulativa.
