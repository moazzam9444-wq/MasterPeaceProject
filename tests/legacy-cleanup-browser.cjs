/* Real-page KICKS-012 coverage in disposable browser contexts, never a real profile. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');let browser;
(async()=>{
 const ctx={crypto:webcrypto,TextEncoder,Date,Intl,structuredClone,console};ctx.window=ctx;vm.createContext(ctx);for(const file of ['bracket-core','demo-catalogue'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),ctx);
 const fixture=await ctx.KicksDemoCatalogue.build();fixture.data.fields[0].demoBatch='kicks-demo-v1';delete fixture.data.bookings[0].demoBatch;const payment=fixture.data.payments.find(p=>p.collection==='bookings'&&p.recordId===fixture.data.bookings[0].id);delete payment.demoBatch;fixture.data.demoState={installed:true,customMetadata:'preserve this migration state'};
 const data=JSON.stringify(fixture.data,null,2),messages=JSON.stringify(fixture.messages,null,2);const report={routes:[],errors:[]};browser=await chromium.launch({channel:'msedge',headless:true});const c=await browser.newContext({reducedMotion:'reduce'}),page=await c.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await c.addInitScript(({data,messages})=>{
  if(localStorage.getItem('kicks-data-v2')===null){localStorage.setItem('kicks-data-v2',data);localStorage.setItem('kicks-messages-v1',messages);localStorage.setItem('kicks-full-preview','existing-marker');}
  sessionStorage.setItem('kicks-session-v2','200');window.auditStorageMutations=[];
  for(const method of ['setItem','removeItem','clear']){const native=Storage.prototype[method];Storage.prototype[method]=function(...args){window.auditStorageMutations.push({method,key:args[0]});return native.apply(this,args)};}
 },{data,messages});
 for(const base of ['http://127.0.0.1:4173/','http://127.0.0.1:5501/'])for(const route of ['index.html','Pages/Fields/field-details.html?id=1001','Pages/Dashboard/player.html#bookings','Pages/Demo/catalogue.html']){
  await page.goto(base+route);await page.waitForFunction(()=>Boolean(window.KicksStore));
  assert.equal(await page.evaluate(()=>localStorage.getItem('kicks-data-v2')),data,base+route+' changed records');
  assert.equal(await page.evaluate(()=>localStorage.getItem('kicks-messages-v1')),messages,base+route+' changed messages');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('kicks-session-v2')),'200');assert.deepEqual(await page.evaluate(()=>auditStorageMutations),[]);
  assert.equal(await page.evaluate(()=>KicksStore.find('bookings',5001).status),'Confirmed');assert(await page.evaluate(()=>KicksStore.list('payments').some(p=>p.collection==='bookings'&&p.recordId===5001)));
  if(!route.includes('Demo'))assert.match(await page.locator('script[src*="js/demo-data.js"]').getAttribute('src'),/preserve-legacy-3/);
  report.routes.push(base+route);console.log('PASS: preserved mixed legacy/user/current-demo data on '+base+route);
 }
 await page.reload();assert.equal(await page.evaluate(()=>localStorage.getItem('kicks-data-v2')),data);assert.deepEqual(report.errors,[]);fs.mkdirSync('.local/kicks-012-fix',{recursive:true});fs.writeFileSync('.local/kicks-012-fix/browser-report.json',JSON.stringify(report,null,2));await browser.close();console.log('PASS: KICKS-012 browser navigation/reload, exact-byte storage/session preservation, cache-busted script and no page errors.');
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
