# Conclusão da rodada de correções — 04/11/2026

## Cinco achados da revisão integral

1. **Dois toques simultâneos:** `input.activePointers` mudou de2 para3.
   O Phaser3.80.1 local reserva o índice0 para mouse e processa os índices
   `1 <= i < pointersTotal`. Com2 só o primeiro toque era processado.
   O contador3 permite os contatos1/2; não foi necessário alterar a biblioteca.
2. **Baús alcançáveis:** `ProgressionSystem.dropChest` resolve a posição com
   a mesma folga/colisão do jogador, verifica obstáculos e tenta a posição
   do jogador quando necessário. Entregas sem espaço não são marcadas e tentam novamente.
3. **Vagas dos minibosses:** a reserva passou para `EnemyManager.spawn`,
   comum a eventos, diretor e invocadores. Encontros agendados usam as vagas
   reservadas. A reserva acompanha os encontros ainda pendentes.
4. **Capacidades1/2:** sempre há ao menos uma vaga comum. Na hora do encontro,
   um inimigo comum pode ser removido silenciosamente para ceder a vaga;
   um miniboss vivo não é removido. Com apenas uma vaga, o segundo aguarda.
5. **Dificuldade no resultado:** texto criado após os fundos e conferido na imagem.

As correções2–5 já estavam no checkpoint `dbecd32`; nesta retomada foram
lidas e verificadas junto com a correção final do toque.

## Causa da pendência de toque e evidência

Uma captura temporária dos eventos DOM confirmou que o Chrome entregava
`touchstart` com o segundo contato no canvas. O Phaser não o atribuía a
um ponteiro: `pointersTotal:2`, ponteiro1 pressionado, ponteiro2 inativo.
A investigação usa o código local e o
[código oficial da mesma versão](https://github.com/phaserjs/phaser/blob/v3.80.1/src/input/InputManager.js#L521).
Com3, o dash passou a disparar.

Depois disso, a falha de soltura estava na regressão: enviar o contato1 em
`Input.dispatchTouchEvent` de tipo `touchEnd` soltava o próprio joystick.
Enviando o contato2, os eventos DOM mostraram a soltura do dash enquanto o
contato1 permanecia ativo; enviar a lista vazia depois soltou o restante.
O teste definitivo usa essa sequência real do Chrome e também verifica
que a posição do jogador muda, além do estado do joystick.

## Teste que falhou e correção

- A reprodução do checkpoint (probe temporário, mesmo fluxo CDP do teste
  versionado) falhou esperando `dashCd > .1`; havia dois contatos DOM e só
  um contato processado pelo Phaser.
- Com apenas o contador corrigido, o dash disparou e a expectativa seguinte
  falhou: `Dash release cancelled joystick`. A captura DOM identificou que
  o teste estava soltando o contato1.
- Com a sequência de soltura corrigida, o probe passou com eventos1/2
  de início e término corretos. Não foi adicionada instrumentação ao jogo.

## Verificação integrada atual

Comando:

```sh
PLAYWRIGHT_MODULE=/home/escola/.cache/ms-playwright-go/1.57.0/package python3 tests/browser_accounts.py --expansion
```

Resultado: **12 grupos passaram; zero erros JavaScript.** Inclui receitas,
armas, baús nos quatro cantos/obstáculo/arena/limite/retry, dash e fumaça,
grimório/teclado, reservas sob saturação/eventos/invocação, limites1/2,
minibosses/XP, resultado e dois dedos simultâneos.
A simulação foi até900,05 segundos, atingiu240 inimigos e iniciou o chefe
com12600HP no Hardcore. Usa invencibilidade, armas evoluídas e escolhas
automáticas; não mede equilíbrio humano ou FPS. Capturas: `/tmp/muralha-expansao/`.
Também passaram `python3 -m unittest discover -s tests -v` (19 testes),
`python3 tests/browser_accounts.py --controls` (oito cenários) e a suíte
original `python3 tests/browser_accounts.py` (sete fluxos), usando o mesmo
PLAYWRIGHT_MODULE acima. Zero erros JavaScript nas três suítes.

A primeira execução de contas, concorrente com controles, terminou em
`waitForFunction` no comando de nível. A auditoria do banco descartável
continha stats/spawn/power e nenhuma requisição de nível. Não foi identificada
uma causa definitiva para esse timeout. A reprodução instrumentada passou
nos sete fluxos; a suíte original executada sozinha também passou, sem
alterar o painel nem aumentar timeouts. Não foi aplicado retry ao teste.

Re-revisão: `whole-fix-review.md`, cinco de cinco itens ADDRESSED e nenhum
blocker novo nas linhas corrigidas. Captura do resultado conferida pelo
revisor e pelo agente principal.

## Auto-revisão

Mudança de runtime nesta retomada limitada ao contador de entrada e seu
comentário; o teste foi corrigido e passou a observar movimento real.
A sequência de soltura é específica ao Chrome/CDP utilizado pelos testes;
o código do jogo continua recebendo eventos normais do navegador.
Não foram alterados banco, credenciais, autenticação ou regras de pontuação.
