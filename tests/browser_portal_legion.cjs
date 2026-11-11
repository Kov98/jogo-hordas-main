// Real DOM/Phaser integration; the Python runner supplies a disposable DB.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.MURALHA_TEST_URL;
if(!base)throw Error('Use tests/browser_accounts.py --portal-legion');
const artifacts=path.join(__dirname,'../docs/portal-e-legiao/capturas');fs.mkdirSync(artifacts,{recursive:true});
const credentials=JSON.parse(fs.readFileSync(process.env.MURALHA_TEST_CREDENTIALS,'utf8'));
const newIds=['inferno_ember_bat','inferno_chain_lancer','inferno_pyromancer','inferno_furnace_golem','inferno_ash_reaper'];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 let page;const errors=[],checks=[];
 const fresh=async()=>{if(page)await page.close();page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(35000);page.on('pageerror',e=>errors.push(e.stack||e.message));page.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),new URL(r.url()).pathname);});page.on('requestfailed',r=>console.error('REQUEST FAILED',new URL(r.url()).pathname,r.failure()?.errorText));};
 const ready=stage=>page.waitForFunction(s=>{const g=window.GAME?.scene.getScene('Game');return g?.gameReady&&GAME.scene.isActive('Game')&&g.stageId===s&&!g.cinematic&&!g.cameras.main.fadeEffect.isRunning;},stage);
 const capture=name=>page.screenshot({path:path.join(artifacts,name+'.png')});
 const check=msg=>{checks.push(msg);console.log('OK: '+msg);};
 try{
  await fresh();await page.goto(base+'/?nointro');
  await page.waitForFunction(()=>window.GAME?.scene.isActive('Menu'));
  await page.getByRole('button',{name:'Continuar como convidado',exact:true}).click();
  // Password verification need not compete with a software-rendered world.
  await page.evaluate(()=>{GAME.loop.sleep();GamePortal.openLogin();});
  const login=page.getByRole('dialog');await login.getByLabel('Nome de usuário',{exact:true}).fill(credentials.username);
  await login.getByLabel('Senha',{exact:true}).fill(credentials.password);await login.locator('form button[type=submit]').click();
  await page.waitForFunction(()=>GamePortal.isAdmin);await login.waitFor({state:'detached'});
  await page.evaluate(()=>{GAME.loop.wake();GAME.scene.start('Game',{char:'mage',stage:'forest'});});await ready('forest');
  await page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.godMode=true;g.spawningEnabled=false;});
  await page.keyboard.press('F2');await page.getByRole('dialog',{name:'Administração'}).waitFor();
  await require('./admin_layout_checks.cjs')(page);
  await page.getByRole('button',{name:'Adicionar XP',exact:true}).scrollIntoViewIfNeeded();await capture('admin-desktop');
  check('admin controls remain fully visible and clickable with an empty status');
  await page.getByRole('button',{name:'Recuperar toda a vida',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.admin-status')?.textContent.includes('Comando aplicado'));
  await require('./admin_layout_checks.cjs')(page);
  await page.setViewportSize({width:480,height:600});await require('./admin_layout_checks.cjs')(page);
  await page.getByRole('button',{name:'Adicionar XP',exact:true}).scrollIntoViewIfNeeded();await capture('admin-compacto');
  await page.setViewportSize({width:360,height:600});await require('./admin_layout_checks.cjs')(page);
  check('admin feedback stays visible without covering controls on desktop or a compact viewport');
  if(process.env.MURALHA_ADMIN_LAYOUT_ONLY==='1'){assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks:checks.length,pageErrors:0,artifacts}));return;}

  await fresh();await page.goto(base+'/?char=mage&god&nointro');await ready('forest');
  await page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.spawningEnabled=false;g.player.x=2000;g.player.y=680;g.player.sprite.setPosition(g.player.x,g.player.y);g.cameras.main.stopFollow();g.cameras.main.centerOn(2000,500);});
  assert(await page.evaluate(()=>{const g=GAME.scene.getScene('Game'),p={x:2000,y:480,radius:12};g.world.constrain(p);return !g.world.gateOpen&&p.y>=512;}));
  await capture('porta-fechada');
  await page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.t=900;g.startBossFight();g.boss.invuln=false;g.damageEnemy(g.boss,g.boss.hp+1);});
  await page.waitForFunction(()=>{const g=GAME.scene.getScene('Game');return g.stageCleared&&!g.cinematic&&g.world.gateOpen;});
  await page.evaluate(()=>{const g=GAME.scene.getScene('Game');g.player.x=2000;g.player.y=580;g.player.sprite.setPosition(g.player.x,g.player.y);g.cameras.main.stopFollow();g.cameras.main.centerOn(2000,500);});
  assert(await page.evaluate(()=>{const w=GAME.scene.getScene('Game').world,p={x:2000,y:460,radius:12};w.constrain(p);return p.y<500&&w.gateImage.texture.key==='forest_gate_open'&&w.gateLeaves.every(s=>!s.visible);}));
  await capture('porta-branca-aberta');await page.keyboard.press('e');await ready('castle');
  assert(await page.evaluate(()=>{const g=GAME.scene.getScene('Game');return Math.abs(g.player.y-g.world.entry.endY)<3&&GAME.scene.isVisible('UI');}));
  await capture('chegada-castelo');check('first boss opens the white doorway and E traverses smoothly into the castle');

  await fresh();await page.goto(base+'/?char=mage&god&nointro&stage=catacombs');await ready('catacombs');
  const sceneData=await page.evaluate(ids=>{const g=GAME.scene.getScene('Game');g.spawningEnabled=false;g.enemies.killAllSilently();g.player.x=2000;g.player.y=2000;g.player.sprite.setPosition(2000,2000);g.cameras.main.stopFollow();g.cameras.main.centerOn(2000,2000);for(const w of g.player.powers)w.destroy();g.player.powers=[];
   for(const [i,id]of ids.entries()){const e=g.enemies.spawn(id,1680+i*160,1850,1);if(!e)throw Error('Missing '+id);e.hp=e.maxHp=100000;e.def={...e.def,speed:0};}
   return {count:CATACOMB_ENEMY_IDS.length,actors:g.enemies.pool.filter(e=>e.alive).map(e=>({id:e.id,texture:e.sprite.texture.key,frames:e.sprite.texture.frameTotal,name:e.def.name})),cap:CONFIG.maxEnemies};
  },newIds);
  assert.equal(sceneData.count,11);assert.equal(sceneData.actors.length,5);assert.equal(sceneData.cap,240);
  assert.deepEqual(sceneData.actors.map(a=>a.id).sort(),[...newIds].sort());
  assert.equal(new Set(sceneData.actors.map(a=>a.texture)).size,5);assert(sceneData.actors.every(a=>a.frames>=4));
  await capture('cinco-novos-inimigos');check('five new Inferno species have distinct animated textures while preserving the enemy pool');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks:checks.length,pageErrors:0,artifacts}));
 }catch(error){await capture('falha').catch(()=>{});console.error('PAGE ERRORS',errors);throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
