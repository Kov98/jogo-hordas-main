# Preflight da expansão — 2026-11-09

Revisão estática da especificação, plano e contratos atuais. Sem edição do
produto, Chrome ou API. O escopo está autorizado e não requer novas decisões
do usuário. Antes de integrar, fixar os seguintes pontos entre implementadores.

1. **Versão, relógios e idempotência.** Migrar linhas existentes para
   `campaign_version=2`; criar novas partidas explicitamente com versão 3,
   inclusive após reinício do servidor. Conservar `advanced_at` como entrada
   no Castelo e adicionar um timestamp separado de entrada nas Catacumbas.
   Validar cada avanço contra o início da fase atual, sem sobrescrever esses
   timestamps em retries. O alvo omitido significa sempre `castle`; repetir
   o alvo atual devolve sucesso; `catacombs → castle` é recuo e falha.
   Duração mínima total usa o número de fases entre `start_stage` e o final
   da versão, além do mínimo de cada fase. `settings_json` da partida é a
   referência dos tempos, não a configuração administrativa atual. Preservar
   créditos históricos de Castelo durante migração e consultas de perfil.

2. **Carry/checkpoint e relíquias.** Root restaura IDs de relíquias antes de
   construir poderes, sem incorporá-los a `mods`. Fixar nomes de estatísticas
   no contrato compartilhado (`damage`, `speed`, `rate`, `incoming`, `healing`)
   ou publicar o mapa equivalente no relatório do owner. O checkpoint de
   entrada precisa conter relíquias, aparência/loadout e exploração daquela
   fase; carry para a fase seguinte não deve transportar altares/símbolos
   consumidos da fase anterior. Retry restaura o snapshot de entrada, não o
   estado final da tentativa. Há uma cura direta em `GameScene.startBossFight`
   (`p.hp += 50%` limitado), fora de `Player.heal`; encaminhá-la pelo efeito
   de cura para respeitar Cálice das Cinzas. Recuperação de HP na entrada de
   fase é regra de checkpoint e deve ser tratada separadamente da cura.

3. **Tags do Guardião e pool reciclado.** `EnemyManager.spawn` zera flags de
   minis/boss, mas ainda não conhece tags de exploração. Se o Guardião usa
   `isBoss` para impedir atração/knockback, conservar também uma tag exclusiva
   (`isExplorationBoss`, ou equivalente) e UID capturado. Zerar essa tag em
   todo spawn reutilizado. `EncounterDirector` não deve desalojar o Guardião
   ao abrir espaço para minis; seu filtro atual exclui `isBoss/isMiniBoss`.
   Não marcar o Guardião como mini agendado, que concederia recompensa dupla.
   O hook de exploração em `EnemyManager.kill` deve ficar após o retorno
   `silent`, e o crédito exige identidade/UID do encontro atual. Root chama
   `beforeBossFight()` antes de limpar inimigos e criar o chefe oficial.

4. **Pausa no mesmo quadro.** `scene.pause()` não interrompe o `update`
   JavaScript já em andamento. O menu de altar precisa definir seu latch
   síncrono antes de abrir o diálogo; root retorna imediatamente depois de
   `exploration.interact()` se houve pausa/menu. Impedir também abertura de
   baú/level-up durante esse latch e não retomar a cena se outro menu ou
   diálogo ainda a mantém pausada. O botão de toque e E/Enter devem passar
   pela mesma prioridade de interação: exploração próxima ou saída de fase.
   Para áudio, eventos de pause/blur/diálogo/shutdown precisam silenciar no
   ato: uma cena pausada deixa de executar `Soundscape.update()`.

5. **Ordem de scripts e geração de arte.** Carregar os registros de
   inimigos/arte das Catacumbas antes da construção de `STAGES`; filtrar
   Castelo por fase explicitamente para que `stage !== 'forest'` não inclua
   Catacumbas/Guardião. `SPR.generateAll` deve ver todos os registros e chamar
   as novas fábricas de texturas. Publicar os nomes exatos dos hooks de arte
   de Catacumbas, Necromante e exploração no relatório de cada owner; root
   integra `index.html`/`sprites.js`. Registrar também `RELICS` antes de
   exploração e `meta.js` antes de menus que o consultam. Classes de mapa e
   boss devem existir antes da primeira criação de `GameScene`.

6. **Recompensa local por perfil.** Definir o payload de
   `MetaProgress.record(event)` antes dos hooks (`type`, ID e identidade da
   partida/fase se usados para deduplicação). Eventos assíncronos de uma
   partida iniciada por uma conta não devem ser registrados no perfil de
   outra conta após troca de sessão. O segredo é prêmio local; progressão
   oficial de campanha permanece derivada do servidor. Hooks opcionais podem
   usar verificação de existência até a integração, sem impedir o jogo.

São lacunas de contrato e pontos de integração, não bloqueios de produto.
Os responsáveis podem adotar as decisões acima e seguir com a implementação.
