// Barras cinematográficas precisam cobrir a tela mesmo com zoom na câmera do mundo.
module.exports=async function finaleChecks(page){
  const correct=await page.evaluate(()=>new Promise(resolve=>GAME.renderer.snapshot(image=>{
    const c=document.createElement('canvas');c.width=image.width;c.height=image.height;
    const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
    const points=[60,640,1220].flatMap(x=>[[x,12],[x,708]]);
    resolve(points.every(([x,y])=>[...ctx.getImageData(x,y,1,1).data].slice(0,3).every(v=>v<3)));
  })));
  if(!correct)throw Error('Barras da cutscene se deslocam com o zoom da câmera');
  if(!await page.evaluate(()=>document.querySelector('.portal-toolbar')?.hidden))throw Error('Barra de contas cobre a cutscene');
};
