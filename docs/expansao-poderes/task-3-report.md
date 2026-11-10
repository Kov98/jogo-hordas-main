# Task 3 — cinema da floresta e travessia

Implementação integrada em 06/11; guardas de diálogo e verificação isolada concluídas em 07/11/2026. A execução final completa no navegador fica com o controlador, sequencialmente, para evitar a saturação observada com navegadores concorrentes.

## Comportamento

- `Boss.die()` chama `beginForestVictory()` sincronamente no golpe fatal da floresta. A sequência é única por cena e não envia vitória da campanha.
- `GameScene.cinematic` é `null` ou um destes estados: `forest-defeat`, `forest-roots`, `forest-gate`, `forest-return`, `castle-entry`, `castle-arrival`.
- O filme dura aproximadamente 7,1 s: derrota existente, raízes cedendo, câmera ao portão, folhas abrindo e câmera de volta ao jogador. `stageCleared` só é marcado no final. Tempo, dano posterior, XP, níveis, controles, dash, pausa, HUD e diálogos ficam bloqueados; cenário e FX continuam atualizados com delta visual não limitado a 50 ms.
- As folhas são imagens independentes, ancoradas nas dobradiças; a fachada permanece imóvel. `openCastleGate()` conserva a operação imediata e a geometria; `animateCastleGate()` retorna `Promise<boolean>`, resolve false após cancelamento e abre a passagem ao concluir.
- Depois do filme, o jogador pode caminhar livremente até a abertura. E/Enter/toque iniciam alinhamento e caminhada para o corredor, fade preto, avanço único e reinício com o carry existente. A saída sul mantém 1,25 s, agora com estado cinematográfico e fade de entrada. Total nominal da travessia: aproximadamente 2,53 s, além da API.
- Cada continuação assíncrona verifica initialization e cena ativa. Shutdown resolve esperas de animação com false, remove tweens e para a sobreposição. Respostas de avanço tardias verificam novamente o token antes de reiniciar a cena.
- Lampiões registram `{x, y: y - 17, rate: 3}` em `fireSources`; o portão consome `FX.embers`. A arte escura e a iluminação laranja foram mantidas.
- `GamePortal.openDialog()` rejeita chamadas diretas durante filmes, além dos atalhos já bloqueados. Guide/admin tratam o retorno null sem tentar acessar o DOM. CastleFinale mantém seu fluxo existente.

## Arquivos

Arquivos da tarefa: `js/game.js`, `js/boss.js`, `js/forest.js`, `js/forest-art.js`, `js/finale.js`, `js/ui.js`, `js/portal.js`, `tests/forest_cinema_checks.cjs`.

Ampliação explicitamente autorizada pelo controlador: `js/player.js` (guardas diretas de dano e XP), `js/guide.js` e `js/admin.js` (retorno antecipado quando o diálogo está bloqueado).

## Evidência de testes

1. RED observado em 06/11: `fatal hit must synchronously lock cinema`, actual undefined. Confirmou o período indevido de combate após o golpe fatal.
2. Browser Chrome/Phaser real em 06/11, execução anterior à extensão final do teste: passou congelamento de tempo/pontos, G/F2/Escape/Space, conclusão do filme com HUD e passagem, caminhada física antes do restart, avanço único, carry/runId preservado com falha de rede, chegada suave e shutdown durante a vitória. Saída final: `Forest cinema checks passed`, sem pageerror.
3. Extensão posterior reproduziu RED em chamada direta de diálogo: `dialog API must reject cinema`, true !== false. Dano/XP direto e delta visual de 1 segundo foram avaliados antes dessa falha e passaram.
4. Em 07/11, `node tests/forest_cinema_checks.cjs --unit` passou usando os arquivos reais portal/guide/admin em VM, cobrindo os seis estados e CastleFinale. Nenhuma conta ou serviço real é acessado.
5. Em 07/11, `node --check` passou nos 11 arquivos JavaScript/CJS modificados.

## Integração e limites de verificação

- Root deve executar a versão final de `tests/forest_cinema_checks.cjs` no servidor isolado. Ela inclui a nova regressão de resposta de avanço atrasada após restart, ainda sem execução completa após a última correção. Aceita `MURALHA_TEST_URL`, `PLAYWRIGHT_MODULE` e `CHROME_PATH`; `--unit` dispensa Chrome/API.
- A suíte completa, capturas de abertura/entrada e avaliação visual final permanecem com o controlador. Não foi medido FPS em aparelhos físicos.
- Houve timeout de inicialização de 25 s enquanto a máquina estava saturada; diagnóstico posterior confirmou Game/UI ativos sem pageerror. O teste agora permite 60 s de inicialização. Todos os navegadores criados pelos testes usam fechamento em finally; nenhum Chrome/API foi iniciado nesta retomada.
- Sem Git nesta pasta: nenhum commit criado. Nenhuma conta real foi alterada.

## Correção da revisão P2 — relógio sob quedas fortes de FPS

Em 07/11 a revisão identificou que o TweenManager local descarta parte de intervalos superiores a 500 ms. O teste anterior de `visualTime` não cobria esse relógio. A entrada em cinema agora salva `maxLag` e `lagSkip` preexistentes e desativa a suavização do TweenManager somente durante os estados cinematográficos. Mudanças entre estados não substituem o snapshot; conclusão normal e shutdown restauram os valores originais. CastleFinale não chama esse caminho e conserva sua política anterior.

RED: `node tests/forest_cinema_checks.cjs --clock` falhou em `Cinematic TweenManager discards a real 1000 ms frame`. O teste carrega o Phaser minificado do projeto e a GameScene real em Chrome isolado, controla `Date.now` e chama `TweenManager.tick()` com intervalos de 1000 ms; não simula o avanço chamando apenas `GameScene.update`.

GREEN após a correção: o mesmo comando passou, verificando avanço integral, término da espera de 2700 ms em até quatro quadros de 1 FPS, restauração de configurações padrão e personalizadas na conclusão e no shutdown e resolução false da espera interrompida. O caso do relógio também integra a execução normal de `forest_cinema_checks.cjs`. `--clock` dispensa servidor e API, mas usa Chrome; apenas um navegador isolado foi executado por vez e fechado em finally.
