# Estado da expansão — retomada em 04/11/2026

A pausa de 03/11 foi retomada a pedido do usuário. O checkpoint anterior é
`dbecd32`; ele contém a implementação principal e os registros da pausa.
A falha restante de dois dedos foi reproduzida e corrigida. A re-revisão
final aprovou as cinco correções. As suítes atuais passaram e não há
pendências bloqueadoras desta expansão.

## Projeto e acesso

- Pasta: `/home/escola/Downloads/jogo-hordas `, branch `main`.
- Phaser 3.80.1 local, JavaScript sem build; servidor Python stdlib/SQLite.
- Iniciar: `./INICIAR-JOGO.sh`. URL normal: `http://127.0.0.1:5501/`.
  A URL normal abre a Intro; `?nointro`/`?char` são atalhos de desenvolvimento.
- Contas e banco: `~/.local/share/a-ultima-muralha/`, fora do Git.
- Remoto `origin`: `https://github.com/pedroquemtatristenaotamais/jogo-hordas.git`.
  O checkpoint anterior foi criado localmente; a tentativa de envio naquela
  sessão exigiu autenticação. Confira a sincronização atual com `git status`.
- O usuário autorizou trabalhar e commitar na main e pediu para não repetir
  pedidos de permissão. Não há instrução atual de pausa.

## Funcionalidades prontas para conferência

- Partida padrão de 15 minutos; minibosses aos 5/10 e chefe final aos 15.
- Fácil, Médio, Difícil e Hardcore, com ranking e multiplicadores próprios.
- Três armas comuns novas, seis evoluções, duas uniões e evolução do dash.
- Baús físicos e grimório com requisitos/progresso; evoluções após 5 minutos.
- Dash com Shift/Espaço ou toque, três níveis, fumaça e imunidade breve.
- Quatro inimigos comuns novos e dois minibosses com padrões diferentes.
- Login opcional, conta admin, ranking, controles e Intro preservados.

Receitas, controles, balanceamento e referências: [EXPANSAO.md](EXPANSAO.md).

## O que foi concluído na retomada

1. Investigação capturou dois eventos DOM, mas apenas um toque processado
   pelo Phaser com `activePointers:2`. Nesta versão, o mouse ocupa o índice 0
   e o laço de toque usa`i < pointersTotal`; o valor 3 libera os contatos 1/2.
2. Com o contador corrigido, o teste de soltura revelou um problema da
   própria sequência CDP: soltava o contato do joystick. Agora solta o
   contato do dash e confirma que o joystick permanece ativo, além de
   verificar movimento real do personagem.
3. Foram revalidadas as correções já salvas no checkpoint: baús alcançáveis
   perto de muralhas/obstáculos e dentro da arena; reserva central de vagas
   para os minibosses; regras customizadas de 1/2 inimigos; dificuldade
   visível na tela de resultado.

Relatório técnico e evidência do teste que falhou antes da correção:
[whole-fix-report.md](retomada-expansao/whole-fix-report.md).
Re-revisão focada: [whole-fix-review.md](retomada-expansao/whole-fix-review.md).
Os briefs, probes e logs antigos nessa pasta são históricos do checkpoint;
o teste oficial atual é `tests/browser_expansion.cjs`.

## Evidência atual

- API: 19 testes passaram em04/11.
- Expansão: 12 grupos passaram, zero erros JavaScript. Inclui dois dedos,
  receitas/uniões, dano das armas, dash/fumaça/colisão, baús e coleta,
  população saturada, minis/XP, regras pequenas e tela de resultado.
- Controles: 8 regressões passaram, zero erros JavaScript.
- Contas/admin: sete fluxos passaram na suíte original executada sozinha,
  zero erros JavaScript. A primeira tentativa concorrente teve timeout
  no comando de nível; a reprodução instrumentada e a suíte original
  isolada passaram sem alterações no painel. O banco da primeira tentativa
  não registrava uma requisição de nível. A causa do timeout não foi confirmada.
- Hardcore: simulação até 900,05 segundos, pico 240 inimigos, chefe 12600HP.
  Usa invencibilidade, armas evoluídas e escolhas automáticas; não mede
  equilíbrio humano nem FPS.
- Servidor local reiniciado em 5501; `/api/session` confirmou regra 900s.
- Capturas em `/tmp/muralha-expansao/`; resultado visual conferido.

```sh
python3 -m unittest discover -s tests -v
PLAYWRIGHT_MODULE=/home/escola/.cache/ms-playwright-go/1.57.0/package python3 tests/browser_accounts.py
PLAYWRIGHT_MODULE=/home/escola/.cache/ms-playwright-go/1.57.0/package python3 tests/browser_accounts.py --controls
PLAYWRIGHT_MODULE=/home/escola/.cache/ms-playwright-go/1.57.0/package python3 tests/browser_accounts.py --expansion
```

Os runners usam bancos descartáveis fora do projeto. Não alteram contas reais.

## Snapshot anterior à expansão

- Commit `ec950d0`, tag `snapshot/pre-expansao-20261103-100040`.
- Código: `/home/escola/Downloads/backups-jogo-hordas/jogo-hordas-20261103-100040.tar.gz`.
- Cópia privada consistente do banco e credencial:
  `~/.local/share/a-ultima-muralha/backups/20261103-100040/`.
- Integridade do arquivo e preservação das contas foram conferidas na sessão
  anterior. Banco/credencial nunca foram incluídos no Git.

## Decisão para regras administrativas extremas

Com capacidade de apenas uma entidade, dois minibosses não cabem juntos.
O encontro seguinte aguarda uma vaga e preserva o miniboss vivo. Com a
capacidade padrão 240, a reserva garante ambos nos horários previstos.
