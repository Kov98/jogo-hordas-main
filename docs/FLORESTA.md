# Floresta dos Esquecidos → Castelo

A campanha começa na floresta, à noite. A mata fecha os quatro lados do
mapa com árvores; a trilha sinuosa passa pela clareira e conduz ao portão
do castelo, ao norte. Lampiões junto a aldeões caídos, postes e à entrada
iluminam o caminho. Os corpos são decoração estática, sem combate ou colisão.

O cenário usa árvores de copas diferentes, raízes, samambaias, folhas,
rochas com musgo, troncos, carroças abandonadas, poças e névoa. A paleta
fria da mata contrasta com a luz âmbar dos lampiões. A noite é permanente
nessa fase; não há elementos festivos de Halloween.

## Fases e passagem

Depois do herói há seleção de fase, seguida da dificuldade. O Castelo
permanece bloqueado até atravessar a floresta nesse perfil. Veja
[JORNADA.md](JORNADA.md) para progresso por conta, reinício e cutscene final.

Cada fase tem 15 minutos de sobrevivência antes do chefe. As quatro
dificuldades e as receitas de armas continuam funcionando nas duas fases.

| Fase | 05:00 | 10:00 | 15:00 |
| --- | --- | --- | --- |
| Floresta | Matriarca do Brejo | Caçador Sem Sepultura | Coração de Raízes |
| Castelo | Guardião da Tempestade | Senhor da Cripta | Cavaleiro Sombrio |

Os minibosses concedem 250/600 XP, multiplicados pela dificuldade, e um baú.
O Coração de Raízes usa marcas de raízes, investidas, esporos e espinhos;
o combate ocorre numa clareira cercada temporariamente por espinhos.

Vencer a floresta remove a barreira e abre o portão. Siga os lampiões para
o norte. Perto da porta, use **E**, **Enter** ou o botão **Entrar no castelo**.
A porta permanece selada antes de derrotar o chefe. A vitória da campanha
só aparece depois de derrotar o Cavaleiro Sombrio na segunda fase.
A muralha é física; somente a porta aberta permite a passagem central.
No castelo, a chegada sai da porta sul. Morrer reinicia a fase atual com
os equipamentos de entrada. O chefe final rompe o piso ritual e provoca
a queda no fogo antes da tela de vitória.

Na passagem, armas, níveis das armas, evoluções, uniões, ingredientes
consumidos, atributos, nível, XP e dash são mantidos. A vida é recuperada.
O relógio local reinicia, enquanto abates, dano e tempo de combate acumulam.
Depois de vencer a floresta, caminhar ou esperar até a porta não acrescenta
tempo nem pontos; o cenário e os controles continuam funcionando.

Os inimigos comuns do castelo, após a travessia, têm multiplicadores de
1,8 na vida, 1,15 na frequência de aparição e 1,2 no dano, além da dificuldade
escolhida. O chefe mantém sua escala de dificuldade própria. O limite de
240 inimigos continua valendo. O nível máximo do jogador é 100.

## Criaturas da floresta

| Criatura | Comportamento |
| --- | --- |
| Lobo da Penumbra | Persegue e anuncia uma investida |
| Aranha do Brejo | Marca áreas venenosas no chão |
| Fogo Errante | Flutua e dispara magia lenta |
| Saqueador Perdido | Ataca de perto com machado |
| Raiz Retorcida | Resiste aos golpes e ergue perigos no solo |
| Mariposa Fúnebre | Voa em trajetória ondulada |
| Druida Corrompido | Dispara e invoca raízes |
| Espreitador dos Galhos | Se oculta ao longe e prepara uma emboscada |
| Javali Musgoso | Prepara uma investida forte; resiste a empurrões |
| Serpente do Lodo | Mantém distância e cospe veneno que causa lentidão |
| Corvo das Ruínas | Voa em trajetória ondulada e lança três penas em leque |
| Sentinela de Espinhos | Avança lentamente e anuncia uma varredura ampla |

Os quatro tipos adicionais começam a aparecer aos 70, 115, 35 e 280 segundos,
respectivamente, na dificuldade Média. Há ondas próprias com javalis aos 85 s,
serpentes aos 175 s, corvos aos 420 s e sentinelas aos 735 s. A dificuldade
antecipa os desbloqueios no diretor; as ondas mantêm seus horários.

As ondas da floresta e do castelo são separadas. Os catorze inimigos da mata,
incluindo os minibosses, e seu chefe têm sprites procedurais próprios.

## Contas e ranking

A mesma partida do servidor atravessa as duas fases. O ranking permite
escolher **Campanha — Floresta e Castelo** ou **Castelo — fase isolada**,
além da dificuldade. Os resultados antigos são preservados como castelo
isolado. O servidor registra a fase inicial/atual e a passagem, valida a
sessão e impede vitória da campanha antes das duas etapas.

Se a conexão falhar ao registrar a passagem, a travessia continua com os
equipamentos preservados; uma mensagem informa que aquela campanha não
será registrada no ranking. A entrada repetida não cria outra partida.

## Snapshot e arquivos

Antes das mudanças foi criada a tag
`snapshot/pre-floresta-20261104-082006`, apontando para `08ec5a2`.
O código está arquivado em
`/home/escola/Downloads/backups-jogo-hordas/jogo-hordas-pre-floresta-20261104-082006.tar.gz`.
Uma cópia consistente dos dados privados foi salva em
`~/.local/share/a-ultima-muralha/backups/20261104-082006/`.
Banco e credenciais continuam fora do Git e da pasta publicada.

Os novos arquivos são `forest-art.js`, `forest.js`, `forest-enemies.js`,
`forest-boss.js` e `stages.js`. O cenário reutiliza os limites e colisões
de `World`; a passagem recria `GameScene` com uma cópia dos atributos e
equipamentos. Os relatórios ficam em `docs/revisao-floresta/`.

## Verificação

```sh
python3 -m unittest discover -s tests -v
python3 tests/browser_accounts.py --forest
python3 tests/browser_accounts.py --expansion
python3 tests/browser_accounts.py --controls
python3 tests/browser_accounts.py
```

O runner usa um banco descartável fora do projeto. `PLAYWRIGHT_MODULE` e
`CHROME_PATH` podem apontar para instalações locais de Playwright e Chrome.
O teste da floresta cobre as doze espécies, seus ataques, bordas, trilha, decoração estática, portão selado,
dois minibosses, morte do chefe, caminhada sem gerar pontos, passagem com
progressão, vitória final, reinício, sessão/mesma partida, clique duplicado
e falha de rede. A simulação de 15 minutos usa invencibilidade, armas
evoluídas e escolhas automáticas; não mede equilíbrio humano nem FPS.
Capturas de conferência: `/tmp/muralha-floresta/`.
