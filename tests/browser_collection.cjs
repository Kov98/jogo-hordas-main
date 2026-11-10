const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.MURALHA_TEST_URL;
if(!base)throw Error('Execute tests/browser_accounts.py --collection');
const artifacts=path.join(require('node:os').tmpdir(),'muralha-catacumbas');fs.mkdirSync(artifacts,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
 const active=key=>page.waitForFunction(key=>window.GAME?.scene.isActive(key)&&!GAME.scene.getScene(key).cameras.main.fadeEffect.isRunning,key);
 const capture=name=>page.screenshot({path:path.join(artifacts,name+'.png')});
 const guest=async()=>{
  const button=page.getByRole('button',{name:'Continuar como convidado',exact:true});
  if(await button.count())await button.click();
 };
 try{
  await page.goto(base+'/?nointro');await active('Menu');await guest();
  await page.keyboard.press('c');
  await page.getByRole('dialog',{name:'Coleção e desafios'}).waitFor();
  assert.equal(await page.getByLabel('Herói',{exact:true}).inputValue(),'vanguard');
  await page.getByLabel('Herói',{exact:true}).selectOption('vanguard');
  assert.equal(await page.getByLabel('Poder inicial',{exact:true}).locator('option[value=axes]').isDisabled(),true);
  await page.getByRole('button',{name:'Voltar',exact:true}).click();
  // Seed the public guest milestone, whose real campaign trigger is covered by
  // the journey/forest runners. Exercise actual collection controls and Phaser.
  await page.evaluate(()=>{GamePortal.recordGuestAdvance('castle');});
  await page.keyboard.press('c');await page.getByRole('dialog',{name:'Coleção e desafios'}).waitFor();
  await page.getByLabel('Herói',{exact:true}).selectOption('vanguard');
  await page.getByLabel('Poder inicial',{exact:true}).selectOption('axes');
  await page.getByLabel('Aparência',{exact:true}).selectOption('cinders');
  await capture('colecao-loadout');await page.getByRole('button',{name:'Voltar',exact:true}).click();
  await page.keyboard.press('Enter');await active('Select');
  assert(await page.evaluate(()=>GAME.scene.getScene('Select').cards[0].powerName.text===POWERS.axes.name));
  await capture('herois-personalizados');
  await page.keyboard.press('1');await active('StageSelect');
  await page.keyboard.press('1');await active('Difficulty');
  await page.keyboard.press('1');
  await page.waitForFunction(()=>GAME.scene.getScene('Game').gameReady);
  assert(await page.evaluate(()=>{
   const g=GAME.scene.getScene('Game'),p=g.player;g.spawningEnabled=false;
   return p.def.id==='vanguard'&&p.hasPower('axes')&&!p.hasPower('slash')&&p.loadout.skin==='cinders'&&p.appearanceTint===MetaProgress.SKINS.cinders.tint;
  }));
  await capture('poder-inicial-alternativo');
  await page.reload();await active('Menu');await guest();
  assert.equal(await page.evaluate(()=>MetaProgress.loadout('vanguard').startPower),'axes');
  assert.equal(await page.evaluate(()=>MetaProgress.loadout('vanguard').skin),'cinders');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,checks:4,pageErrors:0,artifacts}));
 }catch(error){
  console.error('COLLECTION DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({
   selects:[...document.querySelectorAll('select')].map(s=>({label:s.labels?.[0]?.textContent,value:s.value,html:s.outerHTML})),
   profile:typeof MetaProgress==='undefined'?null:MetaProgress.profileKey(),
  })).catch(()=>null)));
  await capture('colecao-falha').catch(()=>{});throw error;
 }
 finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
