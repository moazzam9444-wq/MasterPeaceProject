const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require(process.env.KICKS_PLAYWRIGHT_PATH||'C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),{login}=require('./helpers/browser-fixtures.cjs');let browser;
(async()=>{
 const base=process.env.KICKS_TEST_URL||'http://127.0.0.1:5502',out='.local/dashboard-messages-qa';fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(10000);
 const data=JSON.parse(fs.readFileSync('.local/data-audit/demo-fixture.json','utf8'));data.meetings=[{id:99001,tournamentId:3001,title:'Preserved legacy record',status:'Cancelled',organizerId:101,startsAt:'2020-01-01T12:00:00Z',duration:30}];
 await ctx.addInitScript(d=>{if(!localStorage.getItem('kicks-data-v2'))localStorage.setItem('kicks-data-v2',JSON.stringify(d));},data);await p.goto(base+'/index.html');
 for(const [role,id] of [['player',200],['owner',101],['admin',100]]){
  await login(p,`sample${id}@kicks.example.test`);await p.goto(base+'/Pages/Dashboard/'+role+'.html');await p.locator('.workspace-overview').waitFor();
  assert.equal(await p.locator('#dashNav a[href="#messages"]').count(),1);assert.equal(await p.locator('#dashNav a[href="#meetings"]').count(),0);assert.equal(await p.locator('.kx-workspace-overview').count(),0);
  const hashes=await p.locator('#dashNav a').evaluateAll(els=>els.map(e=>e.hash));
  for(const hash of hashes){await p.goto(base+'/Pages/Dashboard/'+role+'.html'+hash);await p.locator('#viewTitle').waitFor();assert(await p.locator('#dashboardView').innerText());assert.equal(await p.locator('[data-meeting-new],.meeting-card,iframe[src*="jit.si"]').count(),0);}
  for(const width of [1440,768,390,320]){await p.setViewportSize({width,height:1000});for(const theme of ['light','dark']){
   await p.goto(base+'/Pages/Dashboard/'+role+'.html#overview');await p.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);await p.evaluate(()=>document.fonts.ready);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),role+' '+width+' '+theme+' page overflow');
   if(width===1440)assert(await p.locator('.workspace-tables').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length===2));
   await p.screenshot({path:`${out}/${role}-${width}-${theme}.png`,fullPage:true});
  }}
  await p.setViewportSize({width:1440,height:1000});await p.goto(base+'/Pages/Dashboard/'+role+'.html#meetings');await p.waitForURL(u=>u.hash==='#messages');
  assert.equal(await p.locator('#messagesPanel').count(),1);assert.equal(await p.locator('[data-meeting-new]').count(),0);
 }
 await login(p,'sample200@kicks.example.test');await p.goto(base+'/Pages/Dashboard/player.html#messages');await p.locator('[data-message-person="100"]').click();await p.locator('#messageText').fill('Messages-only dashboard smoke test');await p.locator('#messageForm button[type=submit]').click();await p.waitForFunction(()=>KicksMessages.thread(100).some(m=>m.text==='Messages-only dashboard smoke test'));
 await p.goto(base+'/Pages/Meetings/meeting.html?id=99001');await p.waitForURL('**/Pages/Dashboard/player.html#messages');assert.equal(await p.locator('script[src*="meeting-room"],iframe[src*="jit.si"]').count(),0);
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('kicks-data-v2')));assert.deepEqual(saved.meetings,data.meetings);for(const k of ['bookings','payments','registrations','teams'])assert.deepEqual(saved[k],data[k]);
 assert.deepEqual(errors,[]);console.log('PASS: 3 roles/all dashboard tabs, messages-only navigation, legacy hash/room redirect, actual message sending, preserved records and 24 responsive/theme overview captures without overflow or JS errors.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
