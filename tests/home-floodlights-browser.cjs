(async () => {
/* Isolated browser QA. No existing browser profile or real catalogue is opened. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let playwright;
try{playwright=require(process.env.KICKS_PLAYWRIGHT_PATH||'playwright');}
catch(error){if(process.env.KICKS_PLAYWRIGHT_PATH)throw error;playwright=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}
const base=process.env.KICKS_TEST_URL||'http://127.0.0.1:4173';
const output=process.env.KICKS_QA_OUTPUT||'.local/opendesign-integration/qa';
fs.mkdirSync(output,{recursive:true});
const report={checks:[],errors:[],screenshots:[],accessibility:[]};
const pass=text=>{report.checks.push(text);console.log('PASS: '+text);};
let browser;
(async()=>{
  browser=await playwright.chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({reducedMotion:'reduce',timezoneId:'Asia/Amman'});
await require('./helpers/browser-fixtures.cjs').prepare(context);  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',error=>report.errors.push(error.message));
  const broken=[];page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)broken.push(response.status()+' '+response.url());});
  await page.goto(base+'/index.html');await page.evaluate(()=>document.fonts.ready);
  assert.match(await page.locator('h1').innerText(),/Book\.\s*Play\.\s*Connect\./i);
  assert.equal(await page.evaluate(()=>KicksStore.list('fields').length),0);
  assert.match(await page.locator('.empty-fields-copy').innerText(),/No fields published yet/);
  assert.equal(await page.locator('.fl-game-row').count(),0);
  pass('Empty catalogue stays empty; honest field, game and tournament states');

  await require('./helpers/browser-fixtures.cjs').asAdmin(page,async ()=>{
    for(const [i,city] of ['Amman','Irbid','Amman'].entries())(await KicksStore.save('fields',{name:['Nightfall Arena','Northside Football','Capital Five'][i],city,area:'Test district',ownerId:1,type:'5v5',price:25+i*5,image:i+1,today:true,now:true,rating:4.5,amenities:'Parking,Floodlights'}));
    const fields=KicksStore.list('fields');
    (await KicksStore.save('games',{title:'Friday Night Football',fieldId:fields[0].id,date:'2100-01-05',time:'20:00',durationMinutes:60,capacity:10,joined:7,price:5}));
    (await KicksStore.save('tournaments',{name:'Under the Lights Cup',fieldId:fields[0].id,date:'2100-01-07',time:'17:00',durationMinutes:180,capacity:8,teams:4,fee:60}));
  });
  await page.reload();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.fl-field-card').count(),3);assert.equal(await page.locator('.fl-game-row').count(),1);assert.equal(await page.locator('.fl-cup-row').count(),1);
  assert.match(await page.locator('.fl-game-row').innerText(),/10 spots left/i); // Counts come from entries, not seeded display numbers.
  const catalogueBefore=await page.evaluate(()=>localStorage.getItem('kicks-data-v2'));
  await page.locator('#homeLocation').selectOption('Irbid');await page.locator('#homeSearch button').click();
  assert.equal(await page.locator('.fl-field-card').count(),1);await page.locator('#homeSearchStatus').filter({hasText:/1 field matches.*Irbid/}).waitFor();assert.match(await page.locator('#homeSearchStatus').innerText(),/1 field matches.*Irbid/);
  await page.locator('#homeSearchReset').click();assert.equal(await page.locator('.fl-field-card').count(),3);
  assert.equal(await page.evaluate(()=>localStorage.getItem('kicks-data-v2')),catalogueBefore);
  pass('Real catalogue rendering, location search and reset are read-only');

  await require('./helpers/browser-fixtures.cjs').asAdmin(page,async ()=>{const player=await KicksStore.save('users',{name:'Availability fixture',email:'availability@example.test',role:'player',status:'Active'});await KicksStore.save('bookings',{fieldId:KicksStore.list('fields')[0].id,date:'2100-01-05',time:'18:00',status:'Confirmed',price:25,userId:player.id});});
  await page.locator('#homeLocation').selectOption('Amman');await page.locator('#homeTime').selectOption('18:00');
  assert.equal(await page.locator('#homeDate').getAttribute('required'),'');
  assert.equal(await page.locator('#homeSearch').evaluate(f=>f.checkValidity()),false);
  await page.locator('#homeDate').fill('2100-01-05');await page.locator('#homeSearch button').click();
  assert.equal(await page.locator('.fl-field-card').count(),1);assert.match(await page.locator('.fl-field-card').innerText(),/Capital Five/i);
  await page.locator('#homeSearchReset').click();pass('Search validates date and excludes a confirmed hourly booking');

  const fieldHref=await page.locator('.fl-field-card').first().getAttribute('href');
  await page.goto(base+'/'+fieldHref);await page.locator('#fieldContent').waitFor({state:'visible'});
  assert.match(await page.locator('#fieldName').innerText(),/Nightfall Arena/);
  await require('./helpers/browser-fixtures.cjs').admin(page);await page.goto(base+'/index.html');
  await page.locator('#avatarMenuButton').click();await page.locator('#avatarMenu').waitFor({state:'visible'});
  assert.match(await page.locator('#avatarMenu a').last().getAttribute('href'),/Dashboard\/admin.html/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#avatarMenu').isVisible(),false);
  await page.setViewportSize({width:390,height:844});await page.locator('#menu-toggle').click();
  await page.locator('#avatarMenuButton').click();await page.locator('#avatarMenu').waitFor({state:'visible'});
  assert.equal(await page.locator('#avatarMenu a').count(),2);
  assert.equal(await page.locator('#mobile-menu a[href*="Auth/login.html"]').count(),0);
  await page.locator('#logoutAccount').click();await page.waitForURL('**/index.html');await page.locator('#navbarAccount .account-login').waitFor({state:'attached'});
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('kicks-session-v2')),null);
  pass('Mobile account navigation and existing logout function preserve authentication behavior');
  pass('Field detail route and existing account menu/dashboard integration');

  for(const width of [320,390,600,768,900,1024,1199,1200,1440,1920]){
    await page.setViewportSize({width,height:width<600?844:1000});await page.goto(base+'/index.html');await page.evaluate(()=>document.fonts.ready);
    const dimensions=await page.evaluate(()=>({view:innerWidth,doc:document.documentElement.scrollWidth}));assert(dimensions.doc<=dimensions.view+1,JSON.stringify(dimensions));
    assert.equal(await page.locator('.kickoff-card:visible').count(),3);
    if(width===390||width===1440){const filename=`home-${width}-reduced.png`;await page.screenshot({path:path.join(output,filename)});report.screenshots.push(filename);}
  }
  pass('Ten widths from 320 to 1920px: no horizontal overflow; reduced-motion story stays complete');
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/index.html');
  await page.locator('#menu-toggle').click();assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'true');
  await page.locator('#mobile-menu').waitFor({state:'visible'});await page.keyboard.press('Escape');assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'false');
  assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('#menu-toggle')),true);
  await page.locator('.kicks-assistant-launcher').click();await page.locator('#kicksChat').waitFor({state:'visible'});await page.keyboard.press('Escape');
  await page.locator('.faq-list summary').first().click();assert.equal(await page.locator('.faq-list details').first().getAttribute('open'),'');
  pass('Mobile menu, Escape/focus restoration, local search assistant and native FAQ');

  const axePath='.local/design-qa/axe.min.js';
  if(fs.existsSync(axePath)){
    for(const width of [390,1440]){await page.setViewportSize({width,height:1000});await page.goto(base+'/index.html');await page.evaluate(()=>document.fonts.ready);await page.addScriptTag({path:axePath});const violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});report.accessibility.push({width,violations});assert.deepEqual(violations,[],JSON.stringify(violations));}
    pass('Axe WCAG A/AA checks at mobile and desktop widths');
  }
  const fallback=await browser.newContext({reducedMotion:'no-preference',viewport:{width:1440,height:1000}});
  await fallback.route('**/assets/opendesign-football/js/vendor/**',route=>route.abort());
  const f=await fallback.newPage();f.on('pageerror',error=>report.errors.push(error.message));await f.goto(base+'/index.html');
  assert.equal(await f.locator('.kickoff-card:visible').count(),3);assert.equal(await f.locator('#homeTitle').isVisible(),true);
  await f.locator('#homeSearch button').click();await f.locator('#homeSearchStatus').filter({hasText:/0 fields match/}).waitFor();assert.match(await f.locator('#homeSearchStatus').innerText(),/0 fields match/);await fallback.close();
  pass('Blocked animation dependencies preserve content, search and natural document flow');

  const motion=await browser.newContext({reducedMotion:'no-preference',viewport:{width:1440,height:1000}}),m=await motion.newPage();
  await m.addInitScript(()=>{window.kicksMetrics={cls:0,lcp:0};new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.kicksMetrics.cls+=entry.value;}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{for(const entry of list.getEntries())window.kicksMetrics.lcp=entry.startTime;}).observe({type:'largest-contentful-paint',buffered:true});});
  m.on('pageerror',error=>report.errors.push(error.message));await m.goto(base+'/index.html');await m.evaluate(()=>document.fonts.ready);await m.waitForTimeout(1400);
  assert.equal(await m.evaluate(()=>Boolean(ScrollTrigger.getAll().find(t=>t.vars.id==='kicks-story'))),false);assert.equal(await m.evaluate(()=>document.documentElement.classList.contains('lenis')),true);
  await m.screenshot({path:path.join(output,'home-1440-motion.png')});report.screenshots.push('home-1440-motion.png');
  report.localPerformance=await m.evaluate(()=>({...window.kicksMetrics,resourceBytes:performance.getEntriesByType('resource').reduce((sum,r)=>sum+r.transferSize,0),externalRequests:performance.getEntriesByType('resource').filter(r=>new URL(r.name).origin!==location.origin).map(r=>r.name)}));
  assert.deepEqual(report.localPerformance.externalRequests,[]);assert(report.localPerformance.cls<.1,JSON.stringify(report.localPerformance));
  for(const index of [0,1,2]){await m.evaluate(i=>{const card=document.querySelectorAll('.kickoff-card')[i];window.scrollTo(0,card.getBoundingClientRect().top+scrollY-parseFloat(getComputedStyle(card).top));},index);await m.waitForTimeout(1100);assert.equal(await m.locator('.kickoff-card:visible').count(),3);}
  await m.emulateMedia({reducedMotion:'reduce'});await m.waitForTimeout(200);assert.equal(await m.locator('.flow.is-pinned').count(),0);assert.equal(await m.locator('.kickoff-card:visible').count(),3);assert.equal(await m.evaluate(()=>Boolean(ScrollTrigger.getAll().find(t=>t.vars.id==='kicks-story'))),false);
  pass('GSAP/Lenis active; native kickoff stack reveals; live reduced-motion cleanup restores normal flow');
  await motion.close();
  const touch=await browser.newContext({viewport:{width:1024,height:768},isMobile:true,hasTouch:true,reducedMotion:'no-preference'}),t=await touch.newPage();
  await t.goto(base+'/index.html');await t.evaluate(()=>document.fonts.ready);assert.equal(await t.locator('.flow.is-pinned').count(),0);assert.equal(await t.evaluate(()=>document.documentElement.classList.contains('lenis')),false);await touch.close();
  pass('Touch tablet retains native scrolling and unpinned storytelling; homepage makes no external requests');
  await page.goto(base+'/index.html');
  const refs=await page.locator('[href],[src]').evaluateAll(nodes=>nodes.flatMap(el=>['href','src'].map(attr=>el.getAttribute(attr)).filter(Boolean)).filter(url=>!url.startsWith('#')&&!/^(https?:|data:|mailto:|tel:)/.test(url)));
  for(const url of refs){const file=url.split(/[?#]/)[0];assert(fs.existsSync(path.resolve(file)),url);}
  const badImages=await page.locator('img').evaluateAll(images=>images.filter(img=>img.complete&&!img.naturalWidth).map(img=>img.src));assert.deepEqual(badImages,[]);assert.deepEqual(broken,[]);assert.deepEqual(report.errors,[]);
  pass('All homepage local references resolve; no page errors or failed local resources');
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:1000});await page.goto(base+'/index.html');await page.evaluate(()=>document.fonts.ready);
    for(const [name,selector] of [['fields','.venues'],['games','.people'],['tournaments','.tournaments'],['finale','.closing']]){const filename=`${name}-${width}-fixture.png`;const section=page.locator(selector);await section.scrollIntoViewIfNeeded();await section.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));await section.screenshot({path:path.join(output,filename)});report.screenshots.push(filename);}
  }
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:1000});
    for(const [name,route] of [['fields','Pages/Fields/fields.html'],['teams','Pages/Teams/teams.html'],['challenges','Pages/Challenges/challenges.html'],['login','Pages/Auth/login.html'],['admin','Pages/Dashboard/admin.html']]){
      await page.goto(base+'/'+route);await page.evaluate(()=>document.fonts.ready);
      if(name==='admin'){await page.evaluate(()=>sessionStorage.setItem('kicks-session-v2','1'));await page.goto(base+'/'+route);await page.locator('#dashboardMain').waitFor({state:'visible'});}
      const filename=`inner-${name}-${width}.png`;await page.screenshot({path:path.join(output,filename)});report.screenshots.push(filename);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Inner overflow: '+name+' '+width);
    }
  }
  pass('Inner fields, teams, challenges, authentication and admin dashboard: responsive screenshots captured');
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  await browser.close();
})().catch(async error=>{report.failure=String(error.stack||error);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.error(error);if(browser)await browser.close();process.exitCode=1;});

})().catch(error => { console.error(error); process.exitCode = 1; });
