# Revisão independente — persistência e metaprogressão

Revisão da Task 4 em 09/11/2026, sobre a especificação e o plano
`2026-11-09-catacumbas-e-segredos`. Escopo: `server.py`,
`tests/test_accounts.py`, `js/portal.js`, `js/meta.js`, menus/HUD,
ordem de scripts/arte e hooks de carry/loadout/eventos.

Foram lidos spec, plano, progress e preflight antes da revisão. Não foram
abertos Chrome ou API nem repetidas as suítes VM/HTTP sob execução do root.
Nenhum arquivo de produto ou teste foi editado por este revisor.

## Achados comunicados ao root

### P2 — vitória de uma conta é transferida ao convidado após logout

Referência original: `js/game.js:557`, em `onBossDefeated()`, e
`js/portal.js:580`, em `recordGuestVictory()`.

A vitória decide conceder progresso de convidado pelo usuário atualmente
conectado (`!GamePortal.user`), sem conferir o perfil que iniciou a partida.
Uma campanha normal iniciada em conta pode chegar às Catacumbas, abrir
“Minha conta”, sair da conta e depois derrotar o Necromante. O servidor
invalida a partida vinculada à sessão anterior, mas o cliente concede
`catacombs_clears` e o desbloqueio correspondente ao convidado. Isso viola
o requisito de não transferir conquistas entre perfis.

**Resolvido e aprovado em re-review.** `js/game.js:558` agora exige
`metaProfileKey === 'guest'` e passa essa origem ao portal. A travessia em
`js/game.js:617` faz a mesma verificação. `js/portal.js:569` e
`js/portal.js:580` aceitam origem explícita: `guest` altera somente
`guestProgress`, inclusive quando outra conta está conectada; uma origem
de conta não altera esse perfil. Chamadas sem origem mantêm a compatibilidade
anterior. Os únicos callers de produto passam a origem capturada.

### P2 — o perfil dos eventos é capturado antes de confirmar a partida

Referências originais: `js/game.js:40` e `js/game.js:48`, comparadas com
`js/portal.js:602`–`610` (`beginRun`).

`GameScene.create()` captura `metaProfileKey` antes de aguardar `beginRun()`.
O próprio `beginRun()` pode atualizar a sessão antes de criar a partida.
Por exemplo: a aba ainda está como convidado, outra aba autenticou a conta
e a primeira inicia uma partida. O refresh dentro de `beginRun()` cria
uma partida dessa conta, mas os eventos de segredo/evolução/altar continuam
gravados no convidado, e o loadout é consultado no perfil incorreto.

Reprodução isolada, sem servidor ou navegador: executar o método real
`GameScene.create()` com uma implementação controlada de `beginRun()` que
muda `portal.user` de 1 para 2 antes de devolver a partida. Resultado:

```json
{"currentProfile":"user.2","run":"account-two","originCaptured":"user.1"}
```

**Resolvido e aprovado em re-review.** `js/portal.js:607`–`611` devolve
`profile_key:'guest'` no retorno convidado e captura `user.<id>` após o
refresh, imediatamente antes da requisição de conta. Tanto sucesso quanto
erro devolvem essa origem; um erro que invalida a sessão não transforma
a tentativa de conta em progresso de convidado. `js/game.js:50` adota a
origem retornada em partidas novas, antes de aplicar loadout e construir
os sistemas. Carry conserva `metaProfileKey` e `metaRunId` anteriores,
e não é sobrescrito pelo novo campo da resposta.

## Re-review focado das correções

Leitura independente das alterações e das regressões acrescentadas em
`tests/state_transfer_checks.cjs:23`. Os testes chamam os métodos reais
de vitória e criação de `GameScene`: conta seguida de logout não concede
progresso ao convidado; convidado legítimo continua sendo creditado; a
identidade devolvida por `beginRun()` substitui a capturada antes do refresh.
O root informou execução RED→GREEN e rerun de três grupos verdes. Este
revisor não repetiu a suíte nem abriu Chrome/API.

Contratos de erro, retorno convidado, carry e callers de portal foram
conferidos. O checkpoint temporário preserva a build conforme a prioridade
definida na spec e não grava conquistas permanentes em outro perfil; não
constitui achado adicional. Nenhuma correção pendente desta revisão.

## Demais verificações estáticas

- Migração aditiva mantém registros históricos, hashes e sessões. Partidas
  existentes recebem versão 2; novos INSERTs gravam versão 3 explicitamente.
- Versão 2 termina no Castelo. Versão 3 exige Catacumbas e o total correto
  de fases a partir da fase inicial. Entrada no Castelo e nas Catacumbas têm
  timestamps separados; os mínimos usam `settings_json` da partida.
- Avanço valida usuário, sessão, estado e destino; destino omitido continua
  Castelo. Repetição do destino atual com timestamp não refaz o crédito nem
  o timestamp; saltos e recuos falham. Transações POST usam BEGIN IMMEDIATE.
- Conclusões são flags por partida. A vitória final preserva as flags
  intermediárias; perfis de conta derivam milestones do servidor. Vitórias
  históricas de Castelo liberam Catacumbas sem reescrever seus resultados.
- Os testes HTTP cobrem migração, preservação de resultados, sessões,
  concorrência/idempotência, três fases, clocks independentes, treino/admin
  e allowlists. A execução final da suíte é responsabilidade do root.
- `meta.js` separa armazenamento/cache por usuário ou convidado, trata falha
  de storage com memória, deduplica eventos e valida IDs de segredos e das
  novas evoluções. Eventos cosméticos permanecem locais, como definido na
  spec; não foi exigida sincronização desses eventos no servidor.
- Loadout depende dos milestones atuais; skins/poderes bloqueados não podem
  ser selecionados. Carry/checkpoint restauram IDs de relíquias e loadout
  antes dos poderes, sem incorporar os multiplicadores derivados em mods.
- Coleção oferece teclado/toque, acompanha mudança de perfil e remove seu
  listener ao fechar. Seleção atualiza ícones/tints ao mudar o perfil.
- Scripts registram dados/arte/chefes/mapas antes de criar as cenas; a
  geração de assets chama os hooks novos. HUD, resultado, ranking e guia
  reconhecem três fases e relíquias.

Não foram encontrados outros problemas materiais de segurança, perda de
dados ou migração no escopo revisado. Os dois achados de identidade foram
corrigidos e aprovados em re-review. A execução final integrada permanece
sob controle do root.
