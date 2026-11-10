# Revisão integral — Floresta e campanha

Base `08ec5a2`, pacote `/tmp/forest-full-review.diff` e árvore atual. Foram lidos o design/plano, os relatórios de cenário/criaturas e o estado de implementação, além dos contratos completos de jogo, progressão, servidor e ranking. Revisão somente leitura do produto; o único arquivo escrito por esta revisão é este relatório. Nenhum commit.

**Veredito final: aprovado, sem bloqueios remanescentes.** Nenhum Critical; o Important confirmado foi corrigido e verificado. Não foram confirmados outros problemas relevantes nos fluxos de duas fases, preservação de build/XP, sessão, colisões, criaturas, chefes ou legado.

## Critical

Nenhum encontrado.

## Important

Nenhum aberto.

### 1. Pontos ilimitados na floresta já vencida — corrigido

**Referências atuais:** `js/game.js:314` (`onBossDefeated`), `js/game.js:374` (`points`), `js/game.js:425` (congelamento de tempo); `server.py:521` (parcela temporal no resultado salvo); `tests/browser_forest.cjs:95` (regressão).

**Gatilho original:** derrotar o Coração de Raízes e permanecer na floresta antes de entrar no portão. O encontro já eliminou os inimigos, os disparos/perigos eram limpos e `spawningEnabled` permanecia falso. Entretanto, `update` ainda aumentava `t`; os pontos incluem dez vezes o total de segundos.

**Esperado:** o trecho seguro até o portão continuar caminhável e animado, sem permitir gerar pontos de sobrevivência indefinidamente. **Antes da correção:** um probe isolado carregando os métodos reais de `GameScene`, com dependências mínimas simuladas, executou 6.000 updates de 50 ms após a conclusão. Tempo `903 → 1202,9999999997`; pontos no Médio `25.776 → 28.766`; `stageCleared=true`, `spawningEnabled=false`. A duração acumulada também seria enviada ao servidor, que atribui pontos por ela. Era explorável pelo fluxo normal do jogo.

**Correção verificada:** `t` só avança enquanto a fase não foi concluída; `visualTime`, inicializado em `js/game.js:55`, continua alimentando a atualização do mundo em `:442`. Novo probe independente com os métodos reais: após 6.000 updates, tempo exatamente `903`, pontos exatamente `25.776`, relógio visual `1202,9999999997` e 6.000 chamadas de atualização visual. A regressão no Phaser real executa 200 updates caminhando e exige deslocamento com tempo/pontos exatamente constantes. A raiz informou falha desse caso antes da correção e sucesso da suíte completa da floresta depois dela: 8/8, zero erros JavaScript, incluindo transferência, mesma run, vitória após as duas fases, reinício e falha de rede. Leitura do carry confirma transferência do tempo congelado e reinício local em zero.

## Minor

Nenhum aberto. O texto de derrota ainda mencionava o castelo quando o jogador morria na floresta; a raiz corrigiu `js/scenes.js:212` para escolher a mensagem pela fase. A condição e a mensagem atual foram inspecionadas.

## Evidência e cobertura

- Evidência fornecida: API 21 testes; navegador da floresta oito grupos sem erros JavaScript, incluindo duas fases, bosses, reinício, simulação de 15 minutos, oito criaturas, mesma run, rede e clique duplo; geometria com 1.446 amostras de trilha e 2.616 de bordas; VM de criaturas oito grupos.
- Atualização final fornecida pela raiz: floresta 8/8 após a correção, castelo 12/12, controles 8/8 e contas/admin 7/7, todos sem erros JavaScript.
- Inspeção independente: carry reconstrói armas/níveis/órbitas e preserva passivas/modificadores, XP, dash, receitas completas e ingredientes consumidos; a fase 2 reutiliza a run e o snapshot de regras. Avanço é vinculado à sessão e idempotente, com transação serializada; a vitória exige fase 2 e duração mínima das duas fases. Migração atribui `castle` aos registros antigos e os filtros separam os percursos.
- Inspeção visual de `/tmp/muralha-floresta/inicio.png` e `portao-aberto.png`: floresta escura, vegetação própria, corpos estáticos, lampiões e trilha legíveis; sem tema de Halloween. O portão aberto e seu botão aparecem na chegada.
- As suítes estabelecidas não foram repetidas por esta revisão. As únicas execuções adicionais foram os dois probes focais do relógio, antes e depois da correção.

## Comportamentos e limites deixados fora

- Continuar em treino se o registro da passagem falhar é decisão explícita documentada; há aviso, build preservada e impedimento de envio ao ranking. Não foi tratado como defeito nem como prova de recuperação do registro perdido.
- Vida cheia na passagem, multiplicadores adicionais dos inimigos na fase 2 e chefe escalado somente pela dificuldade seguem os contratos registrados; não foram reinterpretados como regressões.
- Equilíbrio humano, diversão e capacidade de montar uma build sem invencibilidade não são demonstrados por simulação automatizada. FPS, carga de GPU e desempenho em aparelhos móveis reais também não foram medidos.
- A simulação e os resultados continuam originados no cliente, como antes. Não se afirma resistência completa a adulteração do cliente; a revisão cobre as novas validações de sessão/fase/tempo e o abuso por fluxo normal identificado acima.
- Não foram restaurados backups nem manipulados dados privados de contas. Preservação do legado foi avaliada no código e pela evidência dos testes de migração fornecidos.
