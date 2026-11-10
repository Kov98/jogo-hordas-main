// Miniaturas feitas com a mesma pixel art dos mapas, em telas de tamanho fixo.
function drawStagePreview(scene, id) {
  const key = 'stage_preview_' + id;
  SPR.canvas(scene, key, 312, 154, g => {
    g.imageSmoothingEnabled = false;
    const rng = mulberry32(id === 'forest' ? 6194 : id === 'castle' ? 8107 : 9311);
    const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
    const image = (name, x, foot, w, h, alpha = 1) => {
      if (!scene.textures.exists(name)) return;
      const texture = scene.textures.get(name), f = texture.get(texture.has(0) ? 0 : undefined);
      g.save(); g.globalAlpha = alpha;
      g.drawImage(texture.source[f.sourceIndex].image, f.cutX, f.cutY, f.cutWidth, f.cutHeight,
        Math.round(x - w / 2), Math.round(foot - h), Math.round(w), Math.round(h));
      g.restore();
    };
    const glow = (x, y, r, color) => {
      const light = g.createRadialGradient(x, y, 0, x, y, r);
      light.addColorStop(0, color); light.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = light; g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const disc = (x, y, r, color) => {
      for (let dy = -r; dy <= r; dy += 2) {
        const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) / 2) * 2;
        rect(x - half, y + dy, half * 2, 2, color);
      }
    };
    const stars = () => {
      for (let i = 0; i < 45; i++) rect(rng() * 312, rng() * 87, i % 9 ? 1 : 2, 1, i % 3 ? '#798c9c' : '#c7d2d0');
    };
    const lantern = (x, foot, scale = 1) => {
      glow(x, foot - 8 * scale, 31 * scale, 'rgba(255,119,28,.55)');
      image('forest_lantern', x, foot, 7 * scale, 12 * scale);
    };

    if (id === 'forest') {
      rect(0, 0, 312, 154, '#0b111c'); stars();
      glow(204, 31, 60, 'rgba(123,149,174,.12)'); disc(204, 31, 16, '#a4b3bd');
      disc(208, 27, 4, '#a6b9b9'); disc(198, 36, 3, '#a6b9b9');
      for (let row = 0; row < 3; row++) for (let i = 0; i < 10; i++) {
        image(i % 3 ? 'forest_tree_pine' : 'forest_tree_oak', i * 37 - row * 9, 84 + row * 13, 32 + row * 9, 46 + row * 15, .3 + row * .17);
      }
      for (let y = 91; y < 154; y += 2) {
        rect(0, y, 312, 2, y % 6 ? '#111d1c' : '#19251f');
        const cx = 161 + Math.sin(y * .055) * 17, half = (y - 65) * .31;
        rect(cx - half - 4, y, half * 2 + 8, 2, '#1c2822');
        rect(cx - half, y, half * 2, 2, y % 6 ? '#30332b' : '#424234');
      }
      for (let i = 0; i < 230; i++) {
        const x = rng() * 312, y = 96 + rng() * 58;
        rect(x, y, 2, 1, i % 3 ? '#293a29' : '#4d5946');
      }
      image('forest_tree_oak', 53, 139, 111, 139);
      image('forest_tree_pine', 282, 151, 91, 141);
      image('forest_tree_birch', 111, 113, 41, 64);
      image('forest_tree_dead', 238, 124, 56, 81);
      image('forest_body_3', 190, 132, 24, 13);
      image('forest_rock_0', 218, 144, 26, 22);
      for (const [x,y] of [[18,151],[80,148],[114,134],[242,153],[294,147]]) image('forest_fern',x,y,25,20);
      lantern(176, 110, .7); lantern(143, 139, 1.1); lantern(205, 132, .8);
      glow(160, 115, 46, 'rgba(89,128,140,.035)');
      rect(0, 91, 312, 4, 'rgba(101,125,145,.025)'); rect(0, 109, 312, 5, 'rgba(101,125,145,.02)');
    } else if (id === 'castle') {
      for (let y = 0; y < 154; y += 32) for (let x = 0; x < 312; x += 32) image('ground',x+16,y+32,32,32);
      rect(0,0,312,154,'rgba(7,5,15,.22)');
      image('arena',202,148,142,142);
      glow(202,83,83,'rgba(154,26,33,.25)');
      for (let x = 0; x < 312; x += 32) image('wall',x+16,32,32,32);
      rect(0,31,312,3,'#080b16'); rect(0,34,312,2,'#5c535f');
      for (const [x,y] of [[31,80],[85,80],[31,151],[85,151],[277,69],[279,148]]) {
        image('pillar',x,y,20,48); image('rubble',x+8,y+3,19,9,.8);
      }
      image('banner',58,64,17,40); image('banner',292,61,17,40);
      image('bones',107,139,20,10); image('rubble',147,53,18,9);
      for (const [x,y] of [[119,77],[284,77],[125,141],[279,141],[58,96]]) {
        rect(x-1,y-17,3,19,'#514133');
        glow(x,y-20,35,'rgba(255,137,39,.35)');image('flame',x,y-14,10,21);
      }
      glow(202,80,26,'rgba(230,34,31,.22)');
      image('c_vanguard',58,124,14,21);
      rect(5,37,3,117,'rgba(120,116,128,.23)');
    } else if(id === 'catacombs') {
      rect(0,0,312,154,'#170c10');
      for(let y=0;y<154;y+=32)for(let x=0;x<312;x+=32)image('crypt_floor',x+16,y+32,32,32);
      rect(0,0,312,154,'rgba(14,3,7,.2)');image('crypt_arena',165,204,226,226);
      for(let x=0;x<312;x+=32)image('crypt_wall',x+16,32,32,32);
      for(const x of [0,280]){
        rect(x,0,32,86,'#21151b');rect(x+3,0,5,86,'#59342e');
        for(let y=15;y<85;y+=15)rect(x+2,y,28,2,'#0e0b10');
      }
      for(const x of [57,255])image('crypt_chain',x,96,15,104);
      for(const x of [18,292])image('crypt_pillar',x,155,32,87);
      for(const x of [89,235])image('crypt_niche',x,59,31,48);
      for(const x of [65,255])image('crypt_sarcophagus',x,135,26,46);
      for(const [x,y]of [[35,92],[277,92],[104,151],[220,151]]){
        glow(x,y-24,42,'rgba(255,91,24,.48)');image('crypt_brazier',x,y,22,33);image('crypt_flame',x,y-21,12,25);
      }
      glow(160,87,50,'rgba(255,55,17,.3)');image('crypt_necromancer',160,116,52,67);
      image('crypt_soul',132,60,11,13);image('crypt_soul',196,49,9,11);
      for(let i=0;i<22;i++)rect(12+rng()*288,20+rng()*132,2,i%3?2:3,i%3?'#f16b2d':'#ffd484');
      rect(0,0,312,3,'#6c3626');rect(0,3,312,3,'#251218');
    } else {
      rect(0,0,312,154,'#151b2d'); stars();
      glow(229,27,53,'rgba(177,166,191,.17)');disc(229,27,14,'#999aa9');disc(236,22,13,'#151b2d');
      for (const [peak,top,width,color] of [[55,41,85,'#2c3546'],[176,28,118,'#34394e'],[270,63,104,'#252f42']]) {
        for(let y=top;y<154;y+=2){const half=(y-top)*width/130;rect(peak-half,y,half*2,2,color);}
      }
      for(let i=0;i<6;i++)rect(0,88+i*9,312,3,'rgba(148,153,175,.07)');
      rect(135,81,15,66,'#141c28');rect(189,75,18,77,'#141c28');
      for(let y=90;y<151;y+=8){rect(137,y,11,1,'#46515a');rect(191,y,13,1,'#3d4757');}
      rect(148,121,43,5,'#263442');rect(153,124,33,5,'#1d2936');
      glow(169,120,28,'rgba(143,171,177,.1)');
      g.font='bold 42px monospace';g.textAlign='center';g.strokeStyle='#111621';g.lineWidth=5;g.strokeText('?',170,107);g.fillStyle='#b5bac8';g.fillText('?',170,107);
    }
    const shade=g.createRadialGradient(156,78,35,156,78,175);
    shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(2,5,12,.5)');
    g.fillStyle=shade;g.fillRect(0,0,312,154);
    rect(0,0,312,2,'rgba(172,181,168,.16)');rect(0,152,312,2,'#0a0e16');
  });
  return key;
}
