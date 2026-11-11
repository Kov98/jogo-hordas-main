# Inferno, segredos e relíquias

Esta expansão acrescenta uma terceira fase e novos caminhos para montar a
build. Funciona com os recursos locais do jogo, inclusive o áudio sintetizado.
Na atualização visual, o Inferno substitui as antigas Catacumbas, mantendo
o progresso das partidas anteriores. Veja [Inferno e magia](INFERNO-E-MAGIA.md).

## Campanha

**Floresta Sombria → Castelo → Inferno.** Cada fase mantém o
chefe aos 15 minutos e minibosses aos cinco e dez, com quatro dificuldades.

Derrotar o Coração de Raízes abre o portão da floresta, revelando o interior
inteiramente branco e iluminado. Aproxime-se e use
**E/Enter** ou o botão de interação para entrar no Castelo.
Após derrotar o Cavaleiro Sombrio, a arena racha e o herói cai na lava;
a chegada ao Inferno é automática, com armas, relíquias, passivas e dash.
A vitória da campanha acontece após derrotar o **Arquidemônio das Cinzas**,
que aparece aos **15:00 da terceira fase**.

O Inferno é uma fortaleza demoníaca com muralhas de obsidiana, correntes,
grades-fornalha, monólitos acorrentados, espinhos e braseiros. Os ataques
das armadilhas são anunciados no chão. Sua população inclui Diabrete das
Brasas, Arqueiro Infernal, Cão das Correntes, Cultista da Fornalha,
Sentinela de Obsidiana, Súcubo das Cinzas, Morcego da Fornalha, Lanceiro
Acorrentado, Piromante do Abismo, Golem da Fornalha e Ceifador das Cinzas.
Os minibosses são Carrasco
Acorrentado e Carcereiro Infernal.

Quem já havia concluído o castelo na versão anterior encontra o Inferno
liberado. Vitórias e resultados históricos permanecem registrados.

## Quatro evoluções

Leve a arma ao nível 8, obtenha a passiva indicada e abra um baú a partir de
05:00. A evolução substitui sua arma base e preserva as demais melhorias.

| Arma + passiva | Evolução |
| --- | --- |
| Mini Tornado + Aura Expansiva | **Furacão de Fogo:** vórtices em chamas deixam zonas de brasas. |
| Feixe de Luz + Olhar Distante | **Julgamento Celestial:** colunas anunciadas e explosões luminosas. |
| Plasma + Frenesi | **Tempestade de Plasma:** núcleos orbitais descarregam arcos. |
| Chuva de Meteoros + Força Bruta | **Cataclismo:** meteoros lançam duas ondas expansivas. |

O **Grimório, tecla G**, mostra as receitas e os efeitos das relíquias.

## Altares e relíquias

Cada fase tem dois altares. Use **E/Enter** ou toque perto de um altar para
ver até três opções. O custo é **25% da vida máxima**, informado antes da
escolha; a oferenda não pode matar o herói. Cancelar é gratuito. A chance de
uma emboscada após a escolha é **35%**.

É possível carregar até três relíquias diferentes por jornada:

| Relíquia | Benefício | Contrapartida |
| --- | --- | --- |
| Selo Gêmeo | Dobra flechas, lanças, bolas de fogo e plasma | −18% de velocidade |
| Juramento de Sangue | +45% de dano abaixo de 35% da vida | +15% de dano recebido |
| Coração de Vidro | +30% de dano | +25% de dano recebido |
| Relógio Inquieto | +25% de frequência | −15% de dano |
| Corrente do Peregrino | +20% de velocidade | −12% de frequência |
| Cálice das Cinzas | +20% de dano | Curas 40% menores |

Os efeitos são calculados a partir das relíquias equipadas. Mudar de fase
ou restaurar o checkpoint não acumula o mesmo bônus duas vezes.

## O segredo da floresta

Explore as trilhas laterais e decifre **três símbolos diferentes**. Eles
ativam o santuário do Juramento. Interagir com o santuário permite enfrentar
o **Guardião do Juramento**, um chefe opcional com barra própria.

Sua derrota entrega um baú, oferece uma relíquia e libera a aparência
**Juramentado**. Esse encontro não encerra a fase. O chefe oficial continua
seguindo seu horário normal.

## Coleção e escolhas iniciais

No menu, use **C** ou **Coleção e desafios**. Na seleção de personagem,
**Personalizar** permite escolher a aparência e o poder inicial disponível.

| Desafio | Aparência | Poder inicial alternativo |
| --- | --- | --- |
| Concluir a floresta | Cinzas | Vanguarda: Machados |
| Somar 1.000 abates em partidas normais encerradas | Tempestade | Sombra Verde: Gelo |
| Concluir o castelo | Real | Arcanista: Feixe de Luz |
| Concluir o Inferno | Abissal | Canalizador: Mini Tornado |
| Derrotar o Guardião secreto | Juramentado | — |

Escolhas valem para uma nova partida. A travessia e o checkpoint mantêm a
build daquela jornada. O progresso de campanha de contas vem do servidor;
o modo convidado guarda seu progresso neste navegador. Preferências e
descobertas cosméticas locais ficam separadas por perfil e persistem neste
navegador. Trocar de conta não concede suas conquistas ao outro perfil.
Em contas, os abates desse desafio vêm dos resultados válidos para ranking;
treinos e partidas com regras personalizadas não contam.

## Áudio e controles

Vento, drones graves, galhos, sussurros e uma trilha procedural acompanham
cada fase. A intensidade cresce com a aproximação do chefe e sua fúria.
O som começa após um clique ou tecla. **M** liga/desliga todo o áudio;
pausa, diálogos e perda de foco silenciam os sons contínuos.

WASD/setas movem, Shift/Espaço acionam dash, P pausa, G abre o grimório,
E/Enter interagem e C abre a coleção no menu/seleção. Os botões também
aceitam toque.

## Execução e evidências

No Windows, na pasta do jogo: `python server.py`. Abra
<http://127.0.0.1:5501/>. Entrar em uma conta é opcional.

Os testes usam bancos e contas descartáveis. Spec, plano, relatórios,
revisões, logs e progresso da implementação estão em
`docs/catacumbas-expansao/`. Os testes principais são:

```text
node tests/evolutions_relics_checks.cjs
node tests/exploration_audio_checks.cjs
node tests/catacombs_checks.cjs
node tests/safe_spawns_checks.cjs
node tests/meta_progress_checks.cjs
node tests/state_transfer_checks.cjs
node tests/interaction_input_checks.cjs
python -m unittest discover -s tests -v
python tests/browser_accounts.py --catacombs
python tests/browser_accounts.py --collection
python tests/browser_accounts.py --journey
```

Os runners de navegador requerem Playwright e Chrome/Chromium já instalados;
as variáveis PLAYWRIGHT_MODULE e CHROME_PATH indicam suas localizações.

A [verificação final](catacumbas-expansao/final-validation.md) reúne os
33 testes do servidor, 103 checagens do jogo, fluxos no navegador,
revisões e [capturas](catacumbas-expansao/capturas/README.md).
