# Validação independente de unidades e sintaxe

Executada em 10/11/2026, após a correção final dos comandos de interação e dash.
Nenhum arquivo de produção ou teste foi alterado por este validador.

**Resultado:** todas as 12 suítes passaram, com 103 checagens reportadas pelos
runners. Sintaxe e compilação também passaram. Todos os comandos de teste,
análise de sintaxe e compilação terminaram com código 0.

| Comando | Checagens | Resultado | Tempo |
| --- | --- | --- | --- |
| `node tests/evolutions_relics_checks.cjs` | 19 | PASSOU | 2.277 s |
| `node tests/exploration_audio_checks.cjs` | 14 | PASSOU | 1.184 s |
| `node tests/catacombs_checks.cjs` | 16 | PASSOU | 0.727 s |
| `node tests/safe_spawns_checks.cjs` | 6 | PASSOU | 3.072 s |
| `node tests/meta_progress_checks.cjs` | 6 | PASSOU | 0.867 s |
| `node tests/state_transfer_checks.cjs` | 3 | PASSOU | 0.749 s |
| `node tests/interaction_input_checks.cjs` | 10 | PASSOU | 0.805 s |
| `node tests/new_powers_checks.cjs` | 17 | PASSOU | 2.014 s |
| `node tests/new_creatures_checks.cjs` | 4 | PASSOU | 0.670 s |
| `node tests/ambient_fx_checks.cjs` | 1 | PASSOU | 0.407 s |
| `node tests/gates_checks.cjs` | 5 | PASSOU | 0.437 s |
| `node tests/forest_cinema_checks.cjs --unit` | 2 | PASSOU | 0.276 s |

- `node --check`: 67 arquivos JS/CJS, incluindo o Phaser local e os runners de browser (somente análise de sintaxe).
- `python -m py_compile docs/retomada-expansao/run-touch-probe.py server.py tests/browser_accounts.py tests/test_accounts.py`: 4 arquivos Python, sem executar seus entrypoints.
- `finale_checks.cjs` exporta um helper que exige uma página de navegador; foi validado somente por sintaxe e não foi contado como teste executado.
- `forest_cinema_checks.cjs --unit` termina antes de carregar Playwright.
- Nenhum Chrome, servidor HTTP ou teste de API foi iniciado por esta validação. Browsers e APIs permaneceram sob controle do root.

Os hashes confirmaram que nenhum arquivo de produção mudou durante o lote.
Somente `tests/browser_expansion.cjs` recebeu uma alteração concorrente esperada,
informada pelo root: a asserção do guia passou a verificar as 13 receitas e as
6 relíquias nas respectivas listas. O comando `node --check tests/browser_expansion.cjs`
foi repetido após essa alteração e passou (0.486 s), com o arquivo estável durante
a conferência.

O orquestrador inicial terminou com código 1 porque seu detector de estabilidade
encontrou essa alteração do helper; nenhum comando de validação falhou. A
conferência posterior terminou com código 0 e registrou o resultado final PASS.

Stdout, stderr, comandos e códigos de saída completos: [unit-test.log](unit-test.log).

Início UTC: `2026-11-10T17:46:26.670455+00:00`.
Fim do lote UTC: `2026-11-10T17:47:05.084554+00:00`.
Fim da conferência do helper UTC: `2026-11-10T17:47:20.267944+00:00`.
