# Auditoria de persistência, perfis e administração — 11/11/2026

Foram confirmados e corrigidos dois defeitos de isolamento. A revisão também percorreu `server.py`, `js/portal.js`, `js/meta.js` e os contratos existentes de autenticação, progresso, ranking e campanha. Nenhum servidor HTTP, navegador ou banco real do usuário foi iniciado/alterado por esta tarefa; a integração HTTP e Chrome ficou com o coordenador.

## P1 — Checkpoint de outro perfil aplicado ao reiniciar

**Impacto:** depois de morrer, trocar de conta ou sair/entrar e selecionar **Jogar novamente**, o novo perfil recebia poderes, relíquias, nível e aparência do checkpoint anterior. O início da nova partida já usava a conta atual, portanto o estado local anterior entrava na partida dessa conta. A autorização de fases do servidor continuava ativa, mas não impedia a transferência de um checkpoint de uma fase acessível a ambos.

**Causa:** `GameScene.buildScene()` criava o snapshot sem origem; `EndScene.again()` o encaminhava sem conferir identidade; `GameScene.create()` capturava a identidade nova e `buildScene()` restaurava o snapshot antigo.

**Reprodução e evidência:** `node tests/persistence_checks.cjs` foi executado antes da correção. Falhou com `guest checkpoint must not enter user.2's replay`, mostrando o snapshot encaminhado com nível 12, `fire_hurricane`, `glass_heart` e aparência `oathbound`. Após corrigir a tela de fim, a segunda execução falhou em `run identity after session refresh must own its checkpoint`: a identidade mudava dentro do `beginRun`, e a criação ainda restaurava o snapshot anterior.

**Correção:** `js/game.js:58` descarta o checkpoint cuja origem difere de `metaProfileKey`, depois de receber `run.profile_key`; `js/game.js:146` grava a origem no checkpoint gerado. `js/scenes.js:270` também confere a identidade antes de encaminhar o replay. A segunda verificação cobre a troca assíncrona durante a atualização de sessão. Checkpoint sem origem é descartado, pois este formato é apenas memória da página, sem migração de arquivo/banco. O `carry` da campanha em andamento conserva a origem e não foi alterado.

**Regressão:** o teste cobre convidado→conta, conta→convidado, conta A→conta B, troca durante `beginRun`, origem ausente e preservação do checkpoint para a mesma conta/convidado. A construção completa do Phaser e a geração/restauração do snapshot no navegador pertencem à validação integrada do coordenador.

## P2 — Comando administrativo atrasado atingia uma partida nova

**Impacto:** se a partida fosse reiniciada enquanto a resposta de autorização de um comando estivesse pendente, o comando antigo operava no jogador da nova partida. Reautenticar a mesma conta administrativa também não invalidava a resposta anterior.

**Causa:** `GameAdmin.execute()` aguardava `GamePortal.request()` e só depois buscava a cena atual. Conferia apenas `isAdmin`, sem capturar a inicialização, jogador ou sessão que originaram a ação. O Phaser pode reutilizar o mesmo objeto de cena no reinício, portanto comparar apenas a referência da cena seria insuficiente.

**Reprodução e evidência:** `node tests/admin_lifecycle_checks.cjs` foi executado antes da correção e falhou com `command authorized for an old initialization must reject after scene restart`. Um `heal` pendente era autorizado, a inicialização e o jogador eram substituídos e a resposta curava o jogador novo.

**Correção:** `js/admin.js:10` captura cena, `initialization`, jogador, ID da conta e CSRF antes do pedido. Antes de aplicar o retorno, confere a sessão e as três referências do jogo. Uma resposta da partida ou sessão anterior é rejeitada sem modificar a nova.

**Regressão:** cobre reinício com reutilização da cena, substituição do objeto de cena, alteração de CSRF mantendo privilégio administrativo e aplicação normal de `heal` na sessão/partida de origem.

## Verificação executada nesta tarefa

- `node tests/persistence_checks.cjs`: dois grupos aprovados após os dois REDs observados.
- `node tests/admin_lifecycle_checks.cjs`: dois grupos aprovados após o RED observado.
- `node tests/meta_progress_checks.cjs`: seis grupos aprovados, incluindo isolamento de descobertas, reload e storage bloqueado.
- `node tests/state_transfer_checks.cjs`: três grupos aprovados, incluindo relíquias/loadout e crédito ao convidado de origem.
- `node --check` para `js/admin.js`, `js/scenes.js` e `js/game.js`: saída zero.
- `python -m py_compile server.py`: saída zero.

Não foram alterados `server.py`, `js/portal.js` ou `js/meta.js`: a revisão não confirmou outro defeito reproduzível nesses arquivos. A compatibilidade das campanhas v2/v3, resultados históricos e IDs `catacombs` permanece no backend existente; a execução da suíte HTTP completa está no relatório do coordenador.

## Limites

O ranking continua validando resultados informados pelo navegador com vínculo à conta/sessão, tempo e limites plausíveis; não simula o combate no servidor. Esse limite já consta em `docs/CHECKPOINT.md` e não foi apresentado como um novo defeito. Tolerâncias de tempo de avanço e comparação de campanhas históricas foram lidas, sem alteração de regras ou alegação de vulnerabilidade não reproduzida.

Os testes novos usam o código real das cenas e dos comandos em VM Node, com as fronteiras externas substituídas. Eles verificam o isolamento e os efeitos observáveis, sem alegar cobertura de renderização, rede real ou desempenho.
