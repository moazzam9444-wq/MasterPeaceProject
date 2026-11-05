/* Real tabs, disposable accounts: message integrity and live activity checkout. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('C:/Users/USER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {login}=require('./helpers/browser-fixtures.cjs');
const base=process.env.KICKS_TEST_URL||'http://127.0.0.1:4183';let browser;
(async()=>{
 browser=await chromium.launch({channel:'msedge',headless:true});const c=await browser.newContext({reducedMotion:'reduce'});
 await c.addInitScript(d=>{if(!localStorage.getItem('kicks-data-v2'))localStorage.setItem('kicks-data-v2',JSON.stringify(d));},JSON.parse(fs.readFileSync('.local/data-audit/demo-fixture.json','utf8')));
 const a=await c.newPage(),b=await c.newPage(),errors=[];for(const [p,id]of [[a,100],[b,200]]){p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/index.html');await login(p,`sample${id}@kicks.example.test`);await p.goto(base+'/Pages/Dashboard/'+(id===100?'admin':'player')+'.html#messages');}
 const accepted=[];
 for(let i=0;i<100;i++){
   const rows=await Promise.all([a.evaluate(i=>KicksMessages.send(200,'Parallel administrator '+i),i),b.evaluate(i=>KicksMessages.send(100,'Parallel captain '+i),i)]);
   accepted.push(...rows.map(r=>r.id));
   if(i%10===0)await a.evaluate(()=>KicksMessages.markRead(200));
 }
 await a.evaluate(()=>KicksMessages.markRead(200));
 await b.waitForFunction(ids=>{const all=JSON.parse(localStorage.getItem('kicks-messages-v1')||'[]');return ids.every(id=>all.some(r=>r.id===id));},accepted);
 const messages=await a.evaluate(()=>JSON.parse(localStorage.getItem('kicks-messages-v1')));
 assert(accepted.every(id=>messages.some(r=>r.id===id)));assert(messages.filter(r=>r.recipientId===100).every(r=>r.read));
 const failure=await a.evaluate(async()=>{
   const raw=localStorage.getItem('kicks-messages-v1'),original=IDBDatabase.prototype.transaction;let error='';
   IDBDatabase.prototype.transaction=function(name,mode,...rest){if(mode==='readwrite')throw Error('Simulated message commit failure');return original.call(this,name,mode,...rest);};
   try{await KicksMessages.send(200,'Must never be acknowledged');}catch(e){error=e.message;}finally{IDBDatabase.prototype.transaction=original;}
   const unchanged=raw===localStorage.getItem('kicks-messages-v1');await KicksMessages.send(200,'Recovered message');return {error,unchanged};
 });assert(failure.unchanged);assert.match(failure.error,/could not be saved/);
 console.log('PASS: 100 two-tab send races preserve 200 messages and read receipts; failed database commit rolls back and recovers');
 const ids=await a.evaluate(async()=>{
   const cup=await KicksStore.save('tournaments',{name:'Live activity regression cup',fieldId:1001,date:'2100-02-01',time:'18:00',durationMinutes:180,capacity:2,fee:20,prize:'QA',system:'Single elimination',level:'All levels'});
   const game=await KicksStore.save('games',{title:'Live activity regression game',fieldId:1002,date:'2100-02-02',time:'18:00',durationMinutes:60,capacity:2,price:5,level:'All levels'});return {cup:cup.id,game:game.id};
 });
 const gameList=await c.newPage(),cupList=await c.newPage();
 for(const p of [gameList,cupList])p.on('pageerror',e=>errors.push(e.message));
 await gameList.goto(base+'/Pages/OpenGames/open-games.html');await cupList.goto(base+'/Pages/Tournaments/tournaments.html');
 await b.goto(base+'/Pages/Tournaments/tournament-details.html?id='+ids.cup);
 const ledger=await b.evaluate(()=>KicksStore.list('payments').length);
 await b.locator('#teamSubmit').click();await b.locator('.kicks-checkout[open]').waitFor();
 await a.evaluate(id=>KicksStore.save('tournaments',{...KicksStore.find('tournaments',id),fee:21}),ids.cup);
 await b.locator('.kicks-checkout').waitFor({state:'hidden'});assert.equal(await b.locator('#cupFee').innerText(),'21');assert.equal(await b.evaluate(()=>KicksStore.list('payments').length),ledger);
 await cupList.locator('[data-cup-id="'+ids.cup+'"]').filter({hasText:'21 JD'}).waitFor();
 await b.locator('#teamSubmit').click();await b.locator('.checkout-pay').click();await b.locator('#teamDialog').waitFor();await b.locator('#teamDialog').evaluate(d=>d.close());
 await a.evaluate(id=>KicksStore.join(206,'tournaments',id,{teamId:'sample-team-2',payment:{method:'Visa demo',amount:21}}),ids.cup);
 await b.waitForFunction(()=>document.getElementById('cupTeamCount').textContent.startsWith('2 / 2'));
 await a.evaluate(id=>KicksStore.tournamentBracket(id,'start'),ids.cup);
 await a.evaluate(id=>KicksStore.save('tournaments',{...KicksStore.find('tournaments',id),status:'Cancelled'}),ids.cup);
 await b.waitForFunction(()=>document.getElementById('cupAvailability').textContent==='Cancelled');
 assert(await b.locator('#cupContent').isVisible());assert(await b.locator('#teamSubmit').isDisabled());assert.match(await b.locator('.bracket-status').innerText(),/Cancelled/);
 await cupList.locator('[data-cup-id="'+ids.cup+'"]').waitFor({state:'detached'});
 console.log('PASS: tournament fee, counts, locked draw and cancellation refresh in an already-open participant tab; stale checkout closes without payment');
 await b.goto(base+'/Pages/OpenGames/game-details.html?id='+ids.game);await b.locator('[name=playingPosition][value=Forward]').check();await b.locator('#previewJoin').click();await b.locator('.kicks-checkout[open]').waitFor();
 await a.evaluate(id=>KicksStore.save('games',{...KicksStore.find('games',id),price:6}),ids.game);
 await b.locator('.kicks-checkout').waitFor({state:'hidden'});assert.equal(await b.locator('#gamePrice').innerText(),'6');
 await a.evaluate(id=>KicksStore.join(260,'games',id,{position:'Forward',payment:{method:'Visa demo',amount:6}}),ids.game);
 await b.waitForFunction(()=>document.getElementById('joinPlayers').textContent.startsWith('1 / 2'));
 await gameList.locator('.match-card').filter({hasText:'Live activity regression game'}).locator('progress[value="1"]').waitFor();
 await b.locator('#previewJoin').click();await b.locator('.kicks-checkout[open]').waitFor();
 await a.evaluate(id=>KicksStore.join(261,'games',id,{position:'Defender',payment:{method:'Visa demo',amount:6}}),ids.game);
 await b.locator('.kicks-checkout').waitFor({state:'hidden'});assert(await b.locator('#previewJoin').isDisabled());
 assert.equal(await b.evaluate(id=>KicksStore.list('memberships').filter(r=>r.userId===200&&r.gameId===id).length,ids.game),0);
 await a.evaluate(async id=>{const r=KicksStore.list('memberships').find(r=>r.gameId===id&&r.userId===261);await KicksStore.save('memberships',{...r,status:'Left'});},ids.game);
 await b.locator('#previewJoin').waitFor();await b.waitForFunction(()=>!document.getElementById('previewJoin').disabled);
 await b.locator('#previewJoin').click();await b.locator('.checkout-pay').click();await b.locator('#joinDialog').waitFor();
 assert.match(await b.locator('#joinStatus').innerText(),/Forward/);assert(await b.locator('#previewJoin').isDisabled());assert.deepEqual(errors,[]);
 console.log('PASS: game price, live capacity, last-slot checkout cancellation, refund/reopening and actual successful join remain consistent');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>browser?.close());
