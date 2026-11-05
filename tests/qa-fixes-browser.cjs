/* QA-02/03/04: isolated real-browser domain and administrator UI regressions. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {login}=require('./helpers/browser-fixtures.cjs');
const base=process.env.KICKS_TEST_URL||'http://127.0.0.1:4181';
let browser;
(async()=>{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext(),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(data=>{if(!localStorage.getItem('kicks-data-v2'))localStorage.setItem('kicks-data-v2',JSON.stringify(data));},JSON.parse(fs.readFileSync('.local/data-audit/demo-fixture.json','utf8')));
 await p.goto(base+'/index.html');await login(p,'sample100@kicks.example.test');
 const cups=await p.evaluate(async()=>{
   const common={date:'2100-01-15',time:'18:00',durationMinutes:180,capacity:8,teams:8,fee:20,prize:'QA',system:'Single elimination',level:'All levels'};
   const a=await KicksStore.save('tournaments',{...common,name:'QA first cup',fieldId:1001});
   const b=await KicksStore.save('tournaments',{...common,name:'QA overlap cup',fieldId:1002,durationMinutes:60});
   const c=await KicksStore.save('tournaments',{...common,name:'QA adjacent cup',fieldId:1002,time:'21:00',durationMinutes:60});
   return [a,b,c];
 });
 assert.equal(cups[0].teams,0);
 await login(p,'sample200@kicks.example.test');
 await p.evaluate(id=>KicksStore.join(200,'tournaments',id,{teamId:'sample-team-1',payment:{method:'Visa demo',amount:20}}),cups[0].id);
 const rejected=await p.evaluate(async id=>{
   const before=localStorage.getItem('kicks-data-v2'),messages=[];
   try{KicksStore.tournamentRoster(200,id,'sample-team-1');}catch(e){messages.push(e.message);}
   try{await KicksStore.join(200,'tournaments',id,{teamId:'sample-team-1',payment:{method:'Visa demo',amount:20}});}catch(e){messages.push(e.message);}
   return {messages,unchanged:before===localStorage.getItem('kicks-data-v2')};
 },cups[1].id);
 assert.equal(rejected.messages.length,2);assert(rejected.messages.every(s=>s.includes('overlapping')));assert(rejected.unchanged);
 await p.evaluate(id=>KicksStore.join(200,'tournaments',id,{teamId:'sample-team-1',payment:{method:'Visa demo',amount:20}}),cups[2].id);
 const conflict=await p.evaluate(async()=>{try{await KicksStore.challengeAction('create',{teamId:'sample-team-1',date:'2100-01-15',time:'20:00',city:'Amman',split:'Half each',fieldId:1002,price:24});return '';}catch(e){return e.message;}});
 assert.match(conflict,/match|overlap/);
 await login(p,'sample206@kicks.example.test');
 await p.evaluate(id=>KicksStore.join(206,'tournaments',id,{teamId:'sample-team-2',payment:{method:'Visa demo',amount:20}}),cups[2].id);
 await login(p,'sample100@kicks.example.test');
 await p.evaluate(async id=>{const old=KicksStore.find('tournaments',id);await KicksStore.save('tournaments',{...old,teams:8});},cups[0].id);
 assert.equal(await p.evaluate(id=>KicksStore.find('tournaments',id).teams,cups[0].id),1);
 await p.goto(base+'/Pages/Dashboard/admin.html#tournaments');
 await p.locator('[data-edit="tournaments"][data-id="'+cups[0].id+'"]').click();
 assert.equal(await p.locator('#edit-teams').count(),0);await p.locator('[data-close="editorDialog"]').first().click();
 await p.goto(base+'/Pages/Dashboard/admin.html#registrations');
 await p.locator('#tableSearch').fill('QA first cup');
 const entry=await p.evaluate(id=>KicksStore.list('registrations').find(r=>r.tournamentId===id),cups[0].id);
 await p.locator('[data-withdraw-registration="'+entry.id+'"]').click();await p.locator('#confirmAction').click();
 await p.waitForFunction(id=>KicksStore.find('registrations',id).status==='Withdrawn',entry.id);
 assert.equal(await p.evaluate(id=>KicksStore.list('payments').find(r=>r.collection==='registrations'&&r.recordId===id).status,entry.id),'Refunded (demo)');
 await p.evaluate(id=>KicksStore.tournamentBracket(id,'start'),cups[2].id);
 const locked=await p.evaluate(async id=>{const r=KicksStore.list('registrations').find(r=>r.tournamentId===id);try{await KicksStore.save('registrations',{...r,status:'Withdrawn'});return '';}catch(e){return e.message;}},cups[2].id);assert.match(locked,/locked/);
 await p.goto(base+'/Pages/Dashboard/admin.html#tournaments');
 await p.locator('[data-cancel-tournament="'+cups[2].id+'"]').click();await p.locator('#confirmAction').click();
 await p.waitForFunction(id=>KicksStore.find('tournaments',id).status==='Cancelled',cups[2].id);
 const history=await p.evaluate(id=>{const cup=KicksStore.find('tournaments',id),entries=KicksStore.list('registrations').filter(r=>r.tournamentId===id);return {cup,entries,receipts:KicksStore.list('payments').filter(p=>p.collection==='registrations'&&entries.some(r=>r.id===p.recordId)),public:KicksStore.publicActivities('tournaments').some(t=>t.id===id),slot:KicksStore.isFieldSlotAvailable(cup.fieldId,cup.date,cup.time)};},cups[2].id);
 assert.equal(history.cup.teams,0);assert(history.cup.bracket.started);assert(history.entries.every(r=>r.status==='Withdrawn'));assert.equal(history.receipts.length,2);assert(history.receipts.every(r=>r.status==='Refunded (demo)'));assert(!history.public);assert(history.slot);
 await p.goto(base+'/Pages/Tournaments/tournament-details.html?id='+cups[2].id);
 assert.equal(await p.locator('[data-bracket-action]').count(),0);assert.match(await p.locator('.bracket-status').innerText(),/Cancelled/);
 await login(p,'sample200@kicks.example.test');await p.goto(base+'/Pages/Tournaments/tournament-details.html?id='+cups[2].id);assert(await p.locator('#cupContent').isVisible());
 const failedCommit=await p.evaluate(async()=>{
   const before=localStorage.getItem('kicks-data-v2'),original=IDBDatabase.prototype.transaction;
   IDBDatabase.prototype.transaction=function(name,mode,...rest){if(mode==='readwrite')throw Error('Simulated database commit failure');return original.call(this,name,mode,...rest);};
   let message;try{await KicksStore.save('feedback',{name:'Must never commit'});}catch(e){message=e.message;}finally{IDBDatabase.prototype.transaction=original;}
   const unchanged=before===localStorage.getItem('kicks-data-v2');
   await KicksStore.save('feedback',{name:'Recovered after database failure'});
   return {unchanged,message,absent:!KicksStore.list('feedback').some(f=>f.name==='Must never commit')};
 });
 assert(failedCommit.unchanged && failedCommit.absent);assert.match(failedCommit.message,/storage commit failed/);
 assert(await p.evaluate(async()=>{
   const d=JSON.parse(localStorage.getItem('kicks-data-v2'));d._storageRevision++;d.feedback.push({id:999999,name:'Uncommitted mirror only'});localStorage.setItem('kicks-data-v2',JSON.stringify(d));
   await KicksStore.save('feedback',{name:'After interrupted mirror'});
   return !KicksStore.list('feedback').some(f=>f.id===999999);
 }));
 assert.deepEqual(errors,[]);
 console.log('PASS: team overlap rejected before checkout and at commit without payment; adjacent slots allowed; derived counts; real admin withdrawal/cancellation/refunds; locked draw and preserved participant history');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
