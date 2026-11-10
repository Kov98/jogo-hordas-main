// Permanent cosmetics and starting options. Campaign milestones come from the
// current profile; local discoveries/preferences never cross profile boundaries.
(() => {
  const cache = new Map(), prefix = 'muralha.meta.v1.';
  const SKINS = {
    default: { name:'Original', tint:null, requirement:'Sempre disponível' },
    cinders: { name:'Cinzas', tint:0xffb673, requirement:'Concluir a floresta' },
    storm: { name:'Tempestade', tint:0x8edbff, requirement:'Derrotar 1.000 inimigos' },
    royal: { name:'Real', tint:0xffdf80, requirement:'Concluir o castelo' },
    abyss: { name:'Abissal', tint:0xffaa79, requirement:'Concluir o Inferno' },
    oathbound: { name:'Juramentado', tint:0xd4a8ff, requirement:'Derrotar o guardião secreto' },
  };
  const ALTERNATIVES = { vanguard:'axes', ranger:'frost', mage:'radiant_beam', channeler:'cyclone' };
  const empty = () => ({skin:'default', starts:{}, altars:[], secrets:[], evolutions:[], runs:[], kills:0});
  const count = n => Number.isFinite(Number(n)) ? Math.max(0,Math.floor(Number(n))) : 0;
  const unique = value => Array.isArray(value) ? [...new Set(value.filter(x=>typeof x==='string' && x.length<=96))].slice(-256) : [];
  const key = () => GamePortal.user ? 'user.'+GamePortal.user.id : 'guest';
  function state(profileKey=key()) {
    if (!cache.has(profileKey)) {
      let raw; try { raw=JSON.parse(localStorage.getItem(prefix+profileKey)); } catch (_) {}
      const s=empty();
      if (raw && typeof raw==='object') {
        if (Object.hasOwn(SKINS,raw.skin)) s.skin=raw.skin;
        if (raw.starts && typeof raw.starts==='object') for(const id of Object.keys(CHARACTERS)) {
          if (raw.starts[id]===CHARACTERS[id].startPower || raw.starts[id]===ALTERNATIVES[id]) s.starts[id]=raw.starts[id];
        }
        for(const field of ['altars','secrets','evolutions','runs']) s[field]=unique(raw[field]);
        s.kills=count(raw.kills);
      }
      cache.set(profileKey,s);
    }
    return cache.get(profileKey);
  }
  function save(profileKey) {
    try { localStorage.setItem(prefix+profileKey,JSON.stringify(state(profileKey))); } catch (_) { /* Playable without storage. */ }
  }
  function unlocked(profileKey=key()) {
    const s=state(profileKey), current=profileKey===key();
    const progress=current ? GamePortal.getProgress() : {};
    const all=current && GamePortal.isAdmin;
    const forest=all || count(progress.forest_clears)>0;
    const castle=all || count(progress.castle_clears)>0;
    const abyss=all || count(progress.catacombs_clears)>0;
    const kills=profileKey==='guest' ? s.kills : current ? count(GamePortal.stats?.kills) : 0;
    const slayer=all || kills>=1000;
    const secret=all || s.secrets.includes('forest-oathkeeper');
    return { skins:['default',...(forest?['cinders']:[]),...(slayer?['storm']:[]),...(castle?['royal']:[]),...(abyss?['abyss']:[]),...(secret?['oathbound']:[])],
      starts:Object.fromEntries(Object.keys(CHARACTERS).map(id=>[id,[CHARACTERS[id].startPower,
        ...(({vanguard:forest,ranger:slayer,mage:castle,channeler:abyss})[id]?[ALTERNATIVES[id]]:[])]])),
      milestones:[
        {name:'Além das Raízes', description:'Conclua a floresta · Cinzas e Machados para Vanguarda',done:forest},
        {name:'Mil Almas', description:'Derrote 1.000 inimigos · Tempestade e Gelo para Sombra Verde',done:slayer},
        {name:'A Queda do Cavaleiro', description:'Conclua o castelo · Real e Feixe de Luz para Arcanista',done:castle},
        {name:'O Último Selo', description:'Conclua o Inferno · Abissal e Mini Tornado para Canalizador',done:abyss},
        {name:'Juramentado', description:'Derrote o guardião dos três símbolos · aparência Juramentado',done:secret},
        {name:'Peregrino', description:'Use três altares diferentes · '+s.altars.length+'/3',done:s.altars.length>=3},
        {name:'Mestre dos Elementos', description:'Descubra as quatro novas evoluções · '+s.evolutions.length+'/4',done:s.evolutions.length>=4},
      ] };
  }
  function loadout(char,profileKey=key()) {
    const def=CHARACTERS[char]; if(!def) return null;
    const s=state(profileKey), u=unlocked(profileKey);
    return {skin:u.skins.includes(s.skin)?s.skin:'default',startPower:u.starts[char].includes(s.starts[char])?s.starts[char]:def.startPower};
  }
  function choose(char,choice,profileKey=key()) {
    if(!Object.hasOwn(CHARACTERS,char) || !choice || typeof choice!=='object') return false;
    const s=state(profileKey), current=loadout(char,profileKey), u=unlocked(profileKey);
    const skin=choice.skin ?? current.skin, startPower=choice.startPower ?? current.startPower;
    if(!u.skins.includes(skin) || !u.starts[char].includes(startPower)) return false;
    s.skin=skin; s.starts[char]=startPower; save(profileKey); return true;
  }
  function record(event,profileKey=key()) {
    if(!event || typeof event!=='object' || typeof profileKey!=='string') return false;
    const field={altar:'altars',secret:'secrets',evolution:'evolutions',run:'runs'}[event.type];
    if(!field || typeof event.id!=='string' || !event.id || event.id.length>96) return false;
    const s=state(profileKey);
    if(s[field].includes(event.id)) return false;
    if(event.type==='secret' && event.id!=='forest-oathkeeper') return false;
    if(event.type==='evolution' && !['fire_hurricane','celestial_judgment','plasma_storm','meteor_cataclysm'].includes(event.id)) return false;
    s[field].push(event.id); s[field]=s[field].slice(-256);
    if(event.type==='run') s.kills+=Math.min(1000000,count(event.kills));
    save(profileKey); return true;
  }
  function apply(player,saved,profileKey=key()) {
    const selected=saved || loadout(player.def.id,profileKey);
    const skin=Object.hasOwn(SKINS,selected?.skin)?selected.skin:'default';
    const power=selected?.startPower;
    player.loadout={skin,startPower:Object.hasOwn(POWERS,power)?power:player.def.startPower};
    player.appearanceTint=SKINS[skin].tint;
    if(player.appearanceTint==null) player.sprite.clearTint(); else player.sprite.setTint(player.appearanceTint);
    return player.loadout;
  }
  function openCollection(options={}) {
    const dialog=GamePortal.openDialog('Coleção e desafios'); if(!dialog) return null;
    const profileKey=key(); let char=Object.hasOwn(CHARACTERS,options.char)?options.char:'vanguard';
    const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n;};
    const render=()=>{
      if(key()!==profileKey) { dialog.close(); return; }
      const u=unlocked(profileKey), selected=loadout(char,profileKey);
      dialog.body.replaceChildren();
      dialog.body.append(el('p','portal-muted','Aparências e poderes iniciais são escolhas para a próxima partida. Relíquias e melhorias continuam sendo conquistadas durante a jornada.'));
      const heroLabel=el('label','portal-field'); heroLabel.append(el('span','','Herói'));
      const hero=el('select'); hero.setAttribute('aria-label','Herói'); for(const [id,def] of Object.entries(CHARACTERS)) {const o=el('option','',def.name);o.value=id;hero.append(o);} hero.value=char;
      hero.onchange=()=>{char=hero.value;render();}; heroLabel.append(hero);dialog.body.append(heroLabel);
      const powerLabel=el('label','portal-field');powerLabel.append(el('span','','Poder inicial'));
      const power=el('select'); power.setAttribute('aria-label','Poder inicial');
      const choices=[CHARACTERS[char].startPower,ALTERNATIVES[char]];
      for(const id of choices) {const o=el('option','',(POWERS[id]?.name||id)+(u.starts[char].includes(id)?'':' · bloqueado'));o.value=id;o.disabled=!u.starts[char].includes(id);power.append(o);}
      power.value=selected.startPower;power.onchange=()=>{choose(char,{startPower:power.value},profileKey);options.onChange?.();};powerLabel.append(power);dialog.body.append(powerLabel);
      const skinLabel=el('label','portal-field');skinLabel.append(el('span','','Aparência'));
      const skin=el('select');skin.setAttribute('aria-label','Aparência');for(const [id,def] of Object.entries(SKINS)){const o=el('option','',def.name+(u.skins.includes(id)?'':' · '+def.requirement));o.value=id;o.disabled=!u.skins.includes(id);skin.append(o);}
      skin.value=selected.skin;skin.onchange=()=>{choose(char,{skin:skin.value},profileKey);options.onChange?.();};skinLabel.append(skin);dialog.body.append(skinLabel);
      const list=el('div','guide-recipes');
      for(const milestone of u.milestones){const card=el('article','guide-recipe');card.append(el('h3','',(milestone.done?'✓ ':'')+milestone.name),el('p','',milestone.description),el('p',milestone.done?'guide-status guide-ready':'guide-status',milestone.done?'CONCLUÍDO':'EM PROGRESSO'));list.append(card);}
      dialog.body.append(list);
    };
    const close=el('button','portal-button','Voltar');close.type='button';close.onclick=dialog.close;dialog.footer.append(close);
    const session=()=>{if(key()!==profileKey) dialog.close();else render();};
    window.addEventListener?.('muralha-session',session);
    const originalClose=dialog.close;
    let observer;
    const cleanup=()=>{window.removeEventListener?.('muralha-session',session);observer?.disconnect();};
    if(typeof MutationObserver!=='undefined') {
      observer=new MutationObserver(()=>{if(!dialog.panel.isConnected) cleanup();});
      observer.observe(document.body,{childList:true,subtree:true});
    }
    dialog.close=()=>{cleanup();originalClose();};
    close.onclick=dialog.close;render();return dialog;
  }
  window.MetaProgress={SKINS,ALTERNATIVES,profileKey:key,unlocked,loadout,choose,record,apply,openCollection,
    snapshot:(profileKey=key())=>JSON.parse(JSON.stringify(state(profileKey)))};
})();
