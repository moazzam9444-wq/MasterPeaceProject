/* Visual-only QA. Fictional existing seed catalogue; isolated Edge profile. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const phase=process.argv[2]||'after',category=process.argv[3],base=process.env.KICKS_VISUAL_BASE||'http://127.0.0.1:4173/';const out='.local/visual-editorial/'+phase;fs.mkdirSync(out,{recursive:true});
const routes=[
 ['home','index.html','.venues',200,'remaining'],
 ['home-clubs','index.html','.ed-teams',200,'remaining'],
 ['fields','Pages/Fields/fields.html','.catalog-intro',200,'fields'],
 ['field-detail','Pages/Fields/field-details.html?id=1001','#fieldContent',200,'fields'],
 ['games','Pages/OpenGames/open-games.html','.catalog-intro',200,'games'],
 ['game-detail','Pages/OpenGames/game-details.html?id=2001','#gameDetailContent',200,'games'],
 ['teams','Pages/Teams/teams.html','.section-heading',200,'teams'],
 ['team-detail','Pages/Teams/teams.html?team=sample-team-1','#team-dialog',200,'teams'],
 ['team-roster','Pages/Teams/teams.html?team=sample-team-1','#team-dialog',200,'teams'],
 ['tournaments','Pages/Tournaments/tournaments.html','.cups-section',200,'tournaments'],
 ['tournament-detail','Pages/Tournaments/tournament-details.html?id=3001','#cupContent',200,'tournaments'],
 ['bracket','Pages/Tournaments/tournament-details.html?id=3004','#tournamentBracket',200,'tournaments'],
 ['challenges','Pages/Challenges/challenges.html','.section-heading',200,'remaining'],
 ['challenge-detail','Pages/Challenges/challenges.html?id=9001','#challenge-dialog',200,'remaining'],
 ['player','Pages/Dashboard/player.html','#dashboardView',200,'remaining'],
 ['owner','Pages/Dashboard/owner.html','#dashboardView',101,'remaining'],
 ['admin','Pages/Dashboard/admin.html','#dashboardView',100,'remaining'],
 ['meetings','Pages/Dashboard/owner.html#meetings','#meetingBoard',101,'remaining'],
 ['profile','Pages/Dashboard/player.html#profile','#dashboardView',200,'remaining'],
 ['booking-history','Pages/Dashboard/player.html#bookings','#dashboardView',200,'remaining'],
 ['about','Pages/About/about.html','.about-values',200,'remaining'],
 ['contact','Pages/Contact/contact.html','.founder-card',200,'remaining'],
 ['meeting-detail','Pages/Meetings/meeting.html?id=10001','.meeting-main',200,'remaining']
];let browser;const report=(phase==='before'||category)&&fs.existsSync(out+'/report.json')?JSON.parse(fs.readFileSync(out+'/report.json','utf8')):{phase,screenshots:[],checks:[],errors:[],issues:[]};delete report.failure;
(async()=>{const ctx={crypto:webcrypto,TextEncoder,Date,Intl,structuredClone,console};ctx.window=ctx;vm.createContext(ctx);for(const f of ['bracket-core','demo-catalogue'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),ctx);const fixture=await ctx.KicksDemoCatalogue.build();const baseline=JSON.stringify(fixture.data);
 browser=await chromium.launch({channel:'msedge',headless:true});const c=await browser.newContext({reducedMotion:'reduce'});await c.addInitScript(data=>{if(!localStorage.getItem('kicks-data-v2'))localStorage.setItem('kicks-data-v2',data);},baseline);
 await c.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort());
 const cache=new Map();await c.route('https://cdn.jsdelivr.net/**',async r=>{const u=r.request().url();try{if(!cache.has(u)){const res=await c.request.get(u,{timeout:8000});cache.set(u,{status:res.status(),headers:res.headers(),body:await res.body()});}await r.fulfill(cache.get(u));}catch{cache.set(u,{status:200,body:''});await r.abort();}});
 const p=await c.newPage();p.setDefaultTimeout(12000);p.setDefaultNavigationTimeout(40000);p.on('pageerror',e=>report.errors.push({url:p.url(),message:e.message,stack:e.stack}));
 for(const [name,route,selector,actor,group]of routes.filter(x=>(!category||x[4]===category||x[0]===category)&&(phase!=='before'||!['home-clubs','team-roster','booking-history','about','contact'].includes(x[0])))){
  const variants=phase==='before'?[[1440,'light'],[390,'light'],[1440,'dark'],[390,'dark']]:[[1440,'light'],[390,'light'],[1440,'dark'],[390,'dark'],[820,'light'],[820,'dark']];
  for(const [width,theme]of variants){if(phase==='before'&&fs.existsSync(out+'/'+name+'-'+width+'-'+theme+'.png'))continue;await p.setViewportSize({width,height:width===390?844:1040});await p.goto(new URL('index.html',base).href,{waitUntil:'domcontentloaded'});await p.evaluate(({theme,actor})=>{localStorage.setItem('kicks-theme',theme);sessionStorage.setItem('kicks-session-v2',String(actor));},{theme,actor});await p.goto(new URL(route,base).href,{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.fonts.ready);await p.locator(selector).first().waitFor({state:'visible'});if(name==='team-roster')await p.locator('#detail-roster').click();await p.locator(selector).first().evaluate(el=>{if(el.closest('dialog'))return;scrollTo(0,Math.max(0,el.getBoundingClientRect().top+scrollY-112));});
   await p.evaluate(()=>Promise.all([...document.images].filter(i=>!i.complete).map(i=>Promise.race([new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true});}),new Promise(r=>setTimeout(r,1800))]))));
   const measure=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,broken:[...document.images].filter(i=>i.getBoundingClientRect().width>0&&i.complete&&i.naturalWidth===0).map(i=>i.src),theme:document.documentElement.dataset.theme,fonts:document.fonts.check('700 16px KicksDisplay')}));
   const filename=name+'-'+width+'-'+theme+'.png';await p.screenshot({path:out+'/'+filename});if(!report.screenshots.includes(filename))report.screenshots.push(filename);if(measure.overflow)report.issues.push({name,width,theme,issue:'horizontal overflow'});if(measure.broken.length)report.issues.push({name,width,theme,issue:'broken images',images:measure.broken});assert.equal(measure.theme,theme);assert.equal(await p.evaluate(()=>localStorage.getItem('kicks-data-v2')),baseline,'Visual browsing changed catalogue');
  }
  console.log('CAPTURED '+phase+' '+name);if(!report.checks.includes(name))report.checks.push(name);fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
 }
 if(phase!=='before'){assert.deepEqual(report.issues,[]);assert.deepEqual(report.errors,[]);}await browser.close();
})().catch(async e=>{report.failure=e.stack;fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.error(e);if(browser)await browser.close();process.exitCode=1});
