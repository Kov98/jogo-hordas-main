# Revisão independente da auditoria — 11/11/2026

## Parecer

Na revisão inicial, não identifiquei regressão reproduzível nas diferenças então disponíveis. As correções têm relação direta com os sintomas relatados e os testes acrescentados detectam o código anterior. O complemento ao final registra um P2 encontrado depois pela integração e a revisão da sua correção. Este parecer se limita às fontes e execuções descritas; o fechamento da integração visual e HTTP pertence à validação do coordenador.

Não editei fontes nem testes. O único arquivo escrito nesta revisão foi este relatório. Não iniciei navegador, API, servidor ou banco.

## Base e escopo

Comparei as fontes atuais com os membros de `C:/Users/pedri/Downloads/backups-jogo-hordas/pre-auditoria-20261111.zip`, usando `zipfile` em Python, sem extrair o arquivo. Normalizei somente as quebras de linha para a comparação lógica. As mudanças de produção ficaram em `js/admin.js`, `js/boss.js`, `js/enemies.js`, `js/finale.js`, `js/game.js` e `js/scenes.js`. `js/player.js` e `js/portal.js` não apresentaram diferença lógica após essa normalização.

Li os relatórios `campanha.md`, `combate.md` e `persistencia.md`, os testes acrescentados e os trechos de carry, captura/restauração do jogador, perfil, início/avanço/final de partida e aplicação de atributos envolvidos nas correções.

## Correções conferidas

| Correção | Linhas atuais | Resultado da revisão |
| --- | --- | --- |
| Fade do Castelo e filme final | `js/finale.js:126`, `js/finale.js:176` | O ajuste recupera somente o atraso em relação ao relógio do filme, descontando o progresso já processado pela câmera. Os testes usam a classe Fade real do bundle local do Phaser, observam opacidade 1 na conclusão e preservam as durações de 11 s e 9 s. |
| Combate após morte | `js/game.js:434`, `js/game.js:793` | Os retornos interrompem os sistemas seguintes quando a partida termina; o bloqueio em `damageEnemy` também cobre callbacks tardios. Os testes exercitam mortes em inimigos, chefe, tiros inimigos e perigos. |
| Joystick após pausa/foco | `js/game.js:188` | O mesmo descarte de ações agora limpa ativação, eixos e desenho. Os handlers reais são acionados antes de pause, sleep e blur do jogo/janela, sem `pointerup`. |
| Origem do checkpoint | `js/game.js:58`, `js/game.js:146`, `js/scenes.js:270` | A origem é gravada e conferida na tela de fim e novamente após `beginRun`. A checagem posterior cobre mudança de identidade durante a espera. O checkpoint da mesma origem continua sendo encaminhado. |
| Resposta administrativa atrasada | `js/admin.js:10`, `js/admin.js:14` | A resposta só atua sobre a cena, inicialização, jogador, conta e CSRF que originaram o pedido. A validação ocorre antes de alterar `isPractice` ou o jogador. |
| Contato de cadáver | `js/enemies.js:314` | A filtragem de `alive` impede o contato do inimigo morto que ainda está na grade do quadro. O teste mata o inimigo com o poder real antes de atualizar o gerenciador. |
| Gema ultrapassando o jogador | `js/enemies.js:83` | A coleta considera quando o passo alcança a distância restante antes de mover a gema. Isso elimina a oscilação sem mudar o valor coletado ou o limite de velocidade. |
| Onda do chefe e dificuldade | `js/boss.js:115` | O multiplicador de projétil é aplicado à velocidade uma vez. O teste observa a velocidade final dos projéteis e também confirma que o dano não recebe multiplicação duplicada. |

A estrutura do carry e as funções de captura/restauração não foram alteradas. A revisão dos testes de transferência e de poderes confirmou preservação de relíquias, loadout, atributos derivados e identidade de origem nos casos cobertos. Os testes de navegador alterados mantiveram as verificações anteriores; as diferenças são destinos de capturas e uma verificação adicional do checkpoint real.

## Verificação independente

Executei sequencialmente, com as fontes atuais, os comandos abaixo. Todos retornaram código 0: **77 verificações/grupos em oito suítes**.

| Comando | Verificações/grupos |
| --- | ---: |
| `node tests/admin_lifecycle_checks.cjs` | 2 |
| `node tests/persistence_checks.cjs` | 2 |
| `node tests/combat_audit_checks.cjs` | 3 |
| `node tests/castle_fall_checks.cjs` | 15 |
| `node tests/interaction_input_checks.cjs` | 11 |
| `node tests/state_transfer_checks.cjs` | 3 |
| `node tests/new_powers_checks.cjs` | 22 |
| `node tests/evolutions_relics_checks.cjs` | 19 |

Também executei os testes novos contra as seis fontes antigas, substituindo a leitura dos arquivos somente em memória. Cada uma das cinco suítes de regressão retornou código 1 pelos sintomas esperados:

- Administração: comando pendente aceito após substituir a inicialização. Em execução isolada do segundo caso, CSRF trocado também era aceito.
- Persistência: checkpoint de convidado encaminhado para `user.2`. Mantendo `scenes.js` atual e usando apenas `game.js` antigo, a primeira proteção passa e a segunda falha na mudança de identidade durante `beginRun`.
- Combate: contato de cadáver produz `104 !== 110`; gema permanece sem XP, `0 !== 1`; onda Hardcore fica na velocidade incorreta.
- Filmes/encerramento: ambos os filmes concluem com opacidade `5e-324`, em vez de 1; o teste intermediário do Castelo falha; sistemas continuam após dano fatal; dano tardio reduz HP inimigo de 50 para 40.
- Input: joystick retorna movimento `1 !== 0` após pausa sem `pointerup`.

Essas execuções não alteraram os arquivos atuais. Não foram removidas as verificações existentes para obter GREEN.

## Limites

As fixtures substituem renderização, rede e partes do ciclo de cena. Os testes de persistência observam o checkpoint admitido antes de `buildScene`; a construção completa e a restauração no Phaser real dependem da integração do coordenador. O uso da classe Fade real confirma seu estado, sem comprovar os pixels compostos da cena.

Não repeti HTTP, áudio, input físico, renderização, desempenho ou sessões reais. Não apresento o resultado anterior da suíte API do coordenador como execução própria. A observação de imagens de poderes durante filmes continua dependente da inspeção visual; não a promovi a achado sem reprodução.

## Complemento — P2 de legenda destruída no filme final

Após a revisão inicial, o coordenador reproduziu no Chrome um travamento ao chegar ao Inferno, derrotar o chefe e construir `SoulFinale`: a legenda da sobreposição anterior permanecia como referência a um Text destruído. `caption?.setText` ainda invocava o método desse objeto; o erro chegava a `Frame.setSize`, com `Cannot read properties of null (reading 'cut')`. Isso interrompia o desfecho antes da tela de resultado.

Revisei o patch mínimo liberado pelo responsável de campanha:

- `js/finale.js:10` limpa a referência `caption` no evento `shutdown` de cada criação de `FinaleOverlayScene`.
- `js/game.js:612` fornece a frase específica de abertura do filme das almas nos dados já encaminhados por `setCinematic` ao `launch`. Assim, a criação posterior recebe o texto correto mesmo quando o construtor de `SoulFinale` encontra `caption === null`.

Conferi no bundle local do Phaser que `ScenePlugin.launch` enfileira `start`, que `SceneManager.processQueue` respeita a ordem das operações e que `start` de cena ativa faz `shutdown` e nova criação. A correção preserva a política existente de lançar somente quando a sobreposição está inativa; não introduz reinício contínuo da sobreposição.

O novo caso em `tests/castle_fall_checks.cjs:126` modela a parada da chegada ainda na fila, o começo da derrota do chefe antes de processá-la e o início do filme final depois desses efeitos. Destrói o Text antigo, emite `shutdown` e mantém o novo `launch` enfileirado até drenar a fila. Verifica ausência da exceção, criação de `SoulFinale`, nova legenda com a frase exata e sua mudança aos 4,1 s.

Executei novamente `castle_fall_checks.cjs` (**16**), `catacombs_checks.cjs` (**16**) e `state_transfer_checks.cjs` (**3**): **35 verificações/grupos**, todos com código 0. Em duas execuções separadas e somente em memória, remover apenas a limpeza no shutdown fez o caso falhar com `reading 'cut'`; restaurar apenas a frase anterior no `setCinematic` fez o caso falhar na legenda inicial após o `create`. As outras verificações da suíte permaneceram presentes.

Não identifiquei regressão reproduzível nesse patch. A VM confirma o ciclo de referências e a ordem modelada; o Text destruído usa um método que reproduz a exceção, não o renderizador real. A reprodução original em Chrome e a repetição integrada posterior são responsabilidade e evidência do coordenador.
