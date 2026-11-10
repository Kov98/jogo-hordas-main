# Expansão: Catacumbas, segredos e progressão

## Autorização e intenção

O usuário pediu para implementar todas as sete ideias sugeridas: evoluções,
altares, relíquias com contrapartida, segredo da floresta, desbloqueios,
áudio imersivo e terceira fase. “Bora fazer todas” autoriza execução completa.
Os detalhes abaixo são escolhas do implementador dentro desse escopo.
Não solicitar outra autorização para tarefas reversíveis dessa expansão.

## Abordagem

Estender Phaser/WebAudio/Python/SQLite existentes, com módulos novos para
conteúdo e exploração. Conservar arte procedural e funcionamento offline.
Essa abordagem reaproveita pools, receitas, carry, portas e diálogos. Uma
reescrita ou um motor externo traria migração sem benefício para o pedido.

## Evoluções e relíquias

Quatro receitas usam arma no nível 8, passiva nível 1 e baú após 05:00:

| ID | Receita | Resultado |
| --- | --- | --- |
| fire_hurricane | cyclone + area | Furacão de Fogo: vórtices e zonas de brasas |
| celestial_judgment | radiant_beam + range | Julgamento Celestial: colunas anunciadas e explosão |
| plasma_storm | plasma + rate | Tempestade de Plasma: núcleos orbitais e arcos |
| meteor_cataclysm | meteor + damage | Cataclismo: meteoros e duas ondas expansivas |

Resultados são evoluções exclusivas de baús, não armas comuns. Destruir a
base cancela ataques/visuais. Limites por instância: 6 vórtices/6 zonas,
3 colunas, 3 núcleos, 4 meteoros/ondas. Dano e modificadores existentes,
UIDs reciclados e pools globais continuam respeitados.

Máximo de três relíquias únicas por partida; escolher é opcional. Seus
efeitos são derivados dos IDs, separados de `player.mods`, e acompanham
carry/checkpoint sem reaplicar multiplicadores:

| ID | Relíquia | Efeito e contrapartida |
| --- | --- | --- |
| twin_seal | Selo Gêmeo | dobra tiros de flechas/lanças/fogo/plasma; −18% velocidade |
| blood_oath | Juramento de Sangue | +45% dano abaixo de 35% HP; +15% dano recebido |
| glass_heart | Coração de Vidro | +30% dano; +25% dano recebido |
| restless_clock | Relógio Inquieto | +25% frequência; −15% dano |
| pilgrim_chain | Corrente do Peregrino | +20% velocidade; −12% frequência |
| ashen_cup | Cálice das Cinzas | +20% dano; curas 40% menores |

UI mostra nome e desvantagem antes da escolha. Chefes não são puxados.

## Altares e segredo

Dois altares por fase em posições caminháveis e distintas. E/Enter ou toque
abre escolha pausada de até três relíquias não possuídas. Custo explícito:
25% do HP máximo; não é permitido pagar se isso matar o jogador. Cancelar
não custa vida. Consumo e recompensa ocorrem uma vez, só na confirmação.
Chance anunciada de emboscada de 35%, usando o pool existente. Altares sem
escolhas ou com inventário cheio informam isso e não cobram.

Na floresta, três símbolos distintos exploráveis ativam um santuário
secreto, em uma clareira lateral. Interagir ali invoca o Guardião do Juramento
(`forest_oathkeeper`), opcional e independente do boss da fase. Ataques
telegrafados, barra própria e recompensa exclusiva de baú/relíquia e visual
“Juramentado”. Pool cheio adia invocação; sumiço/morte silenciosa não premia.
Antes do boss oficial, encerrar encontro opcional e limpar ameaças, sem
concluir a fase ou conceder vitória indevida. Símbolos/altares usados são
parte do snapshot da fase; nova tentativa restaura seu checkpoint de entrada.

`ExplorationSystem`: constructor(scene,saved), update(dt), interact():boolean,
getPrompt(), getStatus(), onKill(enemy), beforeBossFight(), capture(), destroy().
Interação é recusada durante cinema, morte, boss oficial ou outro menu.

## Campanha em três fases

Floresta conserva portão e cinema. Castelo deixa de encerrar a campanha:
derrotar Cavaleiro rompe selo e revela escadaria, devolvendo controle. Depois
E/Enter/toque inicia caminhada → fade → Catacumbas → saída com fade.
O Necromante das Almas é o novo chefe final; só sua derrota concede vitória.
Transições canceláveis por shutdown, alvo explícito, sem avanço duplicado.
Manter wrappers enterCastle/nearCastleGate para o trajeto já existente.

Catacumbas das Almas: pedra azul quase preta, sarcófagos, nichos e fogo
turquesa, câmaras conectadas e arena central. Armadilhas de espinhos e almas
anunciadas, limitadas e próximas da câmera; suspensas durante filmes/boss.
Seis comuns exclusivos: crypt_ghost, crypt_bone_archer, crypt_crawler,
crypt_acolyte, crypt_sentinel, crypt_banshee. Dois minis próprios aos 5/10:
crypt_executioner e crypt_soulkeeper. Boss de selos, almas e invocações
limitadas, com nova arte e desfecho. Duração padrão permanece 15 min por fase.
Não misturar espécies novas nas hordas do castelo/floresta.

Seleção substitui “Em breve” por Catacumbas, bloqueadas até concluir Castelo.
Perfis com vitórias históricas no Castelo já possuem esse desbloqueio.
HUD, menus, ranking, dificuldade e resultado reconhecem três fases.

## Desbloqueios

Sem aumentar permanentemente atributos: desafios liberam aparências e uma
opção de poder inicial alternativo por herói. Milestones consultam progresso
e estatísticas do perfil atual: concluir floresta, 1000 abates, concluir
castelo e concluir Catacumbas. Vanguarda libera Machados, Sombra Verde Gelo,
Arcanista Feixe de Luz e Canalizador Mini Tornado, respectivamente. Aparências
Cinzas, Tempestade, Real e Abissal acompanham esses quatro marcos. Juramentado
é recompensa local pelo segredo. Mostrar requisitos e escolhas na seleção e
coleção acessível por botão/tecla C no menu, com toque e teclado.

Preferências/eventos locais usam armazenamento por usuário ou convidado;
troca de conta não transfere conquistas. Desbloqueios de campanha de contas
são derivados do servidor e reaparecem em outro navegador. Eventos locais
(segredo/altares/evoluções) são cosméticos e persistem neste navegador.
Armazenamento bloqueado mantém sessão em memória e não impede jogar.
Loadout só é aplicado em nova partida; carry/checkpoint tem prioridade.

## Áudio

WebAudio procedural, sem downloads/licenças/dependências. Vento e drone,
galhos e sussurros esparsos; trilha cresce com aproximação/boss/fúria e muda
por fase. Até 2 loops e 6 vozes musicais; sem emissores/intervalos ilimitados.
Gesto inicial necessário, M silencia imediatamente sons contínuos e SFX;
pausa, blur, diálogo e shutdown silenciam e limpam nós. Falha de áudio é
ignorada. `Soundscape(scene).update(dt)/destroy()`.

## Servidor e compatibilidade

Adicionar campos/timestamps e versão de campanha com migração aditiva.
Preservar contas, hashes, sessões, resultados e vitórias históricas.
Novas partidas são versão 3, só terminam com vitória em Catacumbas. Versão 2
existente conserva a interpretação antiga. Avanço POST aceita alvo explícito
`stage:'castle'|'catacombs'`; omitir alvo significa castle para compatibilidade.
Repetir o mesmo alvo é idempotente; saltos/recuos falham. Registrar conclusão
de cada fase e tempos mínimos por fase/total. Progresso inclui
catacombs_unlocked/catacombs_clears. Novos IDs aceitos no admin. Sem publicação.

## Verificação e limites

VM: receitas/dano/limites/limpeza, relíquias/cura/carry, exploração/UID/pagamento,
loadout/contas/storage e ciclo do áudio. HTTP: migração, acesso/avanço/tempo,
vitória final/idempotência e IDs. Chrome: três fases, cutscenes/escadaria,
interação E/toque, seleção/coleção, segredo/altares, áudio/mute e regressões.
Chrome e testes HTTP pesados serão sequenciais. Não medir desempenho em
dispositivos físicos sem acesso a eles. Backup ZIP anterior à expansão;
workspace sem Git, portanto sem worktree/commit artificial.
