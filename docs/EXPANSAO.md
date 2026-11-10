# Sobrevivência de 15 minutos

> Conclusão em 04/11: dash com joystick e dois dedos corrigido;
> revisão final aprovada e suítes atuais passaram.
> Evidência atual em [RETOMADA-EXPANSAO.md](RETOMADA-EXPANSAO.md).

Implementado em 03/11/2026. Desde 04/11, a campanha possui floresta e castelo,
com 15 minutos por fase; veja [FLORESTA.md](FLORESTA.md). Abra `http://127.0.0.1:5501/` após iniciar
`./INICIAR-JOGO.sh`. O endereço normal mantém a abertura com os créditos.
Escolha o herói e, em seguida, a dificuldade.

## Controles e progressão

- WASD/setas: movimento. Os ataques continuam automáticos.
- Shift ou Espaço: dash curto na direção atual ou na última direção de movimento.
- Dash nível 1: 100 px, duração de 0,15 s e recarga de 1,8 s.
- Melhorias de dash aparecem ao subir de nível: nível 2 tem 115 px/1,4 s;
  nível 3 tem 130 px/1,05 s. Respeita obstáculos e os limites da arena.
- G ou botão **Grimório**: receitas e progresso da combinação atual; pausa a partida.
- P/Escape: pausa. M: som. F: tela cheia. F2: painel da conta administrativa.
- Em telas de toque, o botão **DASH** funciona junto ao joystick.

Os níveis oferecem três escolhas, respeitando o limite de seis armas e os
níveis máximos. As novas armas comuns são **Machados do Crepúsculo**,
**Estilhaços de Gelo** e **Jardim Venenoso**, todas com oito níveis.
Gelo reduz o avanço dos inimigos; veneno deixa zonas de dano persistente.

## Evoluções, uniões e tesouros

Uma evolução exige a arma no nível 8 e pelo menos um nível do atributo
indicado. Uma união exige as duas armas no nível 8. A partir de 05:00,
os baús oferecem combinações prontas; escolha uma recompensa para aplicá-la.
O atributo é preservado. A arma evoluída substitui a base; uma união ocupa
um espaço no lugar dos dois anteriores. Ingredientes consumidos não voltam
às escolhas comuns naquela partida.

| Requisitos | Resultado |
| --- | --- |
| Golpe Giratório + Vitalidade | Lâmina das Almas: cortes com roubo de vida |
| Relâmpago + Frenesi | Tempestade Eterna: raios e dano em área |
| Bola de Fogo + Força Bruta | Inferno Vivo: erupções e brasas persistentes |
| Machados do Crepúsculo + Aura Expansiva | Machados Ceifadores: foices que retornam e executam feridos |
| Estilhaços de Gelo + Olhar Distante | Nevasca: área glacial que acompanha o jogador |
| Jardim Venenoso + Vitalidade | Miasma Imortal: veneno que se espalha de vítimas |
| Lâminas Giratórias + Orbes Mágicos, ambas no máximo | Anel Celestial: duas coroas de estrelas |
| Nova Arcana + Explosão de Energia, ambas no máximo | Singularidade: vórtice que puxa e implode |
| Dash nível 3 + Passos Leves | Passo de Fumaça: desaparecimento, rastros e imunidade durante o dash |

O Passo de Fumaça não ocupa um espaço de arma. Sua imunidade termina ao
fim do dash ou quando o movimento é interrompido por um obstáculo.

Suprimentos aparecem aos 03:00, 07:00 e 12:00. Antes de 05:00, o baú
fornece melhorias comuns. Os dois minibosses também deixam baús. As caixas
permanecem no chão até serem recolhidas; não há sorteio de evolução sem os
requisitos completos.

## Hordas e chefes do castelo (relógio local da fase)

| Horário | Encontro | Recompensa ao derrotar |
| --- | --- | --- |
| 05:00 | Guardião da Tempestade: disparos e raios telegrafados | 250 XP × dificuldade e um baú |
| 10:00 | Senhor da Cripta: espirais de projéteis e investidas | 600 XP × dificuldade e um baú |
| 15:00 | Cavaleiro Sombrio, chefe final | Vitória ao derrotá-lo |

Cada miniboss aparece uma única vez. Não surge um terceiro aos 15 minutos.
A transição final limpa as hordas e prende o combate na arena ritual.
Uma limpeza administrativa ou a transição final não concede a recompensa
dos minibosses. O tempo de sobrevivência continua contando durante o chefe.

Quatro tipos comuns novos completam os 24 anteriores: **Arauto da
Tempestade**, **Alquimista Pestilento**, **Espectro da Geada** e **Carrasco
Infernal**. Eles usam raios marcados no chão, explosões venenosas, projéteis
que causam lentidão e investidas. As áreas marcadas dão tempo para esquivar.

## Dificuldades

Multiplicadores relativos ao Médio; a resistência normal também cresce com o tempo.

| Modo | Vida dos inimigos | Dano | Velocidade | Frequência de spawn | Chance de cura | XP | Pontos |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Fácil | 0,65 | 0,6 | 0,85 | 0,7 | 1,7 | 1,15 | 0,75 |
| Médio | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| Difícil | 1,5 | 1,4 | 1,15 | 1,5 | 0,75 | 1,1 | 1,5 |
| Hardcore | 2,6 | 2,2 | 1,35 | 2,8 | 0,4 | 1,3 | 2,5 |

Hardcore libera inimigos perigosos mais cedo, aumenta a densidade e acelera
projéteis em 25%. A vida/dano do chefe final multiplicam por 1,8; no Difícil,
por 1,3/1,35; no Fácil, por 0,7/0,65. O limite real continua em 240 inimigos
simultâneos, com pools limitados de tiros, perigos e efeitos. A cura comum
mantém 25% da vida máxima por item; muda a chance de cair.

O ranking tem um filtro por dificuldade. A escolha é registrada no início
da partida; o servidor calcula os pontos usando essa escolha. Partidas
antigas são classificadas como Médio sem perder seus resultados. As contas,
sessões, privilégios e banimentos foram preservados. Regras globais
personalizadas continuam disponíveis para o administrador.

## Snapshot anterior

- Commit anterior: `ec950d0`, na tag `snapshot/pre-expansao-20261103-100040`.
- Código arquivado em
  `/home/escola/Downloads/backups-jogo-hordas/jogo-hordas-20261103-100040.tar.gz`.
- Cópia privada consistente do banco e da credencial inicial em
  `~/.local/share/a-ultima-muralha/backups/20261103-100040/`, com permissões restritas.

O arquivo de código não inclui senhas nem banco. A migração de 540 para
900 segundos altera apenas a configuração antiga de fábrica; parâmetros
personalizados não são sobrescritos.

## Referências pesquisadas

O sistema foi inspirado nas regras de
[evoluções e uniões da wiki de Vampire Survivors](https://vampire.survivors.wiki/w/Evolution),
nas [escolhas ao subir de nível](https://vampire.survivors.wiki/w/Level_up)
e nos [baús de tesouro](https://vampire.survivors.wiki/w/Treasure_Chest).
O [post de referência enviado](https://www.reddit.com/r/VampireSurvivors/comments/12rhmjs/quick_reference_for_evolutions_and_unions_what/)
também foi consultado. Nesta fase de 15 minutos, os baús podem evoluir
após 5 minutos: é uma adaptação do nosso jogo, não uma regra geral de
Vampire Survivors. O dash evoluído usa a ideia de imunidade breve do
[Smoke Bomb de Cuphead](https://cuphead.fandom.com/wiki/Smoke_Bomb), com arte
procedural própria. Não foram copiados sprites dos jogos de referência.

## Verificação

```sh
python3 -m unittest discover -s tests -v
python3 tests/browser_accounts.py
python3 tests/browser_accounts.py --controls
python3 tests/browser_accounts.py --expansion
```

Os runners de navegador precisam de Chrome e Playwright. `PLAYWRIGHT_MODULE`
e `CHROME_PATH` aceitam os caminhos de instalações existentes. Usam um
servidor e banco temporários e não alteram contas reais.

O teste da expansão verifica as nove receitas e seus bloqueios, dano real
das onze armas adicionais, limpeza de órbitas, baú com escolha por teclado,
dash/colisão/imunidade, grimório e retorno do foco, minibosses/XP/baú,
ataques especiais, toque e uma simulação de 18 mil quadros no Hardcore até
o chefe final. As capturas ficam em `/tmp/muralha-expansao/`. A simulação
usa invencibilidade e escolhas automáticas para conferir a integração;
não substitui ajuste de dificuldade com pessoas jogando.
