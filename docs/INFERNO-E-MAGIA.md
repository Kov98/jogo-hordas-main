# Inferno e magia

A terceira fase agora é o **Inferno — Fortaleza das Correntes**, na direção
escolhida pelo usuário: uma fortaleza demoníaca com correntes e fogo.

Muralhas escuras, obsidiana, pilares com chifres, monólitos acorrentados,
grades-fornalha, brasas e chamas animadas substituem a cripta azul. As onze
criaturas e os dois minibosses têm desenhos demoníacos próprios. O chefe
final é o **Arquidemônio das Cinzas**.

Os cinco reforços são Morcego da Fornalha, Lanceiro Acorrentado, Piromante
do Abismo, Golem da Fornalha e Ceifador das Cinzas. Veja a
[atualização do portal e da legião](portal-e-legiao/README.md).

Derrote o Cavaleiro no Castelo: a arena racha, a lava aparece e o personagem
cai. A tela escurece e a chegada ao Inferno acontece automaticamente,
mantendo armas, relíquias e passivas. O **Arquidemônio das Cinzas aparece
aos 15:00 do Inferno**; a câmera enquadra a arena para mostrar o chefe e o herói.

**Mini Tornado** ganhou funil sombreado, espirais animadas, vento no chão
e detritos orbitais. **Feixe de Luz** agora é uma coluna branca/dourada que
desce do céu sobre o alvo, com selo, halo, faíscas e impacto no chão.
O ponto fica fixo durante os pulsos; a luz não sai do personagem.

Os identificadores antigos da terceira fase continuam sendo lidos
internamente para preservar contas, resultados, desbloqueios e checkpoints.
O nome apresentado nos menus, no HUD, na coleção e no ranking é Inferno.

Para rodar: `python server.py`, depois <http://127.0.0.1:5501/>.
Se a página estava aberta, use **Ctrl+F5**. **C** abre a coleção no menu,
**G** mostra as receitas e **M** controla o áudio.

O [guia de campanha e relíquias](CATACUMBAS-E-SEGREDOS.md) continua válido.
Plano e capturas da conversão inicial ficam em `docs/inferno-fortaleza/`.
O fechamento do feixe celeste e da queda está na
[verificação integrada](feixe-e-queda/final-validation.md).
A [auditoria de 11/11/2026](auditoria-2026-11-11/README.md) registra as correções,
os testes mais recentes e as capturas atuais.
