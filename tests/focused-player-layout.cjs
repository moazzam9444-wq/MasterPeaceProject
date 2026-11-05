/* Read-only visual regression of every existing Player hash view. Disposable browser context. */
const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='.local/focused-refinement/player-tabs',base=process.env.KICKS_VISUAL_BASE||'http://127.0.0.1:4181/';fs.mkdirSync(out,{recursive:true});
let browser;const report={views:[],errors:[],issues:[],accessibility:[]};
(async()=>{
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({reducedMotion:'reduce'}),raw=fs.readFileSync('.local/data-audit/demo-fixture.json','utf8');
 await context.addInitScript(raw=>{if(!localStorage.getItem('kicks-data-v2'))localStorage.setItem('kicks-data-v2',raw);sessionStorage.setItem('kicks-session-v2','200')},raw);await context.route(/https:\/\/fonts\./,r=>r.abort());
 const p=await context.newPage();p.setDefaultTimeout(12000);p.setDefaultNavigationTimeout(60000);p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(base+'Pages/Dashboard/player.html',{waitUntil:'domcontentloaded'});const links=await p.locator('#dashNav a').evaluateAll(as=>as.map(a=>a.hash));assert.equal(links.length,6);
 for(const hash of links)for(const width of [1440,1024,768,390,320])for(const theme of ['light','dark']){
  await p.setViewportSize({width,height:width<500?844:900});await p.goto(base+'Pages/Dashboard/player.html'+hash,{waitUntil:'domcontentloaded'});await p.evaluate(t=>KicksTheme.set(t),theme);await p.waitForFunction(hash=>document.querySelector('#dashNav a[aria-current]')?.getAttribute('href')===hash,hash);await p.evaluate(()=>document.fonts.ready);await p.locator('#dashboardView').waitFor();await p.evaluate(()=>scrollTo(0,0));
  const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)report.issues.push({hash,width,theme,issue:'document overflow'});
  await p.screenshot({path:out+'/'+hash.slice(1)+'-'+width+'-'+theme+'.png'});report.views.push({hash,width,theme,overflow});
  if(hash==='#profile'&&[1440,320].includes(width)){
   await p.locator('#editProfile').click();await p.locator('#personal-name').waitFor();if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))report.issues.push({hash,width,theme,issue:'profile editor overflow'});await p.screenshot({path:out+'/edit-profile-'+width+'-'+theme+'.png'});await p.locator('#cancelProfileEdit').click();await p.locator('#editProfile').waitFor();
  }
  if(['#overview','#bookings','#profile'].includes(hash)&&[1440,320].includes(width)&&fs.existsSync('.local/design-qa/axe.min.js')){
   await p.addScriptTag({path:'.local/design-qa/axe.min.js'});const violations=await p.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});report.accessibility.push({hash,width,theme,violations});
  }
  assert.equal(await p.evaluate(()=>localStorage.getItem('kicks-data-v2')),raw);fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
 }assert.deepEqual(report.errors,[]);assert.deepEqual(report.issues,[]);assert.deepEqual(report.accessibility.flatMap(v=>v.violations),[]);console.log('PASS: All six Player tabs at five widths/both themes; profile edit/cancel, accessibility and unchanged data');await browser.close();
})().catch(async e=>{report.failure=e.stack;fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.error(e);if(browser)await browser.close();process.exitCode=1});
