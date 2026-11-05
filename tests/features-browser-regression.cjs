async function settleWrite(page, action) { const result = await action(); await page.evaluate(() => window.KicksStore?.coordinate ? KicksStore.coordinate(() => null) : null); return result; }
(async () => {
// Isolated end-to-end checks; never touches an existing browser profile.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(process.env.KICKS_PLAYWRIGHT_PATH || 'playwright');
let browser;
(async()=>{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({timezoneId:'Asia/Amman',reducedMotion:'reduce',geolocation:{latitude:31.992,longitude:35.84},permissions:['geolocation']});
await require('./helpers/browser-fixtures.cjs').prepare(context); const page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];await page.addInitScript(()=>{window.KICKS_DEMO_AUTOLOAD=false;});page.on('pageerror',e=>errors.push(e.message));
 const go=async route=>{await page.goto('http://127.0.0.1:4173/'+route);await page.waitForLoadState('domcontentloaded');};
 const snap=async name=>{const dir=process.env.KICKS_QA_OUTPUT;if(dir){fs.mkdirSync(dir,{recursive:true});await page.screenshot({path:path.join(dir,name+'.png'),fullPage:false});}};
 await go('Pages/Auth/register.html');await page.waitForFunction(()=>!document.querySelector('#authForm').inert&&!document.querySelector('.auth-panel').dataset.turning);
 await page.locator('#fullName').fill('Audit Player');await page.locator('#email').fill('auditplayer@test.local');await page.locator('#password').fill('Auditpass123!');await page.locator('#confirmPassword').fill('Auditpass123!');await settleWrite(page,()=>page.locator('#submitAuth').click());
 await page.waitForFunction(()=>document.querySelector('#formStatus').textContent.includes('Request submitted'));
 assert.equal(await page.evaluate(()=>KicksAuth.current()),null);
 await go('Pages/Auth/login.html');await page.locator('#email').fill('auditplayer@test.local');await page.locator('#password').fill('Auditpass123!');await settleWrite(page,()=>page.locator('#submitAuth').click());await page.waitForFunction(()=>document.querySelector('#formStatus').textContent.includes('awaiting'));
 await require('./helpers/browser-fixtures.cjs').admin(page);
 const ids=await page.evaluate(async()=>{
  const owner=await KicksAuth.register({name:'Audit Owner',email:'auditowner@test.local',password:'Auditowner123!',role:'owner',ownershipProof:{name:'license.pdf',size:4,data:'data:application/pdf;base64,dGVzdA=='}});
  const player=KicksStore.list('users').find(u=>u.email==='auditplayer@test.local');
  (await KicksStore.save('users',{...player,status:'Active'}));(await KicksStore.save('users',{...KicksStore.find('users',owner.id),status:'Active'}));
  const other=(await KicksStore.save('users',{name:'Other Player',email:'other@test.local',role:'player',status:'Active'}));
  const field=(await KicksStore.save('fields',{name:'Audit Khalda',ownerId:owner.id,city:'Amman',area:'Khalda',price:25,type:'5v5',rating:4,image:1,today:true,now:true,description:'Test pitch',amenities:'Parking'},{method:'Visa demo',amount:KicksStore.settings().listingFee}));
  const far=(await KicksStore.save('fields',{name:'Audit Irbid',ownerId:1,city:'Irbid',area:'Irbid',price:20,type:'5v5',rating:4,image:2,today:true,now:true}));
  const game=(await KicksStore.save('games',{title:'Audit Match',fieldId:field.id,date:'2100-01-05',time:'18:00',durationMinutes:60,joined:0,capacity:10,price:4,level:'All levels'}));
  (await KicksStore.save('games',{title:'Distant Match',fieldId:far.id,date:'2100-01-05',time:'18:00',durationMinutes:60,joined:0,capacity:10,price:4,level:'All levels'}));
  const cup=(await KicksStore.save('tournaments',{name:'Audit Cup',fieldId:field.id,date:'2100-01-07',time:'18:00',durationMinutes:180,teams:0,capacity:8,fee:40,level:'All levels',prize:'Cup',system:'Single elimination'}));
  await KicksAuth.login('auditplayer@test.local','Auditpass123!');return {player:player.id,owner:owner.id,field:field.id,game:game.id,cup:cup.id,other:other.id};
 });
 console.log('PASS: registration stays pending and cannot log in; isolated catalogue created.');
 for(const [route,count,card] of [['Pages/Fields/fields.html','#resultsCount','.catalog-card'],['Pages/OpenGames/open-games.html','#gameCount','.match-card'],['Pages/Tournaments/tournaments.html','#cupCount','.cup-card']]){
  await go(route);assert.equal(await page.locator('.results-toolbar .catalogue-nearby-button').count(),1);
  await settleWrite(page,()=>page.locator('.catalogue-nearby-button').click());await page.waitForFunction(()=>document.querySelector('.catalogue-nearby-button').getAttribute('aria-pressed')==='true',null,{timeout:16000});
  assert.equal(await page.locator(card).count(),1);assert.equal(await page.locator('.catalogue-distance').count(),1);await settleWrite(page,()=>page.locator('.catalogue-nearby-button').click());assert.match(await page.locator(count).innerText(),route.includes('Tournaments')?/1/:/2/);
 }
 console.log('PASS: Near me changes native cards in all three catalogues and Show all resets them.');
 await go('Pages/Fields/fields.html');await settleWrite(page,()=>page.locator('.kicks-assistant-launcher').click());await page.locator('#kicksChatInput').fill('بدي ملعب بعمان بميزانية 30 دينار');await page.locator('#kicksChatInput').press('Enter');await page.waitForFunction(()=>document.querySelectorAll('.kicks-chat-results a').length>0);assert.match(await page.locator('.kicks-chat-bubble.assistant').last().innerText(),/Audit Khalda/);
 await page.locator('#kicksChatInput').fill('بميزانية 10 دينار');await page.locator('#kicksChatInput').press('Enter');await page.waitForFunction(()=>document.querySelectorAll('.kicks-chat-bubble.user').length===2 && !document.querySelector('#kicksChat').hasAttribute('aria-busy'));assert.match(await page.locator('.kicks-chat-bubble.assistant').last().innerText(),/0/);await page.locator('#kicksChatInput').fill('بدون ميزانية');await page.locator('#kicksChatInput').press('Enter');await page.waitForFunction(()=>document.querySelectorAll('.kicks-chat-bubble.user').length===3&&!document.querySelector('#kicksChat').hasAttribute('aria-busy'));assert.match(await page.locator('.kicks-chat-bubble.assistant').last().innerText(),/Audit Khalda/);await snap('chat-desktop');await settleWrite(page,()=>page.locator('.kicks-chat-close').click());
 console.log('PASS: compact Arabic assistant searches real listings and handles follow-up budget.');
 await go('Pages/OpenGames/game-details.html?id='+ids.game);await settleWrite(page,()=>page.locator('#previewJoin').click());await page.locator('#positionError').filter({hasText:/Choose/}).waitFor();assert.match(await page.locator('#positionError').innerText(),/Choose/);assert.equal(await page.locator('.checkout-pay').isVisible(),false);
 await page.locator('[name=playingPosition][value=Goalkeeper]').check();await settleWrite(page,()=>page.locator('#previewJoin').click());await settleWrite(page,()=>page.locator('.checkout-pay').click());await page.locator('#joinDialog').waitFor();assert.equal(await page.evaluate(()=>KicksStore.list('memberships')[0].position),'Goalkeeper');
 await go('Pages/Dashboard/player.html#memberships');assert.match(await page.locator('#dashboardView').innerText(),/Goalkeeper/);
 console.log('PASS: position required before checkout and retained in player dashboard.');
 await go('Pages/Fields/field-details.html?id='+ids.field);await page.locator('#bookingDate').fill('2100-01-08');await page.locator('input[name=slot][value="18"]').check();await settleWrite(page,()=>page.locator('#bookButton').click());await settleWrite(page,()=>page.locator('#completeDemoPayment').click());await page.locator('#bookingDialog').waitFor();
 await go('Pages/Dashboard/player.html#meetings');assert.equal(await page.locator('[data-message-person="'+ids.other+'"]').count(),0);assert.equal(await page.locator('[data-message-person="'+ids.owner+'"]').count(),1);await settleWrite(page,()=>page.locator('[data-message-person="'+ids.owner+'"]').click());await page.locator('#messageText').fill('Hello owner');await settleWrite(page,()=>page.locator('#messageForm [type=submit]').click());assert.match(await page.locator('.message-history').innerText(),/Hello owner/);
 await page.locator('#messageText').fill('Unsent draft');await page.evaluate(()=>KicksMessages.render());assert.equal(await page.locator('#messageText').inputValue(),'Unsent draft');assert.equal(await page.locator('#messageText').evaluate(e=>e===document.activeElement),true);
 await page.evaluate(async()=>KicksAuth.login('auditowner@test.local','Auditowner123!'));await go('Pages/Dashboard/owner.html#meetings');await settleWrite(page,()=>page.locator('[data-message-person="'+ids.player+'"]').click());assert.match(await page.locator('.message-history').innerText(),/Hello owner/);await page.locator('#messageText').fill('Hello player');await settleWrite(page,()=>page.locator('#messageForm [type=submit]').click());
 console.log('PASS: booking-gated messages appear for player and correct owner, with reply.');
 await go('Pages/Dashboard/owner.html#memberships');assert.match(await page.locator('#dashboardView').innerText(),/Goalkeeper/);
 await page.evaluate(()=>sessionStorage.setItem('kicks-session-v2','1'));await go('Pages/Dashboard/admin.html#users');assert.equal(await page.locator('[data-delete=users]').count(),0);await settleWrite(page,()=>page.locator('[data-account-access="'+ids.player+'"]').click());await settleWrite(page,()=>page.locator('#confirmAction').click());assert.equal(await page.evaluate(id=>KicksStore.find('users',id).status,ids.player),'Inactive');
 await page.evaluate(()=>sessionStorage.removeItem('kicks-session-v2'));await go('Pages/Auth/login.html');await page.locator('#email').fill('auditplayer@test.local');await page.locator('#password').fill('Auditpass123!');await settleWrite(page,()=>page.locator('#submitAuth').click());await page.waitForFunction(()=>document.querySelector('#formStatus').textContent.includes('inactive'));
 console.log('PASS: admin deactivation keeps account and prevents login.');
 for(const route of ['index.html','Pages/About/about.html','Pages/Contact/contact.html','Pages/Fields/fields.html','Pages/OpenGames/open-games.html','Pages/Tournaments/tournaments.html']){await go(route);assert.equal(await page.locator('body').count(),1);}
 await page.setViewportSize({width:390,height:844});await go('Pages/Fields/fields.html');await settleWrite(page,()=>page.locator('.kicks-assistant-launcher').click());await snap('chat-mobile');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
 const rect=await page.locator('#kicksChat').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=390);await settleWrite(page,()=>page.locator('.kicks-chat-close').click());await page.locator('.results-toolbar').scrollIntoViewIfNeeded();await snap('catalogue-mobile');
 console.log('PASS: public page smoke checks, mobile chat and no horizontal overflow.');
 assert.deepEqual(errors,[]);await browser.close();
})().catch(async error=>{console.error(error);if(browser)await browser.close();process.exitCode=1;});

})().catch(error => { console.error(error); process.exitCode = 1; });
