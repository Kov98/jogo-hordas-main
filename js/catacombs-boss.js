const CATACOMB_BOSS = {
  name:'Arquidemônio das Cinzas',hp:10800,speed:65,radius:46,contactDmg:22,furyAt:.4,
  texture:'crypt_necromancer',anim:'crypt_necromancer_walk',auraTexture:'crypt_glow',
  introColor:0xff8f3d,furyColor:0xffc268,furyTint:0xffddb2,deathColor:0xff9a48,deathTint:0xa84229,
  recoverColor:0xffcd83,particle:'fire',furyParticle:'fire',furyMessage:'O Arquidemônio abre a Grande Fornalha!',
  slash:{windup:1.05,dmg:27,half:.8,reach:240},
  charge:{windup:1.3,dur:.5,speed:540,dmg:30,recover:1.3},
  wave:{windup:1.1,dmg:21,speed:180,count:12,fury:18,spread:.3},
  blast:{windup:1.45,dmg:29,radius:64,count:4,fury:6},
};
class NecromancerBoss extends Boss {
  constructor(scene,x,y){super(scene,x,y,CATACOMB_BOSS);this.soulCycle=0;this.souls=[];this.aura.setScale(4.5);}
  chooseAttack(dist) {
    this.soulCycle++;
    if(this.soulCycle%3===0){this.startSummon();return;}
    if(this.soulCycle%2===0)this.startBlast();else this.startWave();
  }
  startSlash(){this.startBlast();}
  startWave(){this.go('wave_wind',this.data.wave.windup);this.setPose(2);this.scene.fx.ring(this.x,this.y,20,140,1,0xffad54,4,.3);Sfx.play('warn');}
  fireWave(){
    const sc=this.scene,D=this.data.wave,n=this.fury?D.fury:D.count,aim=Math.atan2(sc.player.y-this.y,sc.player.x-this.x);
    // One full ring with wide, legible gaps, using the global projectile pool.
    for(let i=0;i<n;i++){const a=aim+(i+.5)*Math.PI*2/n;sc.enemyShots.fire('magic',this.x+Math.cos(a)*50,this.y+Math.sin(a)*50,a,1,{tex:'crypt_soul',tint:0xffdf9b,speed:D.speed*sc.difficulty.projectileMul,dmg:D.dmg*this.damageMul,radius:9,life:5,rot:false,slow:.35});}
    this.rest(this.fury?.65:1,3);Sfx.play('boom');
  }
  startBlast(){
    const sc=this.scene,p=sc.player,D=this.data.blast,A=CONFIG.arena,n=this.fury?D.fury:D.count;
    this.go('blast_wind',D.windup+(n-1)*.17);this.setPose(2);
    const mark=(x,y,delay)=>{const dx=x-A.x,dy=y-A.y,d=Math.hypot(dx,dy),lim=A.r-D.radius-20;if(d>lim){x=A.x+dx/d*lim;y=A.y+dy/d*lim;}sc.addHazard({shape:'circle',x,y,r:D.radius,delay,dmg:D.dmg*this.damageMul,col:0xffa44d,kind:'fire'});};
    mark(p.x,p.y,D.windup);for(let i=1;i<n;i++){const a=i*Math.PI*2/(n-1)+this.age*.3;mark(p.x+Math.cos(a)*185,p.y+Math.sin(a)*185,D.windup+i*.17);}
    sc.fx.ring(this.x,this.y,20,120,.8,0xff8f3c,3,.3);Sfx.play('warn');
  }
  startSummon(){this.go('summon_wind',1.5);this.setPose(2);this.scene.fx.ring(this.x,this.y,30,200,1.5,0xffc577,4,.2);Sfx.play('warn');}
  summonSouls(){
    const sc=this.scene;this.souls=this.souls.filter(item=>item.enemy.alive&&item.enemy.uid===item.uid);
    const capacity=Math.min(6-this.souls.length,6-sc.enemies.summoned);
    for(let i=0;i<Math.min(this.fury?3:2,capacity);i++){
      const a=this.age+i*Math.PI*2/3;const e=sc.enemies.spawn('crypt_ghost',this.x+Math.cos(a)*130,this.y+Math.sin(a)*130,1.25,true);
      if(e){this.souls.push({enemy:e,uid:e.uid});sc.fx.burst('fire',e.x,e.y,10);}
    }
  }
  update(dt){
    if(!this.alive||this.scene.cinematic||this.scene.ended)return;
    if(this.state==='summon_wind'){
      this.stateT-=dt;this.age+=dt;this.flash-=dt;this.sprite.setPosition(this.x,this.y).setDepth(this.y);
      if(this.flash>0)this.sprite.setTintFill(0xffffff);else this.sprite.clearTint();
      if(this.stateT<=0){this.summonSouls();this.rest(1.2,3);}return;
    }
    super.update(dt);
  }
  die(){
    if(!this.alive)return;
    for(const item of this.souls)if(item.enemy.alive&&item.enemy.uid===item.uid)this.scene.enemies.kill(item.enemy,true);
    this.souls=[];super.die();
  }
}
function drawNecromancer(P,frame){
  const b=frame%2,step=[0,1,0,-1][frame%4],raised=frame===2?3:0;
  const ink='#150d1b',iron='#302a38',edge='#74616b',lit='#a28a80',skin='#973b36';
  const fire='#ff6d2e',gold='#ffc868',hot='#fff0bb',horn='#c6a18a';
  const flame=(x,y,h)=>{
    P.line(x,y+h,x-2,y+3,fire,3);P.line(x,y+h,x+3,y+1,fire,2);
    P.line(x,y+h,x,y+4,gold,2);P.r(x,y+h-2,2,3,hot);
  };
  const link=(x,y)=>{P.r(x,y,4,4,ink);P.r(x+1,y,2,1,lit);P.r(x,y+1,1,2,edge);P.r(x+3,y+1,1,2,lit);P.r(x+1,y+3,2,1,edge);};
  P.shadow(24,45,42);
  // Short, ragged bat wings keep the broad, horned silhouette clear of the body.
  for(const s of [-1,1]){
    const root=24+s*10,tip=24+s*21;
    P.line(root,22+b,tip,12+b,ink,3);P.line(tip,12+b,tip+s,29-b,ink,2);
    for(let y=17;y<29;y++)P.line(root,22+b,tip-s,y, y<23?'#602735':'#3c2331',2);
    P.line(root,22+b,tip,12+b,edge);P.line(tip,12+b,tip-s*2,27-b,skin);
    P.line(root,22+b,tip-s*5,29-b,skin);P.p(tip,11+b,horn);
  }
  P.line(33,35,42,41-step,skin,3);P.line(42,41-step,46,37-step,skin,2);P.p(46,35-step,gold);
  // Cloven greaves and separate boots replace the old flowing robe.
  P.r(14,32,10,12,ink);P.r(27,32,9,12,ink);P.r(16,34,6,9,iron);P.r(28,34,6,9,iron);
  P.line(17,35,19,42,edge,2);P.line(29,35,31,42,edge,2);P.p(18,39,fire);P.p(30,39,fire);
  P.r(12+step,43,12,3,ink);P.r(27-step,43,11,3,ink);P.r(13+step,44,9,1,horn);P.r(28-step,44,8,1,horn);
  P.p(18+step,44,ink);P.p(32-step,44,ink);
  // Obsidian cuirass, asymmetric facets and a blazing furnace heart.
  P.r(11,18+b,28,17,ink);P.r(13,19+b,23,13,iron);P.r(14,20+b,5,10,edge);P.r(32,20+b,4,12,'#221e2b');
  P.line(14,19+b,21,22+b,lit);P.line(27,22+b,35,19+b,edge);P.disc(24,26+b,7,ink);
  P.disc(24,26+b,5,'#a43b27');P.disc(24,26+b,4,fire);P.disc(24,26+b,2,gold);P.p(24,25+b,hot);
  P.line(21,22+b,22,29+b,iron);P.line(27,22+b,26,29+b,iron);P.r(19,31+b,11,2,edge);
  P.r(14,33+b,22,3,ink);P.r(16,33+b,18,1,lit);P.r(22,33+b,5,4,iron);P.r(23,34+b,3,2,fire);
  // Spiked pauldrons and massive gauntlets, lifted for the telegraph pose.
  for(const s of [-1,1]){
    const x=s<0?4:35,y=18+b-raised;
    P.r(x,y,10,8,ink);P.r(x+1,y+1,8,5,iron);P.r(x+1,y+1,5,1,lit);
    P.line(x+2,y+1,x,y-4,ink,3);P.line(x+2,y,x+1,y-3,horn);P.line(x+7,y+1,x+9,y-4,ink,2);P.p(x+9,y-3,horn);
    P.r(x+1,y+7,8,8,ink);P.r(x+2,y+7,6,6,skin);P.r(x,y+11,10,5,iron);P.r(x+1,y+11,8,1,edge);
    for(let n=1;n<=7;n+=3)P.r(x+n,y+15,1,2,horn);
    flame(x+4,y-8,6+b);
  }
  // Four heavy swept horns surround a demon face, with no skull or staff.
  P.r(15,7+b,19,12,ink);P.r(17,8+b,15,9,skin);P.r(18,9+b,13,2,'#c65a3c');
  for(const s of [-1,1]){
    const x=24+s*8;
    P.line(x,10+b,24+s*13,5+b,ink,4);P.line(24+s*13,5+b,24+s*12,1+b,ink,3);
    P.line(x,9+b,24+s*12,5+b,horn,2);P.line(24+s*12,5+b,24+s*12,1+b,lit);
    P.line(24+s*4,7+b,24+s*6,2+b,ink,3);P.line(24+s*4,6+b,24+s*6,2+b,horn);
  }
  P.r(17,10+b,7,3,iron);P.r(26,10+b,6,3,iron);P.r(18,12+b,5,1,gold);P.r(27,12+b,4,1,gold);
  P.r(24,10+b,2,6,iron);P.r(19,16+b,12,2,ink);P.p(20,16+b,hot);P.p(29,16+b,hot);P.r(22,18+b,7,1,horn);
  P.r(23,5+b,4,5,iron);flame(24,1+b,5);
  for(let i=0;i<6;i++)link(11+i*4,27+b+(i<3?i:5-i));
  for(const [x,y]of [[5,9],[41,7],[3,35],[43,31]])P.p(x+step,y-b,gold);
}
function drawNecromancerAssets(scene){
  SPR.make(scene,'crypt_necromancer',48,48,4,3,drawNecromancer);
  // This compatible texture key now carries a cinder, not a floating skull.
  SPR.make(scene,'crypt_soul',12,12,1,2,P=>{P.line(6,7,2,1,'#8b3026',3);P.line(7,7,10,2,'#e24d24',2);P.disc(6,7,4,'#371e27');P.disc(6,7,3,'#ff7432');P.disc(6,6,2,'#ffcd72');P.p(6,5,'#fff1b3');P.p(1,4,'#ff9b44');P.p(10,9,'#ffb75d');});
  if(!scene.anims.exists('crypt_necromancer_walk'))scene.anims.create({key:'crypt_necromancer_walk',frames:[0,1,2,3].map(frame=>({key:'crypt_necromancer',frame})),frameRate:4,repeat:-1});
}
