// O primeiro coração da campanha: uma criatura de madeira, fungos e raízes.
const FOREST_BOSS = {
  name:'Coração de Raízes', hp:5000, speed:79, radius:52, contactDmg:17, furyAt:.38,
  texture:'forest_boss', anim:'forest_boss_walk', auraTexture:'forest_boss_glow',
  introColor:0xa8bb7b, chargeColor:0xc4c995, recoverColor:0x9fb87a,
  furyColor:0xc5d693, furyTint:0xd8e7bd, deathColor:0xb3c28c, deathTint:0x7e995c,
  particle:'bone', furyParticle:'bone', furyMessage:'O Coração de Raízes rompe a terra em FÚRIA!',
  slash:{range:185,windup:.95,dmg:24,half:.65,reach:250,rootRadius:42,rootCount:3},
  charge:{windup:1.1,dur:.62,speed:610,dmg:28,recover:1.05},
  wave:{windup:.9,dmg:17,speed:195,count:7,spread:.28,fury:11},
  blast:{windup:1.25,dmg:26,radius:64,count:5,fury:8},
};

class ForestBoss extends Boss {
  constructor(scene, x, y) {
    super(scene, x, y, FOREST_BOSS);
    this.aura.setScale(3.5);
  }

  // Raízes em sequência substituem o golpe de espada; cada área é telegrafada.
  startSlash(chain) {
    const sc=this.scene, p=sc.player, D=this.data.slash;
    this.ang=Math.atan2(p.y-this.y,p.x-this.x);
    const windup=Math.max(.6,D.windup*(chain ? .65 : 1)*(this.fury ? .85 : 1));
    if(!chain) this.combo=this.fury?1:0; else this.combo--;
    this.go('slash_wind',windup); this.setPose(2);
    for(let i=0;i<D.rootCount;i++) {
      const reach=80+i*(D.reach-80)/(D.rootCount-1), side=(i%2?1:-1)*12;
      const x=this.x+Math.cos(this.ang)*reach-Math.sin(this.ang)*side;
      const y=this.y+Math.sin(this.ang)*reach+Math.cos(this.ang)*side;
      sc.addHazard({shape:'circle',x,y,r:D.rootRadius,delay:windup+i*.14,dmg:D.dmg*this.damageMul,col:0xc3bd87,kind:'bone'});
    }
    sc.fx.ring(this.x,this.y,12,75,.4,0xa3b778,3,.2);
    Sfx.play('warn');
  }

  slashStrike() {
    this.setPose(3); this.go('slash_hit',.35);
    this.scene.fx.burst('bone',this.x+Math.cos(this.ang)*75,this.y+Math.sin(this.ang)*75,12);
    this.scene.cameras.main.shake(130,.005);
    Sfx.play('boom');
  }

  // Esporos lentos e arredondados: usam o pool existente de 140 projéteis.
  startWave() {
    this.go('wave_wind',this.data.wave.windup*(this.fury ? .85 : 1)); this.setPose(2);
    this.scene.fx.ring(this.x,this.y,15,105,.65,0xc3d392,4,.2);
    this.scene.fx.burst('bone',this.x,this.y-15,8);
    Sfx.play('warn');
  }

  fireWave() {
    const sc=this.scene, D=this.data.wave;
    const base=Math.atan2(sc.player.y-this.y,sc.player.x-this.x), count=this.fury?D.fury:D.count;
    const volley=offset=>{
      for(let i=0;i<count;i++) {
        const ang=base+(i-(count-1)/2)*D.spread+offset;
        sc.enemyShots.fire('magic',this.x+Math.cos(ang)*45,this.y-9+Math.sin(ang)*35,ang,1,{
          tex:'forest_spore',speed:D.speed*sc.difficulty.projectileMul,dmg:D.dmg*this.damageMul,
          radius:8,life:4.2,rot:false,scale:1,slow:.45,
        });
      }
    };
    volley(0); this.rest(.85,3);
    sc.fx.ring(this.x,this.y,20,125,.35,0xb8cc82,3,.2);
    Sfx.play('boom');
    if(this.fury) sc.time.delayedCall(420,()=>{
      if(this.alive && !sc.ended) { volley(D.spread/2); Sfx.play('boom'); }
    });
  }

  // Uma marca central e um anel aberto de espinhos; as saídas continuam visíveis.
  startBlast() {
    const sc=this.scene, p=sc.player, D=this.data.blast, A=CONFIG.arena;
    const count=this.fury?D.fury:D.count, ring=this.fury?185:160;
    this.go('blast_wind',D.windup+(count-1)*.13); this.setPose(2);
    const facing=Math.atan2(p.y-this.y,p.x-this.x);
    for(let i=0;i<count;i++) {
      const ang=facing+(i-1)/(count-1)*Math.PI*2;
      let x=p.x+(i?Math.cos(ang)*ring:0), y=p.y+(i?Math.sin(ang)*ring:0);
      const dist=Math.hypot(x-A.x,y-A.y), limit=A.r-D.radius;
      if(dist>limit) { x=A.x+(x-A.x)/dist*limit; y=A.y+(y-A.y)/dist*limit; }
      sc.addHazard({shape:'circle',x,y,r:D.radius,delay:D.windup+i*.13,dmg:D.dmg*this.damageMul,col:0xa8ba79,kind:'bone'});
    }
    sc.fx.ring(this.x,this.y,15,135,.7,0xb4c18c,4,.2);
    Sfx.play('warn');
  }
}

function drawForestBoss(P, frame) {
  const step=[0,1,0,-1][frame], bob=frame%2;
  const ink='#17272a', dark='#3f493c', bark='#746b4d', ridge='#b3a77c', pale='#d1c69b', moss='#78875d';
  P.shadow(24,44,44);
  // Raízes traseiras sustentam uma massa baixa e irregular, sem armadura humana.
  for(const [x,off] of [[15,step],[31,-step]]) {
    P.line(x,29,x-3+off,40,ink,7); P.line(x,30,x-3+off,40,bark,4);
    P.line(x-3+off,40,x-9+off,44,ink,4); P.line(x-3+off,40,x-9+off,43,ridge,2);
    P.line(x-3+off,40,x+1+off,44,ink,3); P.line(x-3+off,40,x+1+off,43,ridge);
  }
  // Costas de madeira e casca rachada.
  P.disc(24,26+bob,14,ink); P.disc(23,24+bob,12,bark); P.disc(26,26+bob,10,dark);
  P.r(14,19+bob,5,13,bark); P.line(16,17+bob,16,30+bob,ridge,2);
  P.line(20,15+bob,19,22+bob,ridge,2); P.line(19,22+bob,22,26+bob,'#373e33',2);
  P.line(30,19+bob,31,25+bob,'#92916a',2); P.line(31,25+bob,28,33+bob,'#262f2a',2);
  P.line(14,30+bob,21,34+bob,ridge); P.line(29,32+bob,35,29+bob,ridge);
  // Antebraços grossos, dedos bifurcados e garras de madeira nas duas extremidades.
  P.line(14,23+bob,7,29+step,ink,8); P.line(7,29+step,4,38+step,ink,6);
  P.line(14,23+bob,7,29+step,bark,5); P.line(7,29+step,4,37+step,ridge,3);
  P.line(4,37+step,1,42+step,ink,3); P.line(4,37+step,7,42+step,ink,3); P.line(4,38+step,1,42+step,pale); P.line(4,38+step,7,42+step,pale);
  P.line(33,21+bob,40,28-step,ink,8); P.line(40,28-step,42,36-step,ink,6);
  P.line(33,21+bob,40,28-step,bark,5); P.line(40,28-step,42,36-step,ridge,3);
  P.line(42,36-step,39,42-step,ink,3); P.line(42,36-step,46,41-step,ink,3); P.line(42,37-step,39,42-step,pale); P.line(42,37-step,46,41-step,pale);
  // Coração oco atravessado por uma seiva pálida.
  P.disc(24,28+bob,6,ink); P.disc(24,28+bob,4,'#455e49'); P.r(23,24+bob,3,8,'#91a573');
  P.line(23,25+bob,26,28+bob,'#d9dfab',2); P.line(26,28+bob,23,31+bob,'#c4d099'); P.p(22,28+bob,'#d9dfab');
  // Cabeça torta, olhos fendidos e uma boca de lascas: a própria árvore é a fera.
  P.r(16,11+bob,15,14,ink); P.r(17,11+bob,12,12,bark); P.r(18,11+bob,3,10,ridge);
  P.line(18,12+bob,21,10+bob,pale,2); P.r(19,16+bob,4,2,'#24332b'); P.r(26,15+bob,4,2,'#24332b');
  P.r(20,16+bob,3,1,'#dce3a9'); P.r(27,15+bob,2,1,'#dce3a9');
  P.r(21,20+bob,9,5,ink); P.r(22,21+bob,7,3,'#343e30');
  for(const x of [21,24,28]) P.line(x,20+bob,x+1,22+bob,pale); P.p(25,24+bob,ridge); P.p(28,23+bob,ridge);
  // Galhada irregular, vegetação e fungos presos na casca.
  for(const [x,y,ex,ey] of [[18,13,12,5],[14,8,8,6],[14,8,15,2],[27,12,32,4],[31,6,38,4],[32,4,31,0]]) {
    P.line(x,y+bob,ex,ey,ink,3); P.line(x,y+bob,ex,ey,ridge);
  }
  P.line(21,12,22,4,ink,3); P.line(21,12,22,4,bark); P.line(22,6,26,3,ridge);
  for(const [x,y,w] of [[11,17,8],[28,12,7],[30,18,8],[9,26,6],[33,28,6]]) {
    P.r(x,y+bob,w,3,'#4e6249'); P.r(x+1,y+bob,w-2,1,'#9aab78'); P.r(x+2,y+3+bob,2,2,moss);
  }
  for(const [x,y] of [[12,20],[17,14],[28,18],[35,22],[10,32],[34,32]]) {P.p(x,y+bob,pale);P.p(x+1,y+1+bob,dark);}
  P.line(18,33+bob,17,39,'#75805a'); P.line(30,33+bob,32,38,'#75805a'); P.p(17,40,'#9da579');
}

function drawForestBossAssets(scene) {
  SPR.make(scene,'forest_boss',48,48,4,3,drawForestBoss);
  SPR.make(scene,'forest_spore',10,10,1,2,P=>{
    P.disc(5,5,4,'#344b38'); P.disc(5,4,3,'#91a66c'); P.disc(4,3,2,'#c3d190');
    P.p(3,2,'#eef0bc'); P.p(7,5,'#d8e4a3'); P.p(4,7,'#b0c77c'); P.p(1,4,'#697f53');
  });
  SPR.canvas(scene,'forest_boss_glow',128,128,(g,w,h)=>{
    const gradient=g.createRadialGradient(w/2,h/2,3,w/2,h/2,w/2);
    gradient.addColorStop(0,'rgba(181,203,120,.48)'); gradient.addColorStop(.45,'rgba(126,160,94,.2)'); gradient.addColorStop(1,'rgba(79,119,80,0)');
    g.fillStyle=gradient; g.fillRect(0,0,w,h);
  });
  if(!scene.anims.exists('forest_boss_walk')) scene.anims.create({
    key:'forest_boss_walk',frames:[0,1,2,3].map(frame=>({key:'forest_boss',frame})),frameRate:4,repeat:-1,
  });
}
