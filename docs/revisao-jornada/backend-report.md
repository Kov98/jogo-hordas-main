# Backend: perfil e desbloqueio

Escopo entregue em `server.py` e `tests/test_accounts.py`, sobre a base
`1bed7c26fc245751ec2f0238ae1dd4c2b3e4c208`. Sem commit pelo agente;
integração pertence à raiz.

## Contratos

- `GET /api/session`, `POST /api/login` e `POST /api/register` acrescentam,
  no nível superior, `progress` e `stats`, preservando `user`, `csrf` e
  `settings`.
- `POST /api/runs/advance` retorna
  `{stage:'castle',run_id,progress,stats}`. Repetição na mesma run continua
  `200`, com o mesmo marco; duas solicitações concorrentes contam uma vez.
- `POST /api/runs/finish` retorna
  `{saved:true,ranked:boolean,points:number,progress,stats}`. Repetição,
  inclusive concorrente, continua `409` e não duplica dados.
- `progress` é exatamente
  `{castle_unlocked:boolean,forest_clears:number,castle_clears:number}`.
  Cada avanço forest→castle válido, de jogador não-prática, soma um marco;
  vitória válida no castelo soma outro. Regras customizadas podem conceder
  ambos os marcos mesmo com `ranked:false`; os tempos de ambas as fases
  continuam validados.
- `stats` é exatamente `{runs,victories,kills,damage,points,best_points}`,
  agregando todas as runs do usuário com `state='finished'`, `ranked=1` e
  `practice=0`, em todas as dificuldades. Não agrega apenas a melhor run.
- Anônimo e admin recebem ambos os objetos zerados; admin escolhe qualquer
  fase por sua role, sem registrar progresso de jogador.
- `/api/runs/start` sem `stage` começa em `forest`. Jogador bloqueado recebe
  `403` ao pedir `castle`, inclusive prática. O erro mantém cookie, sessão,
  CSRF e a run anterior ativos.

## Persistência e migração

SQLite recebe duas colunas aditivas em `runs`: `forest_cleared` e
`castle_cleared`. Os marcos são escritos na transação existente e o perfil
é calculado somente para o usuário da sessão; troca de conta não mistura
dados. Abandono posterior da run não apaga uma passagem já conquistada.

A primeira migração valida os tempos, fases, prática, role e plausibilidade
das vitórias históricas, preenchendo os marcos uma vez. Mantém as fases
legadas como `castle`, resultados, senhas e sessões; a limpeza antiga de
runs abertas sem sessão continua intacta. Reexecutar `initialize()` não
reconta nem reescreve os marcos.

Ruling: vitória histórica legítima iniciada diretamente no castelo libera
castelo e soma `castle_clears`, sem inventar `forest_clears`. Preserva o
acesso conquistado antes da introdução do bloqueio; se fosse desejado
forçar esses jogadores a refazer a floresta, essa regra precisaria mudar.

## Evidência

- RED antes de implementação: oito testes novos, nove falhas esperadas
  (a migração tem dois subcasos), zero erros. Registro: `backend-red.log`.
- GREEN focal: os mesmos oito testes passaram; `backend-focused.log`.
- Primeira API completa: 29 testes, duas incompatibilidades esperadas nos
  testes antigos (`test_campaign_stage_validation_and_practice` e
  `test_scores_compute_points_reject_replay_and_unreal_time`). Fixtures
  antigas foram adaptadas para pedir `castle` explicitamente e desbloquear
  por uma passagem real da floresta; o retorno de perfil é verificado.
- API completa final:
  `python3 -m unittest discover -s tests -p 'test_*.py' -v` — **29/29 OK**,
  29,101 s; registro: `backend-green.log`.
- `git diff --check` passou.

Testes novos cobrem sessão preservada no 403, padrões de fase/perfil,
progresso concorrente idempotente, vitória única, persistência/reinício,
isolamento entre contas, admin/prática, regras customizadas, agregação de
stats entre dificuldades e migração de esquemas anteriores com/sem fases.
Não foram executados browsers nem acessados servidor ou dados de produção.
