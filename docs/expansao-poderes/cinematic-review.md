# Revisão independente — cinema e travessia

Revisão estática de `task-3-brief.md`, `task-3-report.md`, `task-3-review.diff`, especificação aprovada e implementações atuais. Nenhum Chrome, API ou teste executado nesta revisão; nenhum código alterado.

## Achado original — resolvido na revisão focada abaixo

**P2 — As esperas cinematográficas ainda descartam tempo real sob quedas fortes de FPS.** Local: `js/game.js:216` (criação do tween em `:229`) e `js/game.js:233`.

`cinematicTween` e `cinematicDelay` dependem do relógio padrão do TweenManager. O Phaser incluído em `js/phaser.min.js:1` inicializa `maxLag=500` e `lagSkip=33`; seu `getDelta()` desconta `elapsed - lagSkip` quando o intervalo entre quadros excede 500 ms. Não há configuração de `setLagSmooth` no código do jogo. Assim, em intervalos de 1 segundo entre quadros, cada espera progride cerca de 33 ms: a primeira espera de 2,7 s pode ocupar mais de 80 segundos reais, mantendo o jogador bloqueado, e entrada/saída sofrem o mesmo alongamento. Isso contraria o requisito explícito de duração em tempo real com FPS baixo.

Reprodução sugerida para a integração: limitar os ticks reais a aproximadamente 1 FPS durante a vitória e observar o tempo até `forest-roots` e até a liberação. Alternativamente, controlar `Date.now` e avançar o TweenManager real em intervalos de 1000 ms num teste isolado. A asserção existente em `tests/forest_cinema_checks.cjs:37` chama apenas `g.update(0,1000)` e comprova o avanço de `visualTime`; não avança nem verifica o relógio dos tweens. Corrigir a política de lag das animações cinematográficas ou usar um relógio real próprio, preservando cancelamento e a política normal fora do cinema.

## Vereditos originais — substituídos pela revisão focada abaixo

- **Spec:** ajuste necessário para duração em FPS muito baixo; os demais requisitos examinados não apresentaram achados materiais.
- **Qualidade:** ajuste necessário no relógio acima. Guards síncronos no golpe fatal, continuação assíncrona com token, cancelamento das esperas de animação, avanço único e tratamento de resposta tardia estão coerentes na inspeção.

Carry/runId e checkpoint mantêm os caminhos existentes; recuperação de vida está em `restorePlayerState`. Bloqueios de dano/XP/níveis, entradas, UI e diálogos são consistentes. `CastleFinale` preserva seu fluxo e o bloqueio próprio de portal. As folhas independentes correspondem à abertura de 144 px e usam dobradiças coerentes com a arte e a colisão. `FX.embers(x,y,count)` e `World.fireSources` são compatíveis com os consumidores novos. Aparência final, tempos observados no navegador e execução das regressões continuam com a integração sequencial do controlador.

## Revisão focada da correção — 07/11/2026

**P2: addressed.** A inspeção de `game.js` atual confirma que `setCinematic` captura os valores preexistentes de `maxLag`/`lagSkip` antes de chamar `setLagSmooth()` sem argumentos. Na implementação local do Phaser isso eleva o limite de suavização para 100.000.000 ms, deixando os intervalos de 1000 ms avançarem integralmente. A mudança entre estados conserva o primeiro snapshot; `setCinematic(null)` e o handler de shutdown chamam `restoreCinematicClock()`, restauram a política anterior e limpam o snapshot. O cancelamento de esperas e os guards de initialization permanecem intactos. Nenhuma quebra material nova encontrada nessa correção.

O novo `checkTweenClock` em `tests/forest_cinema_checks.cjs` usa o TweenManager do Phaser local e a GameScene real, controla `Date.now`, verifica avanço integral de 1000 ms e conclusão da espera, testa transição entre estados e restauração de 500/33 e 275/11 na conclusão e no shutdown. A revisão inspecionou esse teste, sem executá-lo. RED/GREEN são evidências relatadas pelo implementador em `task-3-report.md`; o browser integrado continua com o controlador.

**Vereditos atuais: spec e qualidade aprovadas no escopo estático revisado, sem achados materiais pendentes.** A observação visual e a integração completa continuam fora desta revisão focada.
