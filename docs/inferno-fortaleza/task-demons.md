# Task 3 — Demônios e Arquidemônio

Arquivos implementados: `js/catacombs-enemies.js` e `js/catacombs-boss.js`.

## Arte e identidade

Os seis comuns e os dois minis receberam desenhos procedurais novos, com
quatro quadros cada. Os desenhos não reaproveitam cabeças de caveira nem
corpos espectrais. A escala visual original e as chaves de textura foram
preservadas.

| ID compatível | Nome apresentado | Silhueta e equipamento |
| --- | --- | --- |
| `crypt_ghost` | Diabrete das Brasas | Corpo agachado, chifres, asas pequenas, garras e cauda |
| `crypt_bone_archer` | Arqueiro Infernal | Elmo chifrudo, armadura e arco de brasas |
| `crypt_crawler` | Cão das Correntes | Quadrúpede, dorso de obsidiana, presas e coleira acorrentada |
| `crypt_acolyte` | Cultista da Fornalha | Máscara fechada, túnica, chama e incensário suspenso |
| `crypt_sentinel` | Sentinela de Obsidiana | Armadura larga, escudo e arma de haste |
| `crypt_banshee` | Súcubo das Cinzas | Armadura completa, asas de morcego, grevas e cauda |
| `crypt_executioner` | Carrasco Acorrentado | Ombreiras espinhosas, machado pesado e correntes |
| `crypt_soulkeeper` | Carcereiro Infernal | Peito-fornalha gradeado, chaves e braseiro |

O chefe agora se chama **Arquidemônio das Cinzas**. O desenho de 48 × 48
mostra quatro chifres, asas curtas, ombreiras em fogo, peitoral de
obsidiana com núcleo incandescente, correntes, manoplas e cascos separados.
O quadro de preparação levanta os braços. O antigo cajado foi removido.

As mensagens das sete ondas, avisos, cores de projéteis, fúria e morte
acompanham a fortaleza. `crypt_soul` passou a desenhar uma brasa com
núcleo luminoso; selos do chefe, cultista e carcereiro usam o efeito
`fire` existente. Os sons de aviso, explosão e chefe continuam usando
os efeitos sintetizados disponíveis.

A prancha `demons-art-preview.png` reúne nove linhas na ordem da tabela
e chefe, e quatro colunas correspondentes aos quadros 0–3. Ela foi
produzida executando os desenhadores reais numa caneta de rasterização
local em Node, sem Chrome ou servidor. Ela serve para revisão da arte;
a integração final no jogo fica sob responsabilidade do root.

## Contratos preservados

Permanecem `stage: 'catacombs'`, IDs `crypt_*`, `CATACOMB_ENEMY_IDS`,
`CATACOMB_BOSS`, `NecromancerBoss`, `drawCryptCreature`,
`drawNecromancer`, `drawNecromancerAssets` e animações existentes.
Nenhum valor de vida, velocidade, dano, raio, XP, frequência, alcance,
tempo de onda, composição ou limite populacional mudou. `ghost`,
funções de IA e colisão continuam iguais. O limite de seis invocações
do chefe e a limpeza condicionada ao UID continuam no mesmo código.
Nenhum objeto Phaser, emissor, timer ou tween foi adicionado.

## Verificação

- `node --check js/catacombs-enemies.js`: passou.
- `node --check js/catacombs-boss.js`: passou.
- `node tests/catacombs_checks.cjs`: 16/16 passaram.
- Comparação em VM contra baseline anterior à edição: todos os valores
  numéricos, referências de IA, IDs, eventos e contratos de animação
  permaneceram iguais, excluindo os campos visuais e nomes.
- Duas verificações comportamentais adicionais em memória, usando os
  fixtures reais de `catacombs_checks`: 18/18 passaram no total. Cobriram
  orçamento compartilhado de seis invocações, reuso de objeto com novo
  UID, limpeza idempotente do chefe, 18 projéteis na fúria, seis avisos
  dentro da arena, dano/raio/slow e sequência de delays preservados.
- Rasterização dos 36 quadros reais: todos os pixels cabem nos limites
  de suas texturas, incluindo pontas de asas e chifres. Prancha renovada
  depois do ajuste das pontas.

O root atualizou o literal antigo de nome na asserção do teste da
fábrica de chefe. Não foi necessária alteração de fixture de Phaser para
os novos desenhos. Os checks extras foram executados em memória e não
alteraram o teste compartilhado. Na primeira execução do check extra,
o harness consultou o argumento de projétil de índice 6; o índice real
é 5. Corrigido apenas o harness, e os 18 checks passaram.

## Limites de escopo

O tratamento genérico de mortes e impactos de inimigos comuns em
`js/enemies.js` ainda escolhe partículas compartilhadas `bone`/`dark`;
esse arquivo pertence à integração do root. Os efeitos configuráveis
destes dois arquivos já usam fogo. As texturas de ambiente e aura
`crypt_glow` são responsabilidade da tarefa de cenário.

Ruling: esta tarefa é exclusivamente visual e reversível, sem novas
mecânicas. A verificação usa regressões existentes e comparações de
contratos; não foram adicionados testes que apenas repetem nomes ou
paletas da implementação.
