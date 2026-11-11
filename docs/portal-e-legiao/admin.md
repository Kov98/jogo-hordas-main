# Painel administrativo: faixa sobre os botões

O campo de mensagem `.admin-status` ficava dentro do corpo com rolagem e usava
`position: sticky; bottom: 0`, fundo opaco, espaçamento e altura mínima. Mesmo
vazio, ele permanecia sobre a parte inferior do conteúdo. O botão de XP tinha
sua altura normal; a faixa cobria parte dele e recebia o clique nessa região.

O teste no Chrome antes da alteração confirmou:

- `Adicionar XP`: altura de 42 px, texto com 16 px e botão inteiro dentro do corpo.
- Botão entre y=557,67 e y=599,67; status vazio entre y=581,5 e y=601,5.
- O hit-test na parte inferior do botão encontrou `.admin-status`.
- Nenhum excesso horizontal e nenhum erro JavaScript na página.

A captura [admin-antes.png](capturas/admin-antes.png) registra a reprodução.

O status agora ocupa uma linha própria no rodapé, antes de **Fechar**. O corpo
com os campos e botões mantém sua rolagem. Uma mensagem preenchida reserva espaço
no rodapé e continua visível ao rolar; uma mensagem vazia não cria uma faixa.
Textos longos podem quebrar a linha. As mudanças de produção estão restritas a
`js/admin.js` e `admin.css`.

`tests/admin_layout_checks.cjs` recebe uma página com o administrador aberto na
aba **Partida**. O teste posiciona sete ações de XP e controles perto da borda
inferior do corpo e verifica altura utilizável, texto inteiro, alcance da
rolagem, ausência de elementos sobrepostos e ausência de rolagem horizontal.
Quando há feedback de uma ação, ele também deve continuar visível.

O coordenador executou o teste antes da correção: ele falhou especificamente
porque `.admin-status` cobria **Adicionar XP**. As verificações locais de sintaxe
e `node tests/admin_lifecycle_checks.cjs` passaram depois da mudança; a validação
visual após a correção é executada pelo coordenador no único Chrome da sessão.

Verificação final do coordenador: o mesmo helper passou em **1280×720**,
**480×600** e **360×600**, com status vazio e com feedback após executar
**Recuperar toda a vida**. As sete ações ficaram inteiramente alcançáveis,
sem sobreposição e sem rolagem horizontal. O feedback permaneceu visível.
O cenário completo terminou com quatro grupos aprovados e nenhum erro JS;
capturas em `capturas/admin-desktop.png` e `capturas/admin-compacto.png`.
