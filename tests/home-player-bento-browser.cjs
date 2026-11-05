/* Isolated contexts only: reuse existing demo records, never write to a user's profile. */
const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.KICKS_TEST_URL||'http://127.0.0.1:4181';
const out='.local/hero-player-bento';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const catalogue=JSON.parse(fs.readFileSync('.local/data-audit/demo-fixture.json','utf8'));
 const data=structuredClone(catalogue);data.fields=data.fields.slice(0,2);
 const errors=[],report={layouts:[],links:[],motion:{}};
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
 await context.addInitScript(data=>localStorage.setItem('kicks-data-v2',JSON.stringify(data)),data);
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base);await p.waitForFunction(()=>window.KicksHeroHalftone?.inspect().renderer?.playerReady);await p.waitForTimeout(3000);
 assert.equal(await p.locator('.hero-halftone canvas').count(),1);
 const raw=await p.evaluate(()=>localStorage.getItem('kicks-data-v2'));
 report.motion.idle=await p.evaluate(()=>KicksHeroHalftone.sample());
 await p.screenshot({path:out+'/hero-idle.png'});
 await p.mouse.move(1120,480);await p.waitForTimeout(650);
 report.motion.reveal=await p.evaluate(()=>KicksHeroHalftone.sample());assert.notEqual(report.motion.reveal,report.motion.idle);
 await p.screenshot({path:out+'/hero-player.png'});
 await p.mouse.move(100,300);await p.waitForTimeout(2500);
 assert.equal(await p.evaluate(()=>KicksHeroHalftone.sample()),report.motion.idle);
 await p.locator('#fields').scrollIntoViewIfNeeded();await p.waitForTimeout(1000);
 assert.equal(await p.locator('.pitch-editorial').count(),2);
 const beforeHover=await p.locator('.pitch-editorial img').first().evaluate(e=>getComputedStyle(e).transform);
 await p.locator('.pitch-editorial').first().hover();await p.waitForTimeout(750);
 assert.notEqual(await p.locator('.pitch-editorial img').first().evaluate(e=>getComputedStyle(e).transform),beforeHover);
 report.motion.scrollTriggers=await p.evaluate(()=>ScrollTrigger.getAll().filter(t=>t.trigger?.matches('.pitch-editorial')).length);assert.equal(report.motion.scrollTriggers,2);
 for(const field of data.fields){const card=p.locator(`.pitch-editorial[href$="id=${field.id}"]`);assert.equal(await card.locator('h3').innerText(),field.name.toUpperCase());assert((await card.innerText()).includes(String(field.price)));report.links.push(await card.getAttribute('href'));}
 await p.emulateMedia({reducedMotion:'reduce'});
 for(const width of [1440,1024,768,390,320])for(const theme of ['light','dark']){
  await p.setViewportSize({width,height:900});await p.goto(base);await p.evaluate(theme=>KicksTheme.set(theme),theme);await p.evaluate(()=>document.fonts.ready);await p.locator('#fields').scrollIntoViewIfNeeded();await p.waitForTimeout(250);
  const layout=await p.locator('.pitch-editorial').evaluateAll(cards=>cards.map(c=>{const r=c.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,opacity:getComputedStyle(c).opacity}}));
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width>=768){assert.equal(layout[0].y,layout[1].y);assert(Math.abs(layout[0].height-layout[1].height)<2);assert(layout[0].width>layout[1].width);assert(layout[0].height<600,JSON.stringify(layout));}else assert(layout[1].y>layout[0].y+layout[0].height);
  assert(layout.every(c=>c.opacity==='1'));assert.equal(await p.evaluate(()=>localStorage.getItem('kicks-data-v2')),raw);
  await p.screenshot({path:`${out}/pitches-${width}-${theme}.png`});report.layouts.push({width,theme,cards:layout});
 }
 for(let i=0;i<2;i++){await p.goto(base);await p.locator('.pitch-editorial').nth(i).click();await p.waitForURL('**/Pages/Fields/field-details.html?id=*');assert.equal(await p.locator('#fieldName').innerText(),data.fields[i].name);}
 const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const t=await touch.newPage();t.on('pageerror',e=>errors.push(e.message));await t.goto(base);await t.waitForFunction(()=>window.KicksHeroHalftone?.inspect().renderer?.playerReady);assert((await t.evaluate(()=>KicksHeroHalftone.inspect())).renderer.touchPortrait);await t.screenshot({path:out+'/hero-touch.png'});await touch.close();
 // More records still use the existing home cap and valid IDs, with no fixed two-record template.
 await p.emulateMedia({reducedMotion:'reduce'});await p.addInitScript(d=>localStorage.setItem('kicks-data-v2',JSON.stringify(d)),catalogue);await p.goto(base);assert.equal(await p.locator('.pitch-editorial').count(),3);
 assert.deepEqual(errors,[]);report.errors=errors;fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2));
 await browser.close();console.log('PASS: one GPU renderer, reveal/conceal pixel hashes, hover, real ScrollTriggers, 10 responsive/theme layouts, source-record links, touch fallback, unchanged storage, future records and zero JS errors.');
})().catch(e=>{console.error(e);process.exit(1)});
