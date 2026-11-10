# Verificação final da expansão

Concluída em 10/11/2026. As sete novidades aprovadas estão integradas:
quatro evoluções, altares, seis relíquias, segredo da floresta, coleção com
aparências e poderes iniciais alternativos, áudio dinâmico e Catacumbas.
O guia de uso é [Catacumbas e segredos](../CATACUMBAS-E-SEGREDOS.md).

## Testes

- **Servidor:** 33 testes aprovados em 148,625 s, incluindo migração aditiva,
  compatibilidade das vitórias antigas, acesso às Catacumbas, avanços
  explícitos/idempotentes, relógios das três fases, vitória e ranking.
  [Log](api-test.log).
- **Jogo e contratos:** 12 suítes, **103 checagens aprovadas**; sintaxe de
  67 JS/CJS e compilação de 4 Python. [Resumo](unit-validation.md) e
  [log completo](unit-test.log).
- **Navegador:** os fluxos abaixo passaram no Chrome com Phaser real e sem
  erros JavaScript. Cada runner usou servidor, contas e banco descartáveis;
  Chrome e suíte HTTP pesada foram executados em sequência.

| Fluxo | Resultado | Evidência |
| --- | --- | --- |
| Poderes, Canalizador, bruxa, mago elétrico e partículas | 10 grupos aprovados | [new-content](new-content-test.log) |
| Coleção, bloqueios, escolhas e persistência após recarregar | 4 grupos aprovados | [collection](collection-test.log) |
| Seleção das três fases, perfis, mouse/toque e storage bloqueado | 6 grupos aprovados | [selector](selector-test.log) |
| Teclado, pausa e janelas sobrepostas, após a correção do dash | 8 grupos aprovados | [controls](controls-test.log) |
| Cinema da floresta, FPS baixo, travessia e cancelamento | Aprovado | [forest-cinema](forest-cinema-test.log) |
| Sessão atrasada, escadaria e cutscene final | 6 grupos aprovados | [journey-regressions](journey-regressions-test.log) |
| Jornada autenticada, checkpoint e vitória final persistida | 8 grupos aprovados | [journey](journey-test.log) |
| Floresta, três fases, hordas e continuação sem rede | 9 grupos aprovados | [forest](forest-test.log) |
| Treze receitas, seis relíquias no guia, dash, baús e Hardcore | 12 grupos aprovados | [expansion](expansion-test.log) |
| Altares, símbolos/Guardião, quatro evoluções, duas travessias e Necromante | Aprovado | [catacombs](catacombs-test.log) |
| Cadastro, sessão, ranking, admin, banimento, regras e logout | 7 grupos aprovados | [accounts](accounts-test.log) |

A simulação da floresta percorreu 900 segundos, encontrou as 14 criaturas
e atingiu 105 inimigos simultâneos. A simulação no Hardcore percorreu
900 segundos com pico de 240 inimigos, sem exceder os pools. O Chrome
também conferiu dois contatos simultâneos: joystick mantido, dash pelo
segundo dedo e soltura sem cancelar o movimento.

O fluxo completo confirmou que as quatro evoluções, relíquias e dash
atravessam Floresta → Castelo → Catacumbas. O Castelo abre a escadaria e
devolve o controle; somente o Necromante conclui a campanha. A jornada com
conta mantém o mesmo runId, envia cada avanço uma vez e restaura a vitória
final e os desbloqueios após recarregar.

## Revisões e correções

Não restam achados materiais abertos nas revisões de
[evoluções/relíquias](task-1-review.md),
[campanha/exploração](campaign-exploration-review.md),
[persistência/metaprogressão](persistence-meta-review.md) e
[controles finais](input-final-review.md).

As correções verificadas incluem dano do Guardião opcional, posições finais
seguras dos spawns, dano das ondas do Cataclismo acompanhando a frente
visível, isolamento da origem do perfil, mute imediato e toques rápidos
de E/Enter/Shift/Espaço. Os comandos não se repetem após pausa, perda de
foco ou troca de fase. A revisão final dos controles acrescentou 18
verificações com as implementações reais de Key/JustDown do Phaser.

## Capturas e alcance

[Índice das capturas conferidas](capturas/README.md).
Os testes de duração e combate usam simulação acelerada e cenários
controlados. O toque foi simulado no Chrome; não houve medição em celular
físico nem uma partida manual de 45 minutos. Não há dependências novas de
runtime. Os processos de teste foram encerrados ao concluir os runners.
