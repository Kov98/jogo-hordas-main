# Revisão limitada — HUD na chegada ao castelo

Data: 09/11/2026.

**Sem achados materiais. Correção da race de visibilidade aprovada.**

Escopo: especificação aprovada, revisão final anterior, `UIScene.create()`,
as esperas e as asserções de HUD em `forest_cinema_checks.cjs`, e os ajustes
de câmera/captura em `browser_new_content.cjs`. A revisão foi estática;
nenhum Chrome, servidor, API ou teste foi executado por este revisor.

O código local do Phaser confirma a causa: `scene.launch()` enfileira o
início da cena; `Systems.start()` define `visible = true` antes de chamar
`create()`. Assim, a ocultação anterior feita por `setCinematic()` podia ser
sobrescrita pelo início tardio da UI. A nova instrução no início de
`UIScene.create()` consulta o estado atual de `this.G.cinematic` e aplica a
visibilidade depois desse reset. A criação é síncrona e não há outro reset
de visibilidade ao final de `SceneManager.create()`, portanto o HUD não
precisa aparecer por um quadro. `setCinematic(null)` continua restaurando a
UI no fim da chegada e a criação em jogo normal continua visível.

O teste de cinema agora espera a nova UI ficar pronta ainda em
`castle-arrival` e verifica `isVisible('UI') === false`. Isso observa o
estado posterior ao lançamento enfileirado, que era o ponto descoberto
pela falha. O teste isolado também cobre criação tardia nas seis fases de
cinema e criação visível em jogo normal; não substitui a verificação real
no navegador.

Na captura integrada, `centerOn()` somente acompanha o teleporte feito
pelo próprio fixture até a porta, sem alterar o comportamento do produto.
A captura de saída espera o fade terminar, permanece dentro da animação
de chegada e exige a UI pronta e oculta. A espera final continua exigindo
o fim do cinema e confirma a devolução do HUD, além do transporte de herói,
poderes, níveis e dash. Nenhuma asserção de campanha foi removida.

As execuções finais desses testes e a inspeção das novas capturas ficam
sob responsabilidade do coordenador. Não foram identificados riscos
materiais novos dentro deste escopo limitado.

## Adendo — agendamento das duas páginas no teste de contas

Revisão estática de `activatePage()` em `tests/browser_accounts.cjs`:
**sem achados materiais**. O helper interrompe somente o RAF do Phaser da
página que ficará em segundo plano, traz a página de trabalho para frente
e reativa seu RAF. O código local do Phaser confirma que `loop.sleep()`
não suspende o event loop do navegador nem remove os listeners de DOM;
`wake()` retoma o RAF sem alterar cookies, usuário ou estado de autorização.

As sessões continuam isoladas em dois contextos reais. O login ainda envia
o formulário ao servidor; cadastro, restauração por cookie, restrição de
administração, ranking, banimento e logout mantêm as asserções existentes.
Na volta à página do jogador, o evento de foco continua sendo disparado
explicitamente, e a revogação depende do `refreshSession()` real. Esse
listener usa eventos do navegador e fetch, sem depender do loop gráfico.
A consulta ao ranking de banidos também continua sendo uma requisição HTTP
real. Não há dependência de animação da página suspensa enquanto ela fica
em segundo plano: as esperas e interações seguintes atuam na página que o
helper reativou.

O ajuste reduz trabalho gráfico concorrente sem ampliar o timeout da API
nem simular respostas de autenticação. Esta revisão não comprova o ganho
de desempenho nem uma execução verde do teste; a validação real do browser
permanece pendente sob responsabilidade do coordenador.
