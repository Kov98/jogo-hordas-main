# Auditoria — 11/11/2026

Foram reproduzidos e corrigidos dez problemas em seis arquivos de produção.
O trabalho preserva a cadeia Floresta → Castelo → Inferno, as contas, os IDs
antigos da terceira fase e o progresso existente.

| Problema | Comportamento corrigido |
| --- | --- |
| Checkpoint transferido entre perfis | Poderes, nível, relíquias e aparência só são recuperados pelo perfil que criou o checkpoint; a identidade também é conferida após a atualização assíncrona da sessão. |
| Contato de inimigo morto | Um cadáver que ainda está na grade do quadro deixa de causar dano. |
| Combate após morte do herói | O golpe fatal interrompe os sistemas seguintes e callbacks tardios não aumentam dano ou abates. |
| Gemas oscilando em FPS baixo | A coleta ocorre quando o deslocamento do quadro alcança o jogador, sem ultrapassagens infinitas. |
| Joystick preso após pausa/foco | Pausa, sleep e perda de foco soltam o toque e zeram a direção. |
| Comando administrativo atrasado | A resposta só afeta a inicialização, jogador e sessão que originaram o comando. |
| Fade cortado na queda do Castelo | Mesmo um quadro longo alcança a opacidade final antes do avanço para o Inferno. |
| Fade cortado no final do Inferno | A apresentação do resultado respeita o escurecimento do filme, inclusive após travadas longas. |
| Legenda destruída no final do Inferno | O shutdown limpa a referência antiga; a criação enfileirada da sobreposição recebe a frase correta e não trava ao iniciar o filme seguinte. |
| Onda do Cavaleiro no Hardcore | A velocidade aplica o multiplicador da dificuldade uma vez; o dano permanece com seu próprio multiplicador. |

As regressões foram observadas antes das correções. A revisão independente
também executou os testes novos contra o código do backup somente em memória:
os testes falharam pelos sintomas esperados e passaram com o código atual.

## Verificação

- **132 checagens/grupos em 16 suítes Node** na rodada completa final, sem falhas; inclui poderes, fases,
  transferência, relíquias, exploração, áudio, spawn, controles e os novos casos.
- **33 testes HTTP**, aprovados em 283,496 s com bancos descartáveis; inclui
  autenticação, sessões, ranking, avanços idempotentes e compatibilidade histórica.
- **71 arquivos JS/CJS** com sintaxe válida e os três arquivos Python compilados.
- Chrome `--journey`: **8 grupos**, sem erro JS; campanha autenticada completa,
  mesma runId nas duas passagens, queda real, restauração de build/checkpoint,
  vitória no ranking e recarga do perfil.
- Chrome `--inferno`: **5 grupos**, sem erro JS; feixe vertical nos níveis 1/8,
  tornado, demônios, boss disparado pelo relógio normal de 900 s, enquadramento,
  filme final e persistência do progresso antigo.
- Chrome `--controls`: **9 grupos**, sem erro JS; teclado, pausa, diálogos
  sobrepostos e toque real mantido durante pausa não deixam movimento preso.
- Chrome `--journey-regressions`: **10 grupos**, sem erro JS; agora conclui o
  cenário que reproduzia o travamento de legenda, cancela filmes antigos e
  impede regressão do perfil por respostas atrasadas.
- Chrome `--forest-cinema`: aprovado; bloqueio de combate/atalhos, abertura
  do portão, entrada física, carry offline e cancelamento de respostas tardias.

Uma primeira execução de `--journey` detectou um problema no próprio teste:
o ajuste síncrono do relógio do banco descartável demorava mais de três segundos
enquanto Phaser continuava rodando. A inspeção da chegada passou a ocorrer antes
desse ajuste; o limite e as verificações de build, identidade e ranking foram
mantidos. Não foi alterado código de produção para resolver essa falha do teste.
Dois helpers também passaram a encerrar o callback de `page.evaluate` sem
retornar o objeto interno de cena do Phaser. Isso evita serializar todo esse
grafo ao trocar/reiniciar cenas; o helper de regressões havia parado nessa
operação. As verificações de reinício e de cancelamento foram mantidas.

## Evidências

- [Campanha, filmes e controles](campanha.md)
- [Combate e gemas](combate.md)
- [Persistência e administração](persistencia.md)
- [Revisão independente](revisao.md)
- [Log das checagens Node e sintaxe](unidades.log)
- [Log da campanha no Chrome](jornada.log)
- [Log do Inferno no Chrome](inferno.log)
- [Log de regressões e cancelamento](regressoes.log)
- [Log de controles e toque](controles.log)
- [Log do cinema da floresta](floresta-cinema.log)
- [Queda na lava](capturas/jornada/castelo-queda.png)
- [Feixe vindo do alto](capturas/inferno/radiant_beam-nivel-8.png)
- [Arquidemônio enquadrado](capturas/inferno/arquidemonio.png)

## Limites

Auditoria com leitura, regressões e fluxos selecionados, sem alegação de ausência
de todo bug possível. Os testes aceleram o relógio de jogo e usam perfis/bancos
temporários; não são uma sessão manual contínua de 45 minutos nem um benchmark
de desempenho. Os bancos reais dos jogadores não foram alterados.

Não houve defeito novo reproduzido no servidor, portal ou coleção nesta rodada.
Uma observação de efeitos de poderes congelados durante filmes não foi promovida
a bug confirmado sem reprodução visual específica. O ranking continua recebendo
estatísticas do cliente e validando vínculo, tempo e plausibilidade; não simula
o combate no servidor.

Backup do código antes da auditoria:
`C:/Users/pedri/Downloads/backups-jogo-hordas/pre-auditoria-20261111.zip`.

Para conferir a versão atual no jogo, recarregue a página com **Ctrl+F5**.
