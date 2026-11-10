// Fortaleza das Correntes: as rotas antigas continuam sendo a união dos retângulos.
class CatacombWorld extends World {
  build() {
    const s=this.scene,A=this.A;
    this.entry={x:2000,startY:3806,endY:3520,wallY:3750};
    this.mists=[];this.traps=[];this.trapClock=1.5;this.trapCursor=0;
    this.fortressFires=[];this.fortressChains=[];this.fortressOccluders=[];
    // Os sprites pertencem à cena. O shutdown remove também as referências do mundo;
    // não existem timers, emissores nem tweens permanentes para o cenário.
    s.events?.once('shutdown',()=>{
      this.fortressFires.length=0;this.fortressChains.length=0;
      this.fortressOccluders.length=0;this.fireSources.length=0;this.lights.length=0;
    });
    this.chambers=[{x:2000,y:2000,w:1240,h:1240},...[[1100,1100],[2900,1100],[1100,2900],[2900,2900]].map(([x,y])=>({x,y,w:880,h:880}))];
    this.corridors=[{x:2000,y:2000,w:300,h:3700},{x:2000,y:2000,w:3700,h:300},
      {x:2000,y:1100,w:1800,h:280},{x:2000,y:2900,w:1800,h:280},
      {x:1100,y:2000,w:280,h:1800},{x:2900,y:2000,w:280,h:1800}];
    this.walkable=[...this.chambers,...this.corridors];
    this.routes=[[{x:2000,y:3520},{x:2000,y:2000},{x:2000,y:500}],
      [{x:1100,y:1100},{x:2000,y:1100},{x:2900,y:1100},{x:2900,y:2900},{x:1100,y:2900},{x:1100,y:1100}],
      [{x:500,y:2000},{x:3500,y:2000}]];
    s.add.tileSprite(this.W/2,this.H/2,this.W,this.H,'crypt_wall').setDepth(-10000);
    for(const r of this.walkable)s.add.tileSprite(r.x,r.y,r.w,r.h,'crypt_floor').setDepth(-9500);
    this.fortressWalls();
    const trim=s.add.graphics().setDepth(-9490);trim.lineStyle(3,0x875541,.42);
    for(const r of this.chambers){
      trim.strokeRect(r.x-r.w/2+14,r.y-r.h/2+14,r.w-28,r.h-28);
      for(const dx of [-1,1])for(const dy of [-1,1]){
        const x=r.x+dx*(r.w/2+20),y=r.y+dy*(r.h/2-22);
        this.prop('crypt_pillar',x,y,{tint:0xffffff}).setDepth(-8800);
      }
    }
    s.add.image(A.x,A.y,'crypt_arena').setDepth(-9400);
    this.light(A.x,A.y,6,.065,'crypt_glow').setDepth(-9390);
    for(const c of this.chambers.slice(1)) {
      for(const dx of [-280,280])for(const dy of [-270,270]){
        this.fortressProp('crypt_sarcophagus',c.x+dx,c.y+dy,96,152);this.solid(c.x+dx,c.y+dy-30,27);
        const nx=c.x+dx*1.35,ny=c.y+dy;
        this.prop('crypt_niche',nx,ny,{tint:0xffffff}).setDepth(-6900);
        this.fortressFire(nx,ny-27,.46,-6901);
        this.light(nx,ny-44,1.35,.15,'crypt_glow').setDepth(-6910);
      }
      for(const dx of [-350,350])this.cryptTorch(c.x+dx,c.y-95);
      for(const dx of [-280,280])this.fortressChain(c.x+dx,c.y-435,.9);
      for(const dx of [-380,380])this.fortressChain(c.x+dx,c.y+165,.72);
    }
    for(let y=500;y<=3500;y+=400){if(Math.abs(y-2000)<650)continue;for(const dx of [-110,110])this.cryptTorch(2000+dx,y);}
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4+Math.PI/8,x=A.x+Math.cos(a)*(A.r+60),y=A.y+Math.sin(a)*(A.r+60);
      this.cryptTorch(x,y);this.fortressChain(x,y-245,.96);
    }
    for(const [x,y,kind]of [[2000,3200,'spike'],[2000,800,'soul'],[1100,1550,'spike'],[2900,2450,'spike'],[1100,2500,'soul'],[2900,1500,'soul'],[1500,1100,'spike'],[2500,2900,'spike']]){
      this.traps.push({x,y,kind,ready:0});s.add.image(x,y,'crypt_spikes').setDepth(-9300).setAlpha(kind==='soul'?.55:.85);
    }
    s.add.image(this.entry.x,this.entry.startY,'crypt_stairs').setScale(.75).setDepth(-9300);
    for(const dx of [-122,122]){
      this.cryptTorch(this.entry.x+dx,this.entry.startY-82);
      this.fortressChain(this.entry.x+dx,this.entry.startY-310,.95);
    }
    const haze=s.add.graphics().setDepth(-9200);haze.fillStyle(0x250c14,.075);haze.fillRect(0,0,this.W,this.H);
  }
  cryptTorch(x,y) {
    this.fortressProp('crypt_brazier',x,y,80,104);
    this.fortressFire(x,y-60,.82,y+1);
    this.light(x,y-70,2.2,.23,'crypt_glow').setDepth(-6800);
    this.decal('crypt_glow',x,y-5,1.2,.13).setScale(1.25,.24).setBlendMode(Phaser.BlendModes.ADD);
  }
  fortressProp(key,x,y,w,h) {
    const image=this.prop(key,x,y,{tint:0xffffff});
    this.fortressOccluders.push({image,x,y,w,h});return image;
  }
  fortressFire(x,y,scale,depth) {
    if(this.fortressFires.length>=44)return;
    const image=this.scene.add.image(x,y,'crypt_flame',0).setOrigin(.5,1).setScale(scale).setDepth(depth);
    this.fortressFires.push({image,x,y,scale,phase:this.rng()*4});
    this.fireSources.push({x,y:y-28*scale,rate:scale>.5?4:2});
  }
  fortressChain(x,y,scale) {
    if(this.fortressChains.length>=26)return;
    // Atrás dos personagens: os elos grandes nunca encobrem o herói.
    const image=this.scene.add.image(x,y,'crypt_chain').setOrigin(.5,0).setScale(scale).setDepth(-6850);
    this.fortressChains.push({image,x,y,phase:this.rng()*6.28});
  }
  fortressWalls() {
    const g=this.scene.add.graphics().setDepth(-9000);
    const inside=(x,y)=>this.walkable.some(r=>Math.abs(x-r.x)<r.w/2&&Math.abs(y-r.y)<r.h/2);
    // Recorta cada face nas interseções exatas. Assim as muralhas nunca cruzam
    // a boca dos corredores nem sugerem uma parede onde a colisão permite passar.
    for(const r of this.walkable)for(const horizontal of [true,false])for(const side of [-1,1]){
      const mid=horizontal?r.x:r.y,half=(horizontal?r.w:r.h)/2;
      const edge=(horizontal?r.y:r.x)+side*(horizontal?r.h:r.w)/2;
      const cuts=[mid-half,mid+half];
      for(const o of this.walkable)for(const sign of [-1,1]){
        const value=(horizontal?o.x:o.y)+sign*(horizontal?o.w:o.h)/2;
        if(value>mid-half&&value<mid+half)cuts.push(value);
      }
      cuts.sort((a,b)=>a-b);
      for(let i=1;i<cuts.length;i++){
        const lo=cuts[i-1],hi=cuts[i],center=(lo+hi)/2;
        if(hi-lo<1||inside(horizontal?center:edge+side,horizontal?edge+side:center))continue;
        const n=Math.ceil((hi-lo)/64),size=(hi-lo)/n;
        for(let j=0;j<n;j++){
          const pos=lo+j*size,x=horizontal?pos:edge+(side<0?-32:0),y=horizontal?edge+(side<0?-48:0):pos;
          const w=horizontal?size:32,h=horizontal?48:size;
          g.fillStyle(0x090a11,1).fillRect(x,y,w,h);
          g.fillStyle(j%2?0x29232e:0x332732,1).fillRect(x+2,y+2,w-4,h-4);
          g.fillStyle(0x73504c,.8).fillRect(x+3,y+2,w-6,3);
          g.fillStyle(0x12121c,1).fillRect(x+3,y+h-8,w-6,6);
          g.fillStyle(0x9a664d,.7).fillRect(x+6,y+8,3,3);
          if(horizontal){g.fillStyle(0x14141e,1).fillRect(x+size*.35,y-7,size*.3,9);g.fillStyle(0xa14c2f,.65).fillRect(x+size*.42,y+19,size*.16,3);}
        }
      }
    }
  }
  onPath(x,y,pad=0){return this.corridors.some(r=>Math.abs(x-r.x)<r.w/2+pad&&Math.abs(y-r.y)<r.h/2+pad);}
  free(x,y,padPath=0,padArena=0,spacing=0){
    if(!this.walkable?.some(r=>Math.abs(x-r.x)<r.w/2-45&&Math.abs(y-r.y)<r.h/2-45))return false;
    if(this.onPath(x,y,padPath)||this.inArena(x,y,padArena)||Math.hypot(x-2000,y-3520)<250)return false;
    return !this.solids.query(x,y,spacing||40,[]).length;
  }
  constrain(e) {
    if(this.arenaLock){super.constrain(e);return;}
    const r=e.radius||12;
    // Project into the nearest chamber/corridor; no thin-wall tunnelling on dash.
    const inside=this.walkable.some(z=>Math.abs(e.x-z.x)<=z.w/2-r&&Math.abs(e.y-z.y)<=z.h/2-r);
    if(!inside){let best=null,dist=Infinity;for(const z of this.walkable){const x=clamp(e.x,z.x-z.w/2+r,z.x+z.w/2-r),y=clamp(e.y,z.y-z.h/2+r,z.y+z.h/2-r),d=(x-e.x)**2+(y-e.y)**2;if(d<dist){best={x,y};dist=d;}}e.x=best.x;e.y=best.y;}
    e.x=clamp(e.x,this.B+r,this.W-this.B-r);e.y=clamp(e.y,this.B+r,this.H-this.B-r);
    if(e.noObs||e.ghost||e.def?.fly)return;
    for(const o of this.solids.query(e.x,e.y,r,this.tmp)) {const dx=e.x-o.x,dy=e.y-o.y,d=Math.hypot(dx,dy),rr=r+o.radius;if(d<rr){if(!d)e.x+=rr;else{e.x+=dx/d*(rr-d);e.y+=dy/d*(rr-d);}}}
  }
  showBarrier() {
    this.barrierProps=[];this.barrierTweens=[];
    const g=this.scene.add.graphics().setDepth(8000);g.lineStyle(8,0xea5428,.5).strokeCircle(this.A.x,this.A.y,this.A.r);g.lineStyle(2,0xffce79,.85).strokeCircle(this.A.x,this.A.y,this.A.r-5);
    this.barrierProps.push(g);this.barrierTweens.push(this.scene.tweens.add({targets:g,alpha:{from:.45,to:1},duration:950,yoyo:true,repeat:-1}));
  }
  hideBarrier(){for(const t of this.barrierTweens||[]){t.stop();t.remove();}for(const p of this.barrierProps||[])p.destroy();this.barrierProps=[];this.barrierTweens=[];this.arenaLock=false;}
  update(dt,t) {
    super.update(dt,t);
    const sc=this.scene,v=sc.cameras.main.worldView,player=sc.player;
    for(const f of this.fortressFires){
      const near=f.x>=v.x-90&&f.x<=v.right+90&&f.y>=v.y-20&&f.y<=v.bottom+130;
      f.image.setVisible(near);if(!near)continue;
      f.image.setFrame(Math.floor(t*9+f.phase)%4);
      const covered=player&&Math.abs(player.x-f.x)<28*f.scale&&player.y<f.y+20&&player.y>f.y-85*f.scale;
      f.image.setAlpha(covered?.3:.95);
    }
    for(const c of this.fortressChains){
      const near=c.x>=v.x-70&&c.x<=v.right+70&&c.y>=v.y-240&&c.y<=v.bottom+20;
      c.image.setVisible(near);if(near)c.image.setRotation(Math.sin(t*.85+c.phase)*.024);
    }
    for(const p of this.fortressOccluders){
      const near=p.x>=v.x-p.w&&p.x<=v.right+p.w&&p.y>=v.y&&p.y<=v.bottom+p.h;
      p.image.setVisible(near);if(!near)continue;
      const covered=player&&Math.abs(player.x-p.x)<p.w*.48&&player.y<p.y-5&&player.y>p.y-p.h-10;
      p.image.setAlpha(covered?.32:1);
    }
    if(sc.cinematic||sc.bossStarted||sc.ended||sc.stageCleared||sc.explorationOpen)return;
    this.trapClock-=dt;if(this.trapClock>0)return;this.trapClock=1.8;
    const active=sc.hazards.filter(h=>h.environmentTrap).length;if(active>=4)return;
    for(let i=0;i<this.traps.length;i++){
      const trap=this.traps[this.trapCursor++%this.traps.length];
      if(trap.ready>t||trap.x<v.x-100||trap.x>v.right+100||trap.y<v.y-100||trap.y>v.bottom+100||Math.hypot(trap.x-sc.player.x,trap.y-sc.player.y)>480)continue;
      trap.ready=t+7;sc.addHazard({shape:'circle',x:trap.x,y:trap.y,r:trap.kind==='spike'?45:65,delay:trap.kind==='spike'?1.3:1.7,dmg:(trap.kind==='spike'?14:17)*sc.dmgScale()*sc.difficulty.dmgMul,col:trap.kind==='spike'?0xffb669:0xff623c,kind:'fire',environmentTrap:true});break;
    }
  }
}
