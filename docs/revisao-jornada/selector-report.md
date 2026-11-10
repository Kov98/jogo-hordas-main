# Task 3 — seleção de fases e perfil

Arquivos de produção alterados: `js/selection.js` e `js/portal.js`.
Teste dedicado: `tests/selector_checks.cjs`, exporta `async (page)` e também
executa diretamente com `MURALHA_TEST_URL` apontando para um servidor descartável.
Nenhum commit e nenhum reinício do servidor de produção foram feitos.

## Interfaces entregues

- `StageSelectScene`, chave `StageSelect`, recebe `{char, stage?}`.
  Mostra Floresta, Castelo com bloqueio pelo perfil e Em breve sem fase real.
  Aceita atalhos, setas/A/D, Enter/Espaço, mouse e toque; Esc retorna aos heróis.
  Mudanças de `muralha-session` atualizam os bloqueios enquanto a cena está aberta.
  O bloqueio é conferido novamente ao terminar a transição.
- `DifficultyScene` conserva `char` e `stage`, apresenta o percurso escolhido,
  inicia `Game` com ambos e retorna para `StageSelect` no Esc.
  A URL não substitui a fase selecionada nesta cena.
- `GamePortal.getProgress()` devolve uma cópia do progresso do usuário atual ou
  do convidado; `canPlayStage(id)` admite somente forest e castle liberado
  (admin tem acesso ao castelo).
- `recordGuestAdvance()` libera castelo/incrementa conclusão da floresta;
  `recordGuestVictory()` incrementa conclusão do castelo. Ambos ignoram chamadas
  autenticadas. A integração chama esses métodos apenas em partidas normais.
- Progresso de convidado usa `muralha.guest.progress.v1` no localStorage, com
  fallback em memória. Perfil autenticado nunca usa nem altera esse registro.
- `portal.progress` e `portal.stats` recebem os dados do servidor. Sessão,
  login e registro trocam o perfil inteiro; avanço/final aplicam apenas os
  fragmentos retornados e preservam identidade e CSRF.
- Respostas de avanço/final e consultas de sessão iniciadas sob outra sessão
  não alteram o perfil atual. 401 limpa a sessão correspondente; 403 mantém
  a conta. Falha de rede mantém o progresso autenticado recebido anteriormente.
- `beginRun()` usa forest por padrão. Seu erro retorna
  `{run_id:null, ranked:false, error, status}` para a integração tratar bloqueios.
- `muralha-session` inclui `{user, settings, progress, stats}` e é emitido
  também quando progresso ou estatísticas mudam, sem expor CSRF.
- Minha conta apresenta as seis estatísticas e o estado das três apresentações
  de fase para a conta atual. A barra fica disponível nas seleções e escondida
  durante a cutscene de Game; um finale antigo não esconde a barra no Menu.

## Evidência de testes

RED observado antes da implementação: `Portal deve expor as quatro APIs de
progresso por jogador` (false != true). Após implementar o portal, três grupos
passaram e o teste falhou com `Seleção de fases deve existir como cena Phaser
real` (false != true), antes da implementação da cena.

Execução dedicada final em servidor `server.create_server` com diretório privado
temporário e porta efêmera: `node tests/selector_checks.cjs` -> exit 0,
`{"ok":true,"checks":6}`, nenhum `pageerror`.

1. Progresso guest salvo e restaurado após reload.
2. Conta nova separada de guest; default forest; 403 conserva login;
   avanço/final parciais conservam CSRF e alimentam Minha conta.
3. Resposta pendente de A descartada depois de trocar para B pela atualização
   real de sessão; offline não altera o perfil nem herda progresso guest.
4. Cenas Phaser reais: castelo/teaser não iniciam por atalhos; herói e fase
   sobrevivem ao retorno pela dificuldade.
5. Logout atualiza bloqueios da cena aberta; cartões funcionam com mouse e
   toque real por CDP.
6. Storage bloqueado por SecurityError usa progresso guest em memória.

Ambiente: `PLAYWRIGHT_MODULE=/home/escola/.cache/ms-playwright-go/1.57.0/package`
e `CHROME_PATH=/opt/google/chrome/chrome`. Verificações de sintaxe de ambos os
arquivos e do teste (`node --check`) e `git diff --check` passaram.

Os fixtures HTTP mantêm o mesmo perfil persistido nas respostas de sessão e
avanço/final para suportar o polling real. Somente a fronteira HTTP é controlada;
portal, DOM, teclado, mouse, toque e Phaser são os reais.

Regra adicional da barra na cutscene: RED `Barra de contas cobre a cutscene`
observado pela raiz antes da alteração; a validação integrada da raiz é a
evidência final desse ajuste e das demais suites compartilhadas.
