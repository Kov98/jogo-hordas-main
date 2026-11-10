// A fortaleza é desenhada uma vez; crypt_* conserva saves e mapas anteriores.
function drawCatacombAssets(scene) {
  const tile = (key, floor) => SPR.canvas(scene,key,128,128,g=>{
    const rng=mulberry32(floor?7919:14327);
    g.fillStyle=floor?'#242129':'#100f16';g.fillRect(0,0,128,128);
    for(let y=0;y<128;y+=32)for(let x=(y%64?-32:0);x<128;x+=64){
      g.fillStyle=floor?'#111118':'#06070c';g.fillRect(x,y,64,32);
      g.fillStyle=floor?['#28252d','#24232b','#2c272e'][(rng()*3)|0]:['#1a1821','#17171f','#1d1a22'][(rng()*3)|0];g.fillRect(x+2,y+2,60,28);
      g.fillStyle=floor?'#3c343c':'#332934';g.fillRect(x+4,y+2,56,2);
      g.fillStyle=floor?'#17151d':'#0b0b12';g.fillRect(x+60,y+4,2,26);g.fillRect(x+4,y+28,56,2);
      if(!floor){g.fillStyle='#51404a';g.fillRect(x+8,y+7,3,3);g.fillRect(x+53,y+7,3,3);g.fillStyle='#090a10';g.fillRect(x+9,y+8,2,2);g.fillRect(x+54,y+8,2,2);}
    }
    for(let i=0;i<75;i++){g.fillStyle=i%3?'#75616a':'#0c0c12';g.globalAlpha=floor?.13:.2;g.fillRect((rng()*64|0)*2,(rng()*64|0)*2,2+(i%2)*2,2);}g.globalAlpha=1;
    // Veios estreitos de calor no rejunte; nunca uma superfície de lava.
    g.fillStyle=floor?'#633127':'#7a3028';for(const [x,y]of [[20,32],[84,96]]){g.fillRect(x,y,16,2);g.fillRect(x+12,y+2,2,6);g.fillRect(x+14,y+6,8,2);}
    if(!floor){g.fillStyle='#b74a28';g.fillRect(28,32,4,2);g.fillRect(100,102,4,2);}
  });
  tile('crypt_ground',false);tile('crypt_floor',true);tile('crypt_wall',false);

  // O antigo sarcófago é um monólito de obsidiana preso por ferro quente.
  SPR.make(scene,'crypt_sarcophagus',48,76,1,2,P=>{
    P.shadow(24,73,44);P.r(3,67,42,6,'#0b0b11');P.r(5,65,38,5,'#51404a');P.r(8,62,32,5,'#26232e');
    P.line(8,62,11,20,'#080911',4);P.line(37,62,33,20,'#080911',4);
    P.r(13,17,23,46,'#312b38');P.r(17,11,15,52,'#443542');P.r(23,7,5,56,'#252330');
    P.line(11,20,23,4,'#70606a',2);P.line(25,5,36,21,'#171722',3);P.line(16,23,15,59,'#70505a');P.line(34,23,35,60,'#0b0d16',2);
    P.line(21,29,25,34,'#a93c2b',2);P.line(25,34,22,43,'#e7622c',2);P.line(22,43,27,50,'#7b2d28',2);P.p(24,35,'#ffd273');
    for(let i=0;i<5;i++)for(const side of [-1,1]){const x=24+side*(14-i*3),y=28+i*5;P.r(x-3,y,7,5,'#100f18');P.r(x-2,y,5,4,'#8b6b65');P.r(x-1,y+1,3,2,'#211d28');P.p(x-2,y,'#c19b7b');}
    P.r(20,43,8,8,'#12121a');P.r(21,44,6,6,'#b17548');P.r(23,45,2,3,'#221720');
    for(const x of [5,39]){P.r(x,61,4,8,'#14131d');P.p(x+1,62,'#a37c65');}
  });
  // Grade de fornalha: chaminé, mandíbulas de ferro, brasas atrás das barras.
  SPR.make(scene,'crypt_niche',56,68,1,2,P=>{
    P.shadow(28,65,52);P.r(1,6,54,57,'#090a10');P.r(4,8,48,54,'#392d36');P.r(8,13,40,44,'#0a090e');
    P.r(12,34,32,21,'#481b20');P.r(15,42,26,12,'#9d3322');P.r(20,47,17,6,'#e97028');P.r(24,49,7,4,'#ffbf56');
    for(const x of [12,19,26,33,40]){P.r(x,17,3,39,'#0b0d14');P.r(x,17,1,39,'#80605b');P.r(x+1,19,1,35,'#352c36');P.r(x-1,14,5,4,'#493a43');}
    P.r(7,27,42,4,'#0e1018');P.r(7,27,42,1,'#98705c');P.r(6,55,44,6,'#171722');P.r(4,61,48,3,'#806356');
    for(const x of [4,47]){P.line(x,12,x-2,1,'#5b4652',3);P.line(x,1,x+4,7,'#a07a69',2);P.r(x,31,4,13,'#1a1823');P.p(x+1,33,'#d68a49');}
    P.r(14,6,28,5,'#5a4047');P.r(20,3,16,4,'#30242f');P.r(24,0,8,4,'#836354');
  });
  SPR.make(scene,'crypt_brazier',40,52,1,2,P=>{
    P.shadow(20,49,36);P.r(7,46,26,4,'#14121b');P.r(9,44,22,3,'#775047');P.r(16,30,8,15,'#24202b');P.r(17,31,2,12,'#9e6d51');
    P.r(5,21,30,9,'#15141e');P.r(8,27,24,5,'#50333a');P.r(10,30,20,3,'#9a5940');P.r(6,22,28,2,'#d88147');P.r(10,20,20,3,'#ed6b29');P.r(15,20,10,2,'#ffce68');
    for(const side of [-1,1]){P.line(20+side*12,27,20+side*18,13,'#231e2a',3);P.line(20+side*18,13,20+side*15,7,'#8d6458',2);P.r(20+side*12-1,37,3,8,'#382b36');}
    for(const x of [8,18,28]){P.r(x,24,3,3,'#211b25');P.p(x,24,'#b57a52');}
  });
  SPR.make(scene,'crypt_flame',30,44,4,2,(P,f)=>{
    const sway=[0,2,-1,1][f];
    P.r(6,35,19,5,'#9b2425');P.r(4,30,22,7,'#c43a22');P.r(7,23,17,12,'#e95322');P.r(10,16,12,17,'#f57829');
    P.r(10+sway,8,7,17,'#d63c22');P.r(12+sway,2+f%2*3,4,15,'#a92c27');P.r(12+sway,11,5,16,'#ff9c35');
    P.r(7-sway,18+f,5,13,'#f46a24');P.r(5-sway,14+f,3,10,'#b73125');P.r(23-sway,22-f*2,3,10,'#e74a20');
    P.r(11,27,10,11,'#ffb544');P.r(13+sway,21,5,13,'#ffd774');P.r(14,31,5,7,'#fff0b1');
    P.r(8+f*3,5+(f%2)*4,2,3,'#f59c38');P.p(22-f,13,'#ffd377');
  });
  SPR.make(scene,'crypt_chain',28,112,1,2,P=>{
    // Elos alternados, vazados, com reflexo frio e borda oxidada.
    for(let i=0;i<12;i++){
      const y=i*9,x=i%2?11:7,w=i%2?7:15;
      P.r(x-1,y,w+2,12,'#090b12');P.r(x,y,w,11,'#725a61');P.r(x+2,y+2,w-4,7,'#12131d');
      P.r(x,y+2,2,7,'#b28a76');P.r(x+2,y,w-4,2,'#968086');P.r(x+w-2,y+4,2,5,'#3d303d');P.p(x+1,y+8,'#d49863');
    }
  });
  SPR.make(scene,'crypt_pillar',64,100,1,2,P=>{
    P.shadow(32,96,62);P.r(3,89,58,8,'#0c0c13');P.r(6,86,52,6,'#71545a');P.r(13,29,38,58,'#211e29');P.r(17,29,8,57,'#4c3a48');P.r(44,30,6,57,'#0f1019');
    P.r(25,30,15,54,'#302634');P.r(29,38,4,32,'#7b302c');P.r(30,42,2,19,'#d06030');
    for(const side of [-1,1]){P.line(32+side*14,34,32+side*24,17,'#42313f',7);P.line(32+side*24,17,32+side*21,3,'#6d4f55',5);P.line(32+side*21,3,32+side*15,14,'#a8806c',2);}
    P.r(10,27,44,7,'#15141f');P.r(11,27,42,2,'#a07a67');P.r(9,80,46,5,'#16141f');P.r(10,80,44,1,'#85665d');
    for(const x of [17,43])for(const y of [37,73]){P.r(x,y,4,4,'#0b0d14');P.p(x,y,'#b78663');}
    P.r(25,20,14,9,'#11101b');P.line(25,22,29,25,'#e46c31',2);P.line(37,22,33,25,'#e46c31',2);
  });
  SPR.make(scene,'crypt_spikes',40,28,1,2,P=>{
    P.r(1,5,38,22,'#090a11');P.r(3,7,34,17,'#4b333c');P.r(5,9,30,13,'#181720');
    for(let y=12;y<24;y+=7)for(let x=8;x<38;x+=8){P.r(x-3,y-2,6,5,'#080b11');P.line(x-1,y+1,x,y-5,'#ae8270',2);P.p(x,y-5,'#e8b18b');P.p(x-3,y+2,'#973826');}
    P.r(4,25,32,2,'#9d5b45');
  });
  SPR.canvas(scene,'crypt_arena',1152,1152,g=>{
    const c=576,polygon=(r,n=16,offset=0)=>{g.beginPath();for(let i=0;i<n;i++){const a=i/n*Math.PI*2+offset,x=Math.round((c+Math.cos(a)*r)/4)*4,y=Math.round((c+Math.sin(a)*r)/4)*4;i?g.lineTo(x,y):g.moveTo(x,y);}g.closePath();};
    g.fillStyle='#28232c';polygon(515,32);g.fill();
    g.save();polygon(501,32);g.clip();
    for(let y=64;y<1100;y+=64)for(let x=32;x<1120;x+=96){g.fillStyle=((x/96+y/64)|0)%2?'#24212a':'#2d2730';g.fillRect(x,y,92,60);g.fillStyle='#44313a';g.fillRect(x+4,y,84,3);}
    for(let i=0;i<8;i++){const a=i*Math.PI/4;g.save();g.translate(c,c);g.rotate(a);g.fillStyle='#13131d';g.fillRect(182,-10,320,20);g.fillStyle='#71504e';g.fillRect(185,-10,315,3);for(let x=210;x<500;x+=32){g.fillStyle='#bf865c';g.fillRect(x,-4,4,4);}g.restore();}
    g.restore();
    for(const [r,col,width]of [[508,'#100f18',20],[501,'#9a6351',5],[484,'#382833',18],[472,'#b35734',4],[441,'#17151f',8],[197,'#63433e',5],[181,'#13131c',11]]){g.strokeStyle=col;g.lineWidth=width;polygon(r,32);g.stroke();}
    for(let i=0;i<32;i++){const a=i*Math.PI/16;g.save();g.translate(c+Math.cos(a)*490,c+Math.sin(a)*490);g.rotate(a);g.fillStyle='#15151f';g.fillRect(-15,-10,30,20);g.fillStyle='#9c7360';g.fillRect(-12,-9,24,3);g.fillStyle=i%2?'#b75733':'#ef963e';g.fillRect(-4,-3,8,6);g.restore();}
    // Coroa de forja no piso: ferro e selo sem encobrir avisos de combate.
    g.strokeStyle='#563832';g.lineWidth=8;polygon(139,8,Math.PI/8);g.stroke();
    g.strokeStyle='#895039';g.lineWidth=4;g.beginPath();g.moveTo(c-108,c-50);g.lineTo(c-48,c-116);g.lineTo(c-36,c-44);g.lineTo(c+36,c-44);g.lineTo(c+48,c-116);g.lineTo(c+108,c-50);g.lineTo(c+72,c+66);g.lineTo(c,c+119);g.lineTo(c-72,c+66);g.closePath();g.stroke();
    g.fillStyle='#39272c';g.fillRect(c-25,c-28,50,60);g.fillStyle='#bb673d';g.fillRect(c-9,c-12,18,18);g.fillStyle='#17131d';g.fillRect(c-4,c-7,8,23);
  });
  SPR.canvas(scene,'crypt_stairs',224,256,g=>{
    g.fillStyle='#090a10';g.fillRect(0,0,224,256);g.fillStyle='#4d3039';g.fillRect(8,8,208,240);g.fillStyle='#121019';g.fillRect(24,20,176,220);
    for(let i=0;i<11;i++){const y=230-i*18;g.fillStyle=i%2?'#30262f':'#3b2c35';g.fillRect(30,y,164,16);g.fillStyle='#9d6d56';g.fillRect(30,y,164,3);g.fillStyle='#17141d';g.fillRect(30,y+13,164,3);g.fillStyle='#693329';g.fillRect(34,y+4,8,6);g.fillRect(182,y+4,8,6);}
    for(const x of [12,200]){g.fillStyle='#201923';g.fillRect(x,10,12,238);g.fillStyle='#bd7045';g.fillRect(x+2,14,3,230);for(let y=20;y<240;y+=25){g.fillStyle='#15131c';g.fillRect(x-4,y,20,15);g.fillStyle='#986650';g.fillRect(x-2,y,16,3);}}
    g.fillStyle='#0a080e';g.fillRect(29,20,166,46);for(let x=38;x<192;x+=18){g.fillStyle='#392b35';g.fillRect(x,20,6,42);g.fillStyle='#a96644';g.fillRect(x,20,2,35);}
    g.strokeStyle='#ae603d';g.lineWidth=4;g.beginPath();g.moveTo(28,47);g.lineTo(15,11);g.lineTo(54,30);g.lineTo(170,30);g.lineTo(209,11);g.lineTo(196,47);g.stroke();
    g.fillStyle='rgba(237,81,31,.12)';g.fillRect(30,66,164,22);
  });
  SPR.canvas(scene,'crypt_seal',224,256,g=>{
    g.fillStyle='rgba(65,20,22,.34)';g.fillRect(0,0,224,256);g.strokeStyle='#f0833e';g.lineWidth=4;g.beginPath();g.arc(112,128,76,0,Math.PI*2);g.stroke();
    for(const side of [-1,1])for(let i=0;i<11;i++){const x=112+side*(i-5)*13,y=128+(i-5)*17;g.fillStyle='#17141f';g.fillRect(x-8,y-10,16,20);g.strokeStyle='#c08560';g.lineWidth=3;g.strokeRect(x-6,y-8,12,16);}
    g.fillStyle='#1b1420';g.fillRect(94,108,36,45);g.strokeStyle='#f6ac53';g.lineWidth=4;g.strokeRect(94,108,36,45);g.fillStyle='#ffdc86';g.fillRect(108,119,8,13);g.fillRect(110,130,4,11);
  });
  SPR.canvas(scene,'crypt_glow',128,128,g=>{
    const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,171,65,.55)');r.addColorStop(.35,'rgba(244,68,31,.24)');r.addColorStop(1,'rgba(120,20,31,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
  });
  drawNecromancerAssets(scene);
}
