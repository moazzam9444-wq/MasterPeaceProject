(async () => {
// Isolated business rules: no real accounts, charges or browser storage.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let saved=null;const ctx={structuredClone,Event,window:{dispatchEvent(){}},localStorage:{getItem:()=>saved,setItem:(key,value)=>{saved=value;}}};vm.createContext(require('./helpers/web-locks.cjs').install(require('./helpers/test-actor.cjs').admin(ctx)));for(const file of ['admin-account','data-store'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),ctx);const s=ctx.window.KicksStore;
const owner=(await s.save('users',{name:'Owner',email:'owner@test.local',role:'owner',status:'Active'})),player=(await s.save('users',{name:'Player',email:'player@test.local',role:'player',status:'Active'})),other=(await s.save('users',{name:'Other',email:'other@test.local',role:'player',status:'Active'}));
(await assert.rejects(async ()=>(await s.save('fields',{name:'Unpaid',ownerId:owner.id,price:30})),/payment/));
const field=(await s.save('fields',{name:'Test',ownerId:owner.id,price:30},{method:'Visa demo',amount:5}));assert.equal(s.list('payments').at(-1).commission,5);
(await assert.rejects(async ()=>(await s.book(player.id,field.id,'2100-01-01','18:00',{method:'Visa demo',amount:25})),/price changed/));
assert.equal(s.list('bookings').length,0);
const booking=(await s.book(player.id,field.id,'2100-01-01','18:00',{method:'Visa demo',amount:30}));assert.equal(booking.commission,3);assert.equal(booking.ownerNet,27);
(await assert.rejects(async ()=>(await s.book(other.id,field.id,'2100-01-01','18:00',{method:'Visa demo',amount:30})),/slot/));
const cancelled=(await s.save('bookings',{...booking,status:'Cancelled'}));assert.equal(cancelled.paymentStatus,'Refunded (demo)');(await assert.rejects(async ()=>(await s.save('bookings',{...cancelled,status:'Confirmed'})),/refunded/));
const game=(await s.save('games',{title:'Paid game',fieldId:field.id,date:'2100-01-02',time:'18:00',durationMinutes:60,price:4,capacity:1,joined:0}));
(await assert.rejects(async ()=>(await s.join(player.id, "games", game.id, {position:"Defender",payment:{method:'Visa demo',amount:3}})),/fee changed/));
const entry=(await s.join(player.id, "games", game.id, {position:"Defender",payment:{method:'Visa demo',amount:4}}));(await assert.rejects(async ()=>(await s.join(other.id, "games", game.id, {position:"Defender",payment:{method:'Visa demo',amount:4}})),/full/));
(await assert.rejects(async ()=>(await s.leave(other.id,'memberships',entry.id)),/disabled/));(await assert.rejects(async ()=>(await s.leave(player.id,'memberships',entry.id)),/disabled/));(await s.save('memberships',{...entry,status:'Left'}));assert.equal(s.find('games',game.id).joined,0);
(await s.join(player.id, "games", game.id, {position:"Defender",payment:{method:'Visa demo',amount:4}}));assert.equal(s.list('memberships').length,1);await assert.rejects(s.remove('games',game.id),/linked history/);assert(s.find('games',game.id));assert.equal(s.list('payments').filter(p=>p.collection==='memberships'&&p.status==='Paid (demo)').length,1);
const cup=(await s.save('tournaments',{name:'Paid cup',fieldId:field.id,date:'2100-01-03',time:'18:00',durationMinutes:180,fee:60,capacity:8,teams:0}));(await assert.rejects(async ()=>(await s.join(player.id,'tournaments',cup.id,{teamName:'',payment:{method:'Visa demo',amount:60}})),/team/));

  (await s.save('fields',{...field,type:'5v5'}));
  const squadMembers=[{userId:player.id,position:'Forward'}];
  for(let n=0;n<4;n++){const u=(await s.save('users',{name:'Squad '+n,email:'squad'+n+'@test.local',role:'player',status:'Active'}));squadMembers.push({userId:u.id,position:'Defender'});}
  // Pre-existing squad fixture; registration tests do not exercise enrollment.
  const squadFixture=JSON.parse(saved);squadFixture.teams.push({id:'test-squad-fixture',name:'Test Team',captainId:player.id,format:'5v5',capacity:12,members:squadMembers});saved=JSON.stringify(squadFixture);
  const squadId=s.list('teams').at(-1).id;
(await s.join(player.id,'tournaments',cup.id,{teamName:'Test Team',teamId:squadId,payment:{method:'Visa demo',amount:60}}));await assert.rejects(s.remove('tournaments',cup.id),/linked history/);assert.equal(s.list('registrations').length,1);assert.equal(s.list('payments').filter(p=>p.collection==='registrations'&&p.status==='Paid (demo)').length,1);
(await assert.rejects(async ()=>(await s.submitFeedback({name:'A',email:'bad',message:'short',rating:0})),/valid/));assert.equal(s.escape('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
console.log('PASS: listing fees, stale prices, revenue splits, booking conflicts, refunds, capacity, rejoining, linked deletion and feedback validation.');

})().catch(error => { console.error(error); process.exitCode = 1; });
