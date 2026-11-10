# Fases, progresso por conta e desfecho

O usuário solicitou uma entrada física do castelo, seleção de fases entre
herói/dificuldade, desbloqueios e estatísticas persistidos por conta, reinício
na fase atual e uma cutscene do piso ritual desabando no fogo ao vencer.
A execução autônoma e commits na main continuam autorizados.

## Contratos

- Fluxo normal: Intro/Menu → Select → StageSelect → Difficulty → Game.
- Floresta sempre disponível; Castelo exige passagem válida da floresta;
  Em breve é uma terceira apresentação desabilitada, sem fase implementada.
- Progresso autenticado pertence ao usuário no SQLite, não ao navegador.
  Sessão/login/registro e avanço/final retornam `progress` e `stats`.
- `progress`: `{castle_unlocked:boolean,forest_clears:number,castle_clears:number}`.
  `stats`: `{runs,victories,kills,damage,points,best_points}` de resultados do ranking.
- Avanço válido não-prática libera castelo uma vez por run; vitória válida
  não-prática no castelo registra conclusão uma vez. Prática/admin não
  alteram progresso de jogador. Migrar registros anteriores sem apagar contas.
- Servidor recusa início no castelo bloqueado (admin tem acesso às fases).
  Ausência de stage passa a significar forest; registros antigos mantêm castle.
- Portal expõe `getProgress()`, `canPlayStage(id)`, `recordGuestAdvance()` e
  `recordGuestVictory()`. Guest salva progresso separado no navegador.
  Avanço/final atualizam perfil; troca de conta não mistura dados.
- `ForestWorld.gate` permanece `{x:2000,y:500}`. Nova fachada ocupa o limite
  norte com colisão contínua; só a porta aberta permite alcançar o limiar.
  `isAtCastleDoor(entity)` valida estar diante/dentro da abertura.
- `World.entry` no castelo: `{x,startY,endY}`, na entrada sul, sem obstáculos;
  a chegada move o jogador da porta para dentro, sem combate/tempo creditado.
- Morte: retry usa fase atual e equipamentos do início dessa fase, sem reutilizar
  runId/estatísticas antigas. Vitória pode reiniciar a campanha original.
- Derrotar o chefe do castelo inicia cutscene única: tremores, rachaduras no
  círculo ritual, abertura de lava, queda do herói e fade. Só depois aparece End.
  Congelar combate/tempo/pontos e salvar vitória uma única vez no início.

Manter sprites proporcionais, estética sombria sem Halloween, quatro
dificuldades, minis 300/600, chefe 900, controles e o ranking existentes.
Decisão: estender cenas/SQLite/pixel art atuais; não introduzir engine,
biblioteca, fase jogável extra nem serviços externos.
