# Adaptação dos helpers browser para três fases

Follow-up concluído em 2026-11-09. Somente os cinco arquivos de testes abaixo
e este relatório foram alterados. Nenhum arquivo de produção foi modificado
neste follow-up; Task 2 anterior não foi refeita.

- `tests/browser_forest.cjs`: preserva cenário, geometria, criaturas, minis,
  progressão/build, caminhada segura, simulação de quinze minutos e offline.
  Agora verifica que o Cavaleiro revela escadaria sem vitória, atravessa as
  Catacumbas com a build, exige espécies exclusivas e termina no Necromante
  com pelo menos 2700 segundos. O trecho autenticado conserva um início e
  exige exatamente dois avanços com o mesmo runId; duplicatas são recusadas
  nas duas passagens.
- `tests/browser_journey.cjs`: mantém os testes físicos das portas e o retry
  do checkpoint do Castelo, com build preservada e estatísticas reiniciadas.
  Acrescenta escadaria, chegada das Catacumbas, `SoulFinale`, barras da
  sobreposição, vitória única e retorno ao estágio inicial da campanha.
  A conta nova não herda nenhum dos dois desbloqueios do convidado. A campanha
  autenticada atravessa as duas fases com o mesmo runId, conclui Catacumbas,
  valida resultado salvo/classificado e recarrega desbloqueio/conclusão.
  O acesso direto posterior ao Castelo e o salvamento de abates continuam.
- `tests/journey_regressions.cjs`: o Castelo é testado como revelação de
  escadaria sem final; os checks de diálogo, tempo real a 1 FPS e ausência
  de tempo de sobrevivência durante o desfecho agora usam `SoulFinale` nas
  Catacumbas. A proteção contra sessão atrasada roda após avanço para Castelo,
  avanço para Catacumbas e resultado final, preservando os campos de progresso,
  estatísticas e CSRF em cada etapa.
- `tests/selector_checks.cjs`: usa o objeto de progresso completo com cinco
  campos. Convidado registra duas passagens e vitória final (três eventos);
  conta não pode inventar progresso local. Mantém 403 sem logout, resposta
  parcial, troca A→B durante resposta pendente, offline, teclado, mouse,
  toque e storage bloqueado. Acrescenta alvo explícito no POST, desbloqueio
  da terceira fase e atalho/toque reais para Catacumbas. `soon` permanece
  apenas na lista de IDs inválidos, sem cartão fictício.
- `tests/browser_expansion.cjs`: os checks reais de todas as receitas e do
  grimório agora exigem treze. O restante de dano, dash, baús, pools, minis,
  dificuldade, UI e multitouch permanece.

## Relógios do fixture autenticado

`ageRun(runId, stage)` de `browser_journey.cjs` consulta `runs.start_stage`
no SQLite descartável fornecido pelo runner. Antes de cada passagem, envelhece
o início total e os timestamps das fases já percorridas. Para uma campanha
completa iniciada na floresta:

| Etapa atual | `started_at` | `advanced_at` | `catacombs_at` |
| --- | --- | --- | --- |
| Floresta, antes de avançar | agora − 905 s | preservado | preservado |
| Castelo, antes de descer | agora − 1810 s | agora − 905 s | preservado |
| Catacumbas, antes do final | agora − 2715 s | agora − 1810 s | agora − 905 s |

Isso satisfaz a validação de tempo de cada fase e do total sem tratar
`advanced_at` como início do chefe final. O helper também considera inícios
diretos no Castelo ou nas Catacumbas. Nenhuma alteração toca contas ou dados
fora de `MURALHA_TEST_DATA_DIR/jogo.sqlite3`.

## Verificação realizada

`node --check` passou para os cinco helpers. Revisão estática conferiu os
contratos atuais de `portal.js`, `game.js`, `scenes.js` e as verificações de
tempo do servidor. Chrome e API não foram executados por este owner: o root
estava usando a máquina e solicitou execução sequencial. Portanto este relatório
afirma sintaxe válida e adaptação dos testes, sem alegar resultados browser.

O root pode executar os helpers pelos flags existentes do runner Python:
`--forest`, `--journey`, `--journey-regressions`, `--expansion`; o seletor
também possui execução direta com `MURALHA_TEST_URL`, como antes.
