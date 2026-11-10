# Contas, ranking e administração — implementação

Objetivo autorizado: login/cadastro opcional com usuário e senha; nome de 3 a 20 caracteres; visitante continua jogando. Ranking de melhores partidas por pontos, abates e dano efetivo. Uma conta admin inicial, moderação de contas e ferramentas da partida. O projeto atual é Phaser/JS estático; acrescentar Python 3 + SQLite sem dependências, servidor local na porta 5501. Hospedagem pública é uma etapa posterior.

## Contrato

API retorna JSON; erros `{error:"mensagem"}` com status adequado. Cookie HttpOnly de sessão; servidor checa role e banimento em cada chamada autenticada. POST autenticado exige `X-CSRF-Token`; `/api/session` retorna token CSRF. CORS com credentials somente origens locais autorizadas. Senhas PBKDF2-SHA256 600000 iterações, salts aleatórios; sessão aleatória armazenada por hash. Rate limit e requisições limitadas. Banco e credencial inicial em `${XDG_DATA_HOME:-~/.local/share}/a-ultima-muralha/` (fora da raiz estática e do Git).

- GET `/api/session`: `{user:null|{id,username,role},csrf:null|string,settings:{healthDropChance,bossTime,spawnBaseRate,spawnGrowth,maxEnemies}}`.
- POST `/api/register`, `/api/login` `{username,password}`: mesma resposta da sessão.
- POST `/api/logout`: `{ok:true}`.
- POST `/api/password` `{currentPassword,newPassword}`: `{ok:true}`.
- GET `/api/leaderboard?sort=points|kills|damage`: `{entries:[{rank,username,points,kills,damage,duration,hero,victory}]}` (top 50, melhor partida por conta, exclui admin/banidos).
- POST `/api/runs/start` `{hero,practice}`: `{run_id,ranked,settings}` com regras efetivamente usadas para a partida. Admin sempre fora do ranking.
- POST `/api/runs/finish` `{run_id,kills,damage,duration,hero,level,victory}`: `{saved,ranked,points}`. Autoriza dono, impede replay, valida números e tempo. Pontos calculados no servidor: `kills*100+floor(damage)*2+floor(duration)*10+(victory?5000:0)`.
- GET `/api/admin/users?search=`: `{users:[{id,username,role,banned,created_at}]}`.
- POST `/api/admin/ban` `{user_id,banned,reason}`: `{ok:true}`. Proíbe banir admin; revoga sessões do banido.
- POST `/api/admin/command` `{command,args}`: `{command,args}` validados; registra auditoria. Comandos: `stats` (hp,maxHp até 1000000; speed 10..1500; damage .1..100; rate .1..20; area/range .1..10), `spawn` (enemy ID de ENEMIES,count 1..240), `power` (id de POWERS,level 1..8), `level` (level 1..100), `xp` (amount 0..100000), `teleport` (x,y 150..3850), `god`/`spawning` (enabled bool), `heal`/`boss`/`clear`/`maxpowers`/`killboss` (sem args).
- POST `/api/admin/settings` `{healthDropChance,bossTime,spawnBaseRate,spawnGrowth,maxEnemies}`: `{settings:...}`; aplica a próximas partidas. Limites: chance0..1, boss10..3600, base0..20, growth0...1,max1..240.

Frontend `GamePortal` singleton: `.ready` Promise de init, `.user`, `.csrf`, `.settings`, `.isAdmin` getter; `.request(path,{method,body})` aceita caminho iniciado por `/api/`, cuida de cookie/CSRF/JSON/erros. `.offerLogin()` uma vez, modal opcional; `.openLogin()`, `.openLeaderboard()`, `.notice(text)`, `.beginRun(hero,practice)` -> `{run_id,ranked}`, `.finishRun(payload)`, `.openDialog(title)` -> `{body,footer,close}`; `.onSessionChange` via evento window `muralha-session`. `.openDialog` pausa e bloqueia input Phaser durante modal e restaura só o que pausou. `.ready` nunca impede visitante se backend indisponível. No Live Server localhost5500 API tenta5501, no servidor5501 usa mesma origem. Barra de conta/menu, botão ranking, admin visível só para admin; F2 abre `GameAdmin.open()` se existir.

## Tarefas e limites de edição

1. Backend: `server.py`, `INICIAR-JOGO.sh`, `.gitignore`, documentação de execução/credencial. Sem editar JS.
2. Portal: `js/portal.js`, `portal.css`. Sem editar index/cenas/jogo. Account UI, ranking, login e troca senha; chamada admin via GameAdmin.
3. Integração (agente principal): `js/admin.js`, index, cenas/intro/jogo/UI. Conta dano efetivo, pontos, envio de partidas, painel atual/global/moderação, hooks de login.
4. Revisão integrada e testes: autenticação/limites/banimento/negação de privilégio/replay/ranking; navegador visitante/login/admin/score/pausa; servidor vivo e instruções claras.

Limite prático: jogo executa simulação no cliente; validações de estatísticas não são um sistema antifraude completo. Conta admin e partidas com parâmetros de teste/privilégios não competem. Nenhuma credencial no JS ou no conteúdo estático. Sem publicação externa, sem serviços pagos.
