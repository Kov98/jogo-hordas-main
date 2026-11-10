# Servidor local, contas e ranking

Requer Python 3.8 ou mais recente com SQLite (sem instalar pacotes).
Na pasta do jogo execute `./INICIAR-JOGO.sh` ou `python3 server.py`.
Abra <http://127.0.0.1:5501/> e encerre com Ctrl+C no terminal.
O servidor atende somente neste computador; não foi publicado na internet.
Outra porta pode ser escolhida com `./INICIAR-JOGO.sh --port 5502`.

O Live Server pode continuar em `http://localhost:5500` ou
`http://127.0.0.1:5500`, enquanto este servidor fornece a API na porta 5501.
Use o mesmo nome de host no frontend e na API para compartilhar a sessão.
O conteúdo servido tem uma lista explícita de caminhos permitidos: página,
CSS, JavaScript e imagens/áudio/fontes em assets. Código Python, scripts,
documentação, links simbólicos e arquivos ocultos não são servidos.

## Conta administrativa inicial

Na primeira execução é criada uma conta `admin` com senha aleatória forte.
As credenciais ficam apenas em
`~/.local/share/a-ultima-muralha/admin-inicial.json`.
Se `XDG_DATA_HOME` estiver definido, a pasta é
`$XDG_DATA_HOME/a-ultima-muralha`. A variável `MURALHA_DATA_DIR` permite
escolher outra pasta de dados. O caminho efetivo aparece no terminal;
o servidor rejeita uma pasta de dados dentro da pasta publicada do jogo.
Abra esse arquivo em um editor local para consultar o usuário e a senha;
nunca publique, envie por mensagem ou inclua o arquivo em capturas de tela.
A pasta usa permissão 700, e o arquivo de credencial e o banco usam 600.
O servidor imprime somente o caminho do arquivo, nunca a senha.

Entre pelo menu de conta e troque a senha. A credencial inicial não é
atualizada após a troca; depois de confirmar o novo acesso, pode apagar
esse arquivo. Ele não é recriado se já existir uma conta administrativa.
Perder o arquivo e a senha atual exige restauração de um backup ou
manutenção local do banco; não há senha universal ou endpoint de promoção.

## Persistência e proteção

`~/.local/share/a-ultima-muralha/jogo.sqlite3` contém contas, sessões,
partidas, parâmetros e auditoria (ou a pasta externa configurada acima).
Os dados ficam fora do conteúdo publicado inclusive ao usar Live Server.
Para fazer backup, encerre o servidor e copie essa pasta de dados para
um local privado. Não apague essa pasta
para reiniciar a interface: isso apagaria as contas e o ranking.

Se uma versão anterior criou `.private/` dentro da pasta do jogo, pare
também o Live Server e mova todo o conteúdo para a pasta externa de dados
antes de iniciar esta versão. O servidor recusa iniciar enquanto essa
pasta legada existir. `.gitignore` também exclui credenciais e bancos
como proteção adicional contra inclusão acidental em commits.

Os nomes têm 3 a 20 caracteres (letras, números, ponto, `_` e `-`), são
normalizados em Unicode e não diferenciam maiúsculas de minúsculas no login.
Senhas têm de 8 a 128 caracteres; ficam no banco com PBKDF2-SHA256,
600000 iterações e salt aleatório por senha. Sessões expiram em sete dias,
usam cookie HttpOnly/SameSite=Lax e são armazenadas pelo hash do token.
O cookie é HTTP local; uma publicação exigirá HTTPS e ajustes de hospedagem.
Trocar a senha revoga outras sessões; banir revoga todas as sessões da conta.

O servidor verifica a conta atual, o papel e o banimento em cada chamada
autenticada. POST autenticado exige `X-CSRF-Token` retornado pela sessão.
Cadastros e logins aceitam apenas `username` e `password`. CORS com cookies
permite apenas os dois hosts locais na porta 5500 e na porta do servidor.
Há limites de tamanho do JSON, conexões simultâneas, frequência de chamadas
e tentativas de autenticação. Após excesso de tentativas, aguarde até dez
minutos antes de tentar novamente. As respostas de erro são JSON.

## Partidas e moderação

Visitantes jogam sem conta; somente contas enviam partidas. O servidor gera
um identificador no início, liga a partida ao dono, sessão e personagem, aceita
uma conclusão e invalida partidas antigas abertas quando outra começa.
Sair da conta ou substituí-la no login/cadastro invalida partidas abertas
da sessão anterior; entrar novamente não recupera uma partida classificável.
O início retorna também `settings`, os parâmetros oficiais gravados para
essa partida; o cliente aplica esse retrato antes de iniciar a simulação.
Confere números finitos, estatísticas, vitória após o surgimento do chefe,
duração máxima de quatro horas e duração compatível com o relógio do servidor
(tolerância de dez segundos; partidas abertas expiram após 24 horas).
Os pontos são `abates*100 + floor(dano)*2 + floor(segundos)*10`, mais 5000
por vitória; o total é multiplicado pelo modo escolhido e arredondado para
baixo: Fácil 0,75; Médio 1; Difícil 1,5; Hardcore 2,5. A dificuldade é vinculada
à partida no início; o envio final não pode trocá-la. A classificação exibe até 50 contas e a melhor partida de cada
uma para o critério e a dificuldade escolhidos, excluindo administradores e contas banidas.

Partidas de admin, treino e iniciadas com parâmetros globais diferentes
dos padrões ficam fora do ranking. O frontend deve marcar `practice:true`
quando usar parâmetros de teste locais. O servidor aplica limites amplos
de plausibilidade; como a simulação roda no navegador, isso não é um sistema
antifraude completo e estatísticas podem ser fabricadas por um cliente alterado.

O painel pode buscar até 200 contas por chamada e banir/desbanir jogadores.
Não permite banir administradores. Comandos administrativos são validados
por uma lista de comandos, argumentos, inimigos e poderes; o servidor apenas
autoriza e retorna o comando para a partida local. Mudanças globais valem
para as próximas partidas. Comandos, banimentos, ajustes e trocas de senha
ficam registrados na tabela `audit`, sem senhas nem tokens de sessão.

O contrato completo das rotas e dos limites administrativos está em
[contas-plano.md](contas-plano.md).

## Painel administrativo e conferência

Após entrar com a conta administrativa, use o botão **Admin** ou **F2**.
As abas são **Partida**, **Usuários** e **Regras do jogo**. Os comandos da
partida ficam disponíveis depois de iniciar um jogo; a moderação e as
regras podem ser acessadas também pelo menu. O painel pausa a partida e
preserva o estado de pausa ao fechar. Os moradores, o ranking e as telas
de fim de partida continuam disponíveis para visitantes.

O HUD e o resumo registram dano efetivo (sem contar dano excedente à vida
do inimigo), abates e pontos. O início de cada partida autenticada aguarda
os parâmetros oficiais do servidor. Visitantes também atualizam as regras
antes de uma nova partida quando o servidor está disponível.

Testes de API, sem dependências externas, com dados descartáveis:

```sh
python3 -m unittest discover -s tests -v
```

A conferência opcional em navegador real precisa de Node, Playwright e
Chrome/Chromium disponíveis no ambiente:

```sh
python3 tests/browser_accounts.py
```

`PLAYWRIGHT_MODULE` pode indicar o módulo Playwright instalado;
`CHROME_PATH` pode indicar o executável do navegador. O runner abre um
servidor em porta temporária e cria um banco fora da pasta pública, que é
removido ao final. Não altera contas, senhas ou ranking de uso normal.
As imagens da conferência são gravadas em `/tmp/muralha-ranking.png` e
`/tmp/muralha-admin.png`; não contêm credenciais.

Para conferir especificamente a recuperação de WASD/setas e os estados de pausa
após clicar em Conta/Ranking, execute:

```sh
python3 tests/browser_accounts.py --controls
```

Esse teste usa cliques e teclas reais no navegador: X, botão de fechar, Escape,
clique fora, teclas seguradas, pausa manual, escolha de melhoria e diálogos
sobrepostos. Ao fechar a última janela, o foco retorna ao canvas do jogo.

## Expansão de 15 minutos

O início autenticado aceita `{hero, practice, difficulty?}`; sem dificuldade,
usa `medium`. IDs válidos: `easy`, `medium`, `hard`, `hardcore`. A resposta
inclui a dificuldade vinculada à partida. `/api/leaderboard` aceita
`difficulty=medium` (padrão) ou os outros três IDs, além de `sort`.
Resultados antigos são migrados como Médio. A configuração de fábrica
migra de 540 para 900 segundos; regras personalizadas permanecem intactas.
As permissões de poderes e inimigos do admin incluem todos os novos IDs.
Veja [EXPANSAO.md](EXPANSAO.md) para controles, receitas e balanceamento.

```sh
python3 tests/browser_accounts.py --expansion
```

## Campanha Floresta → Castelo → Inferno

O frontend inicia a campanha com `stage:"forest"`.
`/api/runs/start` sem stage também começa na floresta.
IDs permitidos: `forest`, `castle` e `catacombs`; a resposta inclui stage e
`campaign_version:3`. Linhas antigas conservam versão 2 e sua interpretação
de vitória no castelo, sem alteração de pontos, contas ou sessões.
O ID `catacombs` é mantido por compatibilidade; a terceira fase apresentada
no jogo agora se chama Inferno.

`POST /api/runs/advance` recebe `{run_id, stage:"castle"|"catacombs"}` com a
mesma sessão e CSRF do início. Omitir stage significa sempre castle, por
compatibilidade. Cada alvo tem seu timestamp: `advanced_at` e `catacombs_at`.
Repetir o alvo atual não conta outra conclusão; saltos/recuos são recusados.
Uma nova vitória exige chegar ao Inferno, duração acumulada das fases
percorridas e tempo mínimo na fase final. Regras vêm do snapshot da run.
Abates/dano/pontos e runId acumulam na mesma jornada; o relógio creditado
fica congelado entre o golpe fatal e o término de cada travessia.

`GET /api/leaderboard?stage=forest` filtra campanhas; `stage=castle` filtra
jornadas iniciadas no Castelo e `stage=catacombs` as iniciadas na fase final.
A ausência desse parâmetro mantém a consulta
compatível de clientes antigos; o frontend sempre envia o percurso escolhido.
A conta, a dificuldade e as regras do início continuam vinculadas à run.

Veja [CATACUMBAS-E-SEGREDOS.md](CATACUMBAS-E-SEGREDOS.md) para a campanha atual.

## Perfil e acesso às fases

Sessão, login, cadastro, avanço e conclusão incluem `progress` e `stats`.
Progresso tem `castle_unlocked`, `catacombs_unlocked`, `forest_clears`,
`castle_clears` e `catacombs_clears`; estatísticas
têm `runs`, `victories`, `kills`, `damage`, `points` e `best_points`, agregando
resultados classificados concluídos da conta atual em todas as dificuldades.

Castelo e Inferno exigem conclusão da fase anterior. Vitórias históricas
legítimas no Castelo já liberam o Inferno. `403` conserva a sessão e a partida
aberta. Avanço e vitória não-prática de jogador gravam marcos na transação
existente, sem duplicar na repetição. Regras personalizadas também exigem
tempos de fase válidos. Admin escolhe qualquer fase, sem ganhar progresso.
A migração acrescenta colunas em runs e aproveita conquistas históricas
legítimas, preservando usuários, hashes, sessões e resultados.

Detalhes de seleção, checkpoint e cutscene em [JORNADA.md](JORNADA.md).
Preferências de coleção e descobertas cosméticas locais são separadas por
perfil; o identificador de origem acompanha a run para evitar transferência
de conquistas ao convidado ou a outra conta após login/logout.
