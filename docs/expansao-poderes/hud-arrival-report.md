# HUD durante a chegada ao castelo

Correção em 09/11/2026, dentro da expansão aprovada.

## Causa

`GameScene.buildScene()` enfileira o lançamento de `UI`. Em seguida,
`playCastleArrival()` inicia o cinema e esconde a interface existente. Quando
o lançamento pendente cria a interface, a cena começa visível e `UIScene.create()`
não consultava o estado cinematográfico. Isso permitia que o HUD reaparecesse
durante a saída da porta do castelo.

## Alteração

`UIScene.create()` agora adota a visibilidade correspondente ao estado
`GameScene.cinematic` no momento efetivo da criação. A restauração ao final
continua sendo feita pelo fluxo existente de `setCinematic(null)`.

## Verificação

- `node tests/forest_cinema_checks.cjs --unit`: teste novo falhou antes da
  correção (`true !== false`) e passou depois. Executa `UIScene.init/create`
  reais com a cena inicialmente visível nos seis estados cinematográficos e
  durante gameplay normal. Também mantém verdes as guardas de diálogos.
- `node --check js/ui.js` e `node --check tests/forest_cinema_checks.cjs`: passaram.
- O teste de navegador agora aguarda `castle-arrival` com `UI.ready` e exige
  `GAME.scene.isVisible('UI') === false`, antes de verificar chegada/carry.
  Essa extensão deve ser executada pelo controlador; nenhum Chrome/API foi
  iniciado nesta tarefa para evitar concorrência com a suíte HTTP.

Arquivos alterados: `js/ui.js`, `tests/forest_cinema_checks.cjs` e este relatório.

## Revisão estática do ciclo de vida do Phaser

Conferido diretamente na distribuição local `js/phaser.min.js`, sem iniciar
Chrome ou API:

1. `ScenePlugin.launch()` apenas enfileira `manager.queueOp("start", ...)`.
2. `SceneManager.start()` chama `Systems.start()` antes de `bootScene()`.
3. `Systems.start()` define `settings.visible = true`, antes da criação.
4. `SceneManager.bootScene()` chama `init()` e então `create()` (a UI não
   possui preload).
5. `SceneManager.create()` chama o `UIScene.create()` e depois só configura
   `sceneUpdate`, muda `settings.status` para `RUNNING` e emite `CREATE`.
   Não redefine `settings.visible` depois da chamada a `UIScene.create()`.
6. `ScenePlugin.setVisible()` delega a `Systems.setVisible()`, que escreve
   diretamente em `settings.visible`. O renderizador consulta esse mesmo campo.

Portanto a correção ocorre depois do reset de visibilidade que causava o
problema, e o SceneManager não a sobrescreve ao concluir a criação. O cenário
normal permanece visível; a restauração ao terminar o filme segue explícita
em `GameScene.setCinematic(null)`. Não foi encontrada outra escrita de
visibilidade em `UIScene.create()`.
