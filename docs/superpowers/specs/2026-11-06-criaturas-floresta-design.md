# Mais criaturas na primeira fase

Pedido: aumentar a variedade de inimigos da floresta. O usuário delegou as
decisões de execução e autorizou trabalho/commits na main anteriormente.

Escolha de implementação: quatro criaturas adicionais, aproveitando o pool,
ataques e iluminação existentes em Phaser 3, com pixel art procedural própria
de quatro quadros. A floresta passa de oito para doze inimigos comuns.

- Javali Musgoso (`forest_boar`): resistente, investida anunciada; libera aos 70 s.
- Serpente do Lodo (`forest_snake`): mantém distância e cospe veneno com lentidão;
  libera aos 115 s. O veneno usa o dano/lentidão já existentes, sem dano contínuo.
- Corvo das Ruínas (`forest_raven`): voo ondulado, leque de três penas; libera aos 35 s.
- Sentinela de Espinhos (`forest_sentinel`): lenta, golpe amplo anunciado; libera aos 280 s.

Alternativas consideradas: apenas recolorir criaturas daria pouca variedade;
novos sistemas de IA exigiriam alterar o combate compartilhado. Usar ataques
existentes com silhuetas e combinações próprias entrega a variedade pedida.

Restrições: manter a noite macabra sem tema Halloween, sprites menores que
árvores, pools limitados, minis aos 5/10 min e chefe aos 15 min. As criaturas
novas entram somente no diretor da floresta, além da ferramenta administrativa
de spawn. Castelo, progressão e passagem entre fases mantêm seu funcionamento.
