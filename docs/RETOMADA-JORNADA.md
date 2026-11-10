# Retomada — fases, progresso e cutscene

Último ajuste visual: miniaturas detalhadas e porta embutida na parede sul;
ver [VISUAL-FASES.md](VISUAL-FASES.md). Base desse ajuste: e194cbf.

Base `1bed7c2`, trabalho em `main`, projeto em
`/home/escola/Downloads/jogo-hordas`. Pedido integral e contratos estão em
`docs/superpowers/specs/2026-11-06-fases-progresso-finale-design.md`;
experiência e recuperação em [JORNADA.md](JORNADA.md).

Implementação: seleção de fase entre herói/dificuldade; Castelo bloqueado
por perfil; Em breve sem fase; fachada física e entrada interna; retry da
fase atual com nova run e build de entrada; perfil/estatísticas por conta;
cutscene de rachaduras/lava/queda antes de End. Sem dependências novas.

Migração de produção aplicada; hashes e partidas preexistentes preservados.
Servidor normal em `http://127.0.0.1:5501/`. Snapshot anterior:
`snapshot/pre-fases-cutscene-20261106-100233`; backup privado separado.

Revisão independente concluída. Achados de resposta de sessão atrasada,
atalho cobrindo cutscene e duração com FPS baixo foram reproduzidos e
corrigidos. Evidências em [revisao-jornada/review.md](revisao-jornada/review.md)
e relatórios das três tarefas no mesmo diretório.

Verificação concluída: API 29/29; selector 6 grupos; geometria Chrome
5 grupos; regressões de revisão 4/4. As cinco suítes finais passaram:
jornada 6, floresta 9, expansão 12, controles 8 e contas/admin 7 grupos,
zero erros JavaScript. Nenhuma pendência bloqueadora. Consultar `git log`
e o plano antes de repetir qualquer trabalho. Capturas em `/tmp/muralha-jornada/`.
