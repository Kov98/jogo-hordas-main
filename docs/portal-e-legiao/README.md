# Admin, portal e reforços do Inferno

O painel de administração deixa de encobrir botões com uma faixa vazia.
A mensagem de resultado fica em uma área própria no rodapé e permanece visível
enquanto se rola a lista. O problema foi reproduzido antes da correção por
hit-test: `.admin-status` estava por cima de **Adicionar XP**, mesmo vazio.

Depois de derrotar o Coração de Raízes, o portão do Castelo abre com o arco
inteiramente branco, halo e reflexo de luz brancos. Fechado, continua escuro
e bloqueado. A travessia segue por **E/Enter** ou pelo botão de interação,
com caminhada, transição e chegada pela porta interna do Castelo.

O Inferno recebe cinco espécies adicionais, totalizando onze comuns:

| Inimigo | Comportamento |
| --- | --- |
| Morcego da Fornalha | Voador rápido, frágil e com movimento ondulado. |
| Lanceiro Acorrentado | Anuncia uma linha e investe na direção marcada. |
| Piromante do Abismo | Marca um círculo fixo antes da explosão de fogo. |
| Golem da Fornalha | Lento, resistente, protegido pela frente e com golpe em cone. |
| Ceifador das Cinzas | Aproximação ágil e golpe de foice anunciado. |

As cinco espécies têm quatro quadros e silhuetas próprias. Elas aparecem
progressivamente, entram em dois novos encontros e também estão disponíveis
na lista de criação do administrador. Os minibosses, chefe, progresso salvo
e capacidade global de 240 inimigos foram preservados.

## Verificação

- **116 verificações em 13 suítes Node**, sem falhas: catálogo/IA/arte dos novos
  inimigos, 2.753 pixels do arco branco, luz fechada/aberta, colisão, spawn seguro,
  poderes, filmes, controles e ciclo administrativo.
- **8 testes HTTP de administração**, aprovados; o novo teste confirmou os cinco
  IDs aceitos pela API. Antes da inclusão no catálogo, o teste retornava 400.
- **75 arquivos JS/CJS** com sintaxe válida e os três arquivos Python compilados.
- Chrome final: os quatro grupos de integração passaram sem erro JavaScript,
  incluindo o admin em 1280×720, 480×600 e 360×600, com mensagem vazia e após
  executar uma ação; derrota real do primeiro chefe, porta aberta, E e chegada
  ao Castelo; cinco texturas animadas distintas no Inferno.
- Chrome `--inferno`: cinco grupos aprovados, sem erro JavaScript; as onze
  espécies renderizam, os poderes funcionam nos níveis 1/8, o chefe surge
  pelo gatilho normal de 900 s e sua vitória mantém o progresso histórico.
- Revisão independente concluída, sem novo bloqueador reproduzível no escopo.

Os testes usam bancos e perfis descartáveis, sem alterar dados reais de jogador.
Um primeiro teste de login no cenário já renderizado encontrou erro de conexão;
o driver passou a autenticar no menu com o loop de renderização suspenso durante
a verificação da senha. Os testes da API foram executados separadamente do Chrome.

## Evidências

- [Admin antes da correção](capturas/admin-antes.png)
- [Admin após a correção](capturas/admin-desktop.png)
- [Admin compacto](capturas/admin-compacto.png)
- [Porta branca aberta](capturas/porta-branca-aberta.png)
- [Cinco inimigos novos](capturas/cinco-novos-inimigos.png)
- [Diagnóstico do painel](admin.md)
- [Geometria e luz da porta](porta.md)
- [Inimigos, balanceamento e orçamento de texturas](inimigos.md)
- [Log das verificações Node](unidades.log)
- [Log da integração no Chrome](integracao.log)
- [Log do Inferno completo](inferno-browser.log)
- [Revisão independente](review.md)

O código anterior desta etapa foi guardado em
`C:/Users/pedri/Downloads/backups-jogo-hordas/inicio-portal-e-legiao-20261111.zip`.
Se o servidor já estava aberto, reinicie `python server.py` para carregar
os novos IDs da API e use **Ctrl+F5** no navegador.
