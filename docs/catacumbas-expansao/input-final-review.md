# Revisão final dos controles

Revisão de `js/game.js` e `tests/interaction_input_checks.cjs`, em 10/11/2026. Nenhum bloqueante encontrado. A revisão não alterou código de produção e não iniciou navegador, servidor ou API.

## Comportamento conferido

- E/Enter e Shift/Espaço preservam um toque que começa e termina entre dois frames. O sinal pendente e as duas flags de `JustDown` são consumidos na mesma leitura, impedindo a repetição no frame seguinte.
- Pausa, suspensão da cena e perda de foco descartam as duas ações pendentes e reiniciam as quatro teclas. O encerramento remove os ouvintes, e a próxima construção começa sem ações antigas.
- O primeiro `keydown` repetido depois de `Key.reset()` consome a flag criada pelo Phaser sem agendar uma ação nova. Uma ação válida já pendente continua disponível.
- A chegada cinematográfica limpa controles antes de devolver a partida. Menus de exploração, melhorias, baús e diálogos interrompem a cena, passando pelo descarte de pausa.
- A leitura dos eixos do joystick permanece antes das ações. O botão de dash por toque continua usando `requestDash`, consumido uma única vez.

## Evidências

`node tests/interaction_input_checks.cjs`: **10 grupos aprovados**. `node --check` aprovou os dois arquivos revisados.

Uma verificação complementar em VM carregou os módulos reais `Key` (30472), `JustDown` (90229) e `KeyCodes` (46032) do `js/phaser.min.js`, substituindo apenas a entrada do bundle na memória. Não houve execução da inicialização gráfica do Phaser nem modificação do arquivo. A simulação respeitou a ordem do `KeyboardPlugin`: primeiro `Key.onDown`, depois o evento da tecla apenas quando ela ainda não estava pressionada; a soltura chamou `Key.onUp`.

Essa verificação aprovou **18 grupos**: toque rápido com soltura para cada uma das quatro teclas, aliases simultâneos, repetição após pausa/reset seguida de uma nova pressão, descarte nos quatro limites de ciclo de vida e joystick combinado com o sinal de dash por toque. A checagem confirmou que `Key.onUp` realmente elimina `_justDown`, justificando o sinal pendente, e que o sinal não gera ações duplicadas.

Limite da revisão: desenho, foco do canvas e despacho físico de toque ficam a cargo dos testes de navegador coordenados pela tarefa principal.
