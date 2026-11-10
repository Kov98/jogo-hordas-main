// Os encontros usam os mesmos pools de sprites, tiros e perigos das hordas.
Object.assign(ENEMIES, {
  storm_caller: { name:'Arauto da Tempestade', kind:'caster', hp:48, speed:48, dmg:8, radius:14, xp:7, from:90, weight:3, maxAlive:9, keep:290, shell:{range:540,radius:48,delay:1.1,dmg:17,cd:3.8}, storm:true },
  poisoner: { name:'Alquimista Pestilento', kind:'caster', hp:38, speed:57, dmg:7, radius:13, xp:6, from:65, weight:3, maxAlive:10, keep:220, shell:{range:360,radius:68,delay:1.7,dmg:15,cd:4.1}, poison:true },
  frost_wraith: { name:'Espectro da Geada', kind:'ranged', hp:32, speed:67, dmg:7, radius:13, xp:6, from:125, weight:3, ghost:true, keep:260, shot:{type:'magic',cd:2.9,range:480,count:3,spread:.22,slow:1.5,tint:0x8be5ff,speed:175} },
  hell_charger: { name:'Carrasco Infernal', kind:'melee', hp:75, speed:84, dmg:16, radius:16, xp:9, from:155, weight:3, charge:{range:390,min:95,windup:.7,dur:.55,mul:4,cd:4,recover:.8} },
  storm_warden: { name:'Guardião da Tempestade', kind:'caster', hp:1700, speed:52, dmg:23, radius:29, xp:0, from:Infinity, weight:0, keep:240, storm:true, shell:{range:850,radius:65,delay:1.05,dmg:24,cd:2.6}, shot:{type:'magic',cd:2.6,range:650,count:5,spread:.23} },
  crypt_lord: { name:'Senhor da Cripta', kind:'melee', hp:3900, speed:65, dmg:30, radius:32, xp:0, from:Infinity, weight:0, spiral:true, charge:{range:700,min:120,windup:1,dur:.7,mul:4.2,cd:5,recover:1} },
});
const encounterArt = (body, eye, weapon, large) => ({w:16,h:16,k:large?5:3,fn:humanoid,o:{head:'hood',hood:body,body,arm:body,robe:true,eye,weapon,orb:eye,trim:eye,shoulder:large?'#76758d':undefined}});
Object.assign(ENEMY_ART, {
  storm_caller:encounterArt('#343b73','#b7eeff','staff'),
  poisoner:encounterArt('#354b29','#c0f269','orbhand'),
  frost_wraith:encounterArt('#587b99','#c6fcff','staff'),
  hell_charger:encounterArt('#632731','#ffb459','axe'),
  storm_warden:encounterArt('#333258','#b8eeff','staff',true),
  crypt_lord:encounterArt('#3b294c','#d6a7ff','scythe',true),
});

class EncounterDirector {
  constructor(scene) { this.scene=scene; this.spawned=[false,false]; this.minis=[]; }
  get active() { return [...new Set(this.minis)].filter(e=>e.alive && e.isMiniBoss); }
  update(dt) {
    const sc=this.scene;
    if(sc.ended || sc.bossStarted || sc.spawningEnabled===false) return;
    for(let i=0;i<2;i++) {
      if(this.spawned[i] || sc.t<(i+1)*300) continue;
      const miniIds=sc.stage?.minis || ['storm_warden','crypt_lord'];
      const pt=sc.enemies.spawnPoint(520,650,miniIds[i]);
      if(!pt) continue;
      // Small custom pools give due encounters precedence over ordinary enemies.
      // A living miniboss is never displaced: the next encounter retries after its death.
      if(sc.enemies.alive >= sc.enemies.pool.length) {
        const ordinary=sc.enemies.pool.find(e=>e.alive && !e.isMiniBoss && !e.isBoss);
        if(ordinary) sc.enemies.kill(ordinary,true);
      }
      const e=sc.enemies.spawn(miniIds[i],pt.x,pt.y,sc.enemies.hpMul(sc.t),false,true);
      if(!e) continue; // Tenta novamente no próximo quadro se o pool estiver cheio.
      e.isMiniBoss=true; e.miniIndex=i+1; e.miniRewarded=false;
      this.spawned[i]=true; this.minis.push(e);
      sc.announce(e.def ? e.def.name : (i===0?'Guardião da Tempestade':'Senhor da Cripta'),0xd6a7ff);
    }
  }
  onKill(e) {
    if(!e.isMiniBoss || e.miniRewarded) return;
    e.miniRewarded=true;
    const sc=this.scene;
    sc.player.gainXp((e.miniIndex===1?250:600)*sc.difficulty.xpMul);
    sc.progression?.dropChest(e.x,e.y,true);
    sc.fx.ring(e.x,e.y,15,120,.6,0xffd66a,4,.3);
    sc.announce('Mini-chefe derrotado! Tesouro e experiência!',0xffd66a);
  }
}
