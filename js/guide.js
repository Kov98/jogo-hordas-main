// Livro de receitas consultável antes e durante a partida; reutiliza a pausa do portal.
window.PowerGuide = {
  open() {
    const game = window.GAME?.scene.getScene('Game');
    const live = game?.gameReady && !game.ended && (game.scene.isActive() || game.scene.isPaused());
    const p = live ? game.player : null;
    const dialog = GamePortal.openDialog('Grimório da muralha');
    if (!dialog) return;
    dialog.panel.classList.add('portal-dialog-wide');
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
    dialog.body.append(el('p', 'portal-muted', 'Leve uma arma ao nível 8 e obtenha o atributo indicado. A partir dos 5 minutos, abra um baú para escolher uma evolução. Uniões transformam duas armas no máximo em uma e liberam um espaço. Os atributos são preservados.'));
    dialog.body.append(el('p', 'portal-muted', 'Dash: SHIFT ou ESPAÇO. Melhore até o nível 3, obtenha Passos Leves e use um baú para aprender o Passo de Fumaça. A imunidade dura apenas o dash.'));
    const list = el('div', 'guide-recipes');
    for (const recipe of PROGRESSION_RECIPES) {
      const card = el('article', 'guide-recipe');
      card.append(el('h3', '', recipe.name));
      const ingredients = recipe.kind === 'dash' ? ['Dash nível 3'] : recipe.ingredients.map(id => POWERS[id].name + ' nível 8');
      if (recipe.passive) ingredients.push(PASSIVES.find(d => d.id === recipe.passive)?.name || recipe.passive);
      card.append(el('p', 'guide-formula', ingredients.join(' + ')), el('p', '', recipe.desc));
      if (p) {
        const completed = game.progression.completed.has(recipe.id);
        const ready = game.progression.eligible(recipe);
        let status;
        if (completed) status = 'APRENDIDO';
        else if (ready) status = 'PRONTO — procure um baú';
        else {
          const needs = recipe.kind === 'dash' ? ['Dash ' + p.dashLevel + '/3'] : recipe.ingredients.map(id => POWERS[id].name + ' ' + (p.hasPower(id)?.level || 0) + '/8');
          if (recipe.passive) needs.push((PASSIVES.find(d => d.id === recipe.passive)?.name || recipe.passive) + ' ' + (p.passives[recipe.passive] || 0) + '/1');
          if (game.t < 300) needs.push('baús evoluem após 05:00');
          status = needs.join(' • ');
        }
        card.append(el('p', 'guide-status' + (completed || ready ? ' guide-ready' : ''), status));
      }
      list.append(card);
    }
    dialog.body.append(list);
    if (typeof RELICS !== 'undefined') {
      dialog.body.append(el('h3', '', 'Relíquias dos altares'));
      dialog.body.append(el('p', 'portal-muted', 'Até três relíquias por jornada. Altares custam 25% da vida máxima e podem causar uma emboscada. As contrapartidas acompanham você pelas três fases.'));
      const relicList=el('div','guide-recipes');
      for (const relic of Object.values(RELICS)) {
        const card=el('article','guide-recipe');
        card.append(el('h3','',relic.name),el('p','',relic.desc),el('p','guide-formula',relic.drawback));
        if(p) card.append(el('p',p.relics?.includes(relic.id)?'guide-status guide-ready':'guide-status',p.relics?.includes(relic.id)?'EQUIPADA':'ENCONTRE NOS ALTARES'));
        relicList.append(card);
      }
      dialog.body.append(relicList);
    }
    const close = el('button', 'portal-button', p ? 'Voltar ao jogo' : 'Fechar'); close.type = 'button'; close.onclick = dialog.close;
    dialog.footer.append(close);
    return dialog;
  },
};
