async function settleWrite(page, action) { const result = await action(); await page.evaluate(() => window.KicksStore?.coordinate ? KicksStore.coordinate(() => null) : null); return result; }
(async () => {
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(process.env.KICKS_PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];await page.addInitScript(()=>{window.KICKS_DEMO_AUTOLOAD=false;});page.on('pageerror',e=>errors.push(e.message));
 const go=route=>page.goto('http://127.0.0.1:4173/'+route,{waitUntil:'domcontentloaded'});
 await go('Pages/Teams/teams.html');
 const ids=await page.evaluate(()=>{
  const d=JSON.parse(localStorage.getItem('kicks-data-v2')||JSON.stringify({fields:[],games:[],tournaments:[],users:[window.KicksAdminAccount],bookings:[],memberships:[],registrations:[],settings:{}}));
  d.users.push({id:101,name:'Captain',role:'player',status:'Active'},{id:102,name:'Member',role:'player',status:'Active'},{id:103,name:'Owner',role:'owner',status:'Active'},{id:104,name:'Outsider',role:'player',status:'Active'},{id:105,name:'Other owner',role:'owner',status:'Active'});
  d.teams=[{id:'qa',name:'Khalda United',captainId:101,city:'Amman',area:'Khalda',level:'Competitive',format:'5v5',color:'forest',initials:'KU',logo:'',positions:[],bio:'A competitive local squad.',schedule:'Friday',capacity:12,open:true,createdAt:new Date().toISOString(),members:[{userId:101,position:'Forward'},{userId:102,position:'Defender'}]}];
  d.fields=[{id:1,name:'Matchday Arena',ownerId:103,city:'Amman',area:'Khalda',type:'5v5',image:1,price:20}];
  d.tournaments=[{id:1,name:'Amman Championship',fieldId:1,date:'2100-01-01',time:'18:00',durationMinutes:180,teams:5,capacity:8,fee:0,prize:'The Golden Cup',system:'Single elimination',level:'Competitive'}];
  d.registrations=Array.from({length:5},(_,i)=>({id:i+1,tournamentId:1,userId:101,roster:[{userId:101,name:'Captain'},{userId:102,name:'Member'}],teamName:['Khalda United','Amman Falcons','Irbid City','Zarqa Athletic','Salt Rovers'][i],status:'Registered'}));
  localStorage.setItem('kicks-data-v2',JSON.stringify(d));sessionStorage.setItem('kicks-session-v2','102');return {};
 });
 await go('Pages/Teams/teams.html?team=qa');await settleWrite(page,()=>page.locator('[data-detail-tab=roster]').click());await settleWrite(page,()=>page.locator('[data-leave]').click());assert.match(await page.locator('#confirm-message').innerText(),/remain/);await settleWrite(page,()=>page.locator('#confirm-action').click());
 assert.equal(await page.evaluate(()=>KicksStore.list('teams')[0].members.length),2);
 await page.evaluate(()=>sessionStorage.setItem('kicks-session-v2','101'));await go('Pages/Teams/teams.html?team=qa');await settleWrite(page,()=>page.locator('#detail-requests').click());assert.match(await page.locator('#detail-panel').innerText(),/LEAVE REQUEST/);await settleWrite(page,()=>page.locator('[data-accept]').click());assert.equal(await page.evaluate(()=>KicksStore.list('teams')[0].members.length),1);
 await page.evaluate(()=>sessionStorage.setItem('kicks-session-v2','103'));await go('Pages/Dashboard/owner.html#tournaments');await settleWrite(page,()=>page.getByRole('link',{name:'Details & bracket'}).click());await page.locator('#tournamentBracket').waitFor();assert.equal(await page.locator('.bracket-round').count(),3);
 await settleWrite(page,()=>page.locator('[data-bracket-action=shuffle]').click());await Promise.all([page.waitForEvent('load'),page.locator('[data-bracket-action=start]').click()]);await page.locator('[draggable=true]').first().waitFor();await page.evaluate(()=>document.fonts.ready);
 let team=page.locator('[data-drag-match="0:0"]').first();const chosen=Number(await team.getAttribute('data-drag-entry'));
 await team.scrollIntoViewIfNeeded();await settleWrite(page,()=>team.dragTo(page.locator('.bracket-drop[data-drop-match="0:0"]'),{sourcePosition:{x:25,y:20}}));
 assert.equal(await page.evaluate(()=>KicksStore.tournamentBracket(1).rounds[0][0].winner),chosen);
 await page.reload();assert.equal(await page.evaluate(()=>KicksStore.tournamentBracket(1).rounds[0][0].winner),chosen);
 for(let r=0;r<3;r++){
  const matches=await page.evaluate(r=>KicksStore.tournamentBracket(1).rounds[r].filter(m=>!m.bye&&!m.winner).map(m=>m.key),r);
  for(const key of matches)await settleWrite(page,()=>page.locator(`[data-match="${key}"][data-advance]`).first().click());
 }
 await page.locator('.bracket-status').filter({hasText:/Champion/}).waitFor();assert.match(await page.locator('.bracket-status').innerText(),/Champion/);
 const out=process.env.KICKS_QA_OUTPUT||path.join(require('node:os').tmpdir(),'kicks-bracket-qa');fs.mkdirSync(out,{recursive:true});
 await page.locator('#tournamentBracket').screenshot({style:'.navbar,.kicks-assistant-launcher{visibility:hidden}',path:path.join(out,'bracket-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.locator('#tournamentBracket').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'bracket-mobile.png')});
 await page.evaluate(()=>sessionStorage.setItem('kicks-session-v2','102'));await go('Pages/Tournaments/tournament-details.html?id=1');assert.equal(await page.locator('[data-advance]').count(),0);assert.equal(await page.locator('[data-bracket-action]').count(),0);
 assert.equal(await page.locator('#tournamentBracket').isVisible(),true);
 await go('Pages/Dashboard/player.html#registrations');await settleWrite(page,()=>page.locator('a[href="../Tournaments/tournament-details.html?id=1"]').first().click());assert.equal(await page.locator('#tournamentBracket').isVisible(),true);
 await page.evaluate(()=>sessionStorage.setItem('kicks-session-v2','1'));await go('Pages/Tournaments/tournament-details.html?id=1');
 assert.equal(await page.locator('#tournamentBracket').isVisible(),true);
 assert.equal(await page.evaluate(()=>KicksStore.tournamentAccess(1).manage),true);
 for(const account of ['104','105','']){
   await page.evaluate(id=>id?sessionStorage.setItem('kicks-session-v2',id):sessionStorage.removeItem('kicks-session-v2'),account);
   await go('Pages/Tournaments/tournament-details.html?id=1');
   assert.equal(await page.locator('#tournamentBracket').isVisible(),false);
   assert.equal(await page.locator('.bracket-tree').count(),0);
   assert.equal(await page.locator('#registeredTeamList').innerHTML(),'');
   assert.equal(await page.evaluate(()=>{try{KicksStore.tournamentBracket(1);return false}catch{return true}}),true);
 }

 assert.deepEqual(errors,[]);console.log('PASS: leave approval UI, owner dashboard link, five-team draw, actual drag/drop, progression, reload, read-only players and mobile layout. Screenshots: '+out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});


})().catch(error => { console.error(error); process.exitCode = 1; });
