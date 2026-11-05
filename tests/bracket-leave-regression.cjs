(async () => {
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let saved=null,current=null,blocked=false;
const ctx={structuredClone,Event,crypto:require('node:crypto').webcrypto,window:{dispatchEvent(){},KicksAuth:{current:()=>current}},localStorage:{getItem:()=>saved,setItem(k,v){if(blocked)throw Error();saved=v;}}};
vm.createContext(require('./helpers/web-locks.cjs').install(ctx));
for(const file of ['admin-account','bracket-core','data-store'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),ctx);
const S=ctx.window.KicksStore,C=ctx.window.KicksBracketCore;
for(let count=2;count<=64;count++){
 const ids=Array.from({length:count},(_,i)=>i+1),b={slots:C.seed(ids),winners:{}};
 assert.equal(b.slots.filter(Boolean).length,count);
 for(let r=0;r<Math.log2(b.slots.length);r++)for(const m of C.rounds(b)[r]){assert(m.ready);if(!m.bye)b.winners[m.key]=m.a.id;}
 assert(ids.includes(C.rounds(b).at(-1)[0].winner));
}
const captain=(await require('./helpers/test-actor.cjs').save(ctx,'users',{name:'Captain',email:'captain@test.local',role:'player',status:'Active'})),member=(await require('./helpers/test-actor.cjs').save(ctx,'users',{name:'Member',email:'member@test.local',role:'player',status:'Active'})),other=(await require('./helpers/test-actor.cjs').save(ctx,'users',{name:'Other',email:'other@test.local',role:'player',status:'Active'}));
current=captain;(await S.updateTeams(v=>v.teams.push({id:'squad',name:'Squad',captainId:captain.id,capacity:7,members:[{userId:captain.id,position:'Forward'}]})));const initialSquad=JSON.parse(saved);initialSquad.teams[0].members.push({userId:member.id});saved=JSON.stringify(initialSquad);
current=member;(await S.teamLeave('request','squad'));let request=S.list('teamRequests')[0];assert.equal(S.list('teams')[0].members.length,2);
(await assert.rejects(async ()=>(await S.teamLeave('request','squad')),/awaiting/));
(await assert.rejects(async ()=>(await S.teamLeave('accept','squad',request.id)),/captain/));
(await assert.rejects(async ()=>(await S.updateTeams(v=>v.teams[0].members.pop())),/captain/));
current=captain;(await S.teamLeave('decline','squad',request.id));assert.equal(S.list('teams')[0].members.length,2);
current=member;(await S.teamLeave('request','squad'));request=S.list('teamRequests').at(-1);
current=captain;blocked=true;(await assert.rejects(async ()=>(await S.teamLeave('accept','squad',request.id)),/storage/));blocked=false;assert.equal(S.list('teams')[0].members.length,2);
(await S.teamLeave('accept','squad',request.id));assert.equal(S.list('teams')[0].members.length,1);
(await assert.rejects(async ()=>(await S.teamLeave('request','squad')),/non-captain/));
current=null;const owner=(await require('./helpers/test-actor.cjs').save(ctx,'users',{name:'Owner',email:'owner@test.local',role:'owner',status:'Active'})),field=(await require('./helpers/test-actor.cjs').save(ctx,'fields',{name:'Pitch',ownerId:owner.id},{method:'Visa demo',amount:5}));
current=S.find('users',1);const cup=(await S.save('tournaments',{name:'Cup',fieldId:field.id,date:'2100-01-01',time:'18:00',durationMinutes:180,capacity:8,teams:0}));
// Fixture registrations bypass the public five-player/checkout flow already covered by teams tests.
let data=JSON.parse(saved);data.tournaments.find(t=>t.id===cup.id).createdBy=owner.id;data.registrations=Array.from({length:5},(_,i)=>({id:i+1,tournamentId:cup.id,status:'Registered',teamName:'Team '+(i+1),userId:other.id}));saved=JSON.stringify(data);
current=member;(await assert.rejects(async ()=>(await S.tournamentBracket(cup.id,'shuffle')),/organiser/));
current=null;assert.throws(()=>S.tournamentBracket(cup.id),/participants/);
current=member;assert.throws(()=>S.tournamentBracket(cup.id),/participants/);
current=S.find('users',1);assert(S.tournamentAccess(cup.id).manage);await S.tournamentBracket(cup.id,'shuffle');await assert.rejects(S.remove('tournaments',cup.id),/linked history/);
let fixture=JSON.parse(saved);fixture.registrations[0].roster=[{userId:captain.id},{userId:member.id}];saved=JSON.stringify(fixture);
for(const player of [captain,member,other]){current=player;assert(S.tournamentAccess(cup.id).view);assert(!S.tournamentAccess(cup.id).manage);assert(S.tournamentBracket(cup.id).entries.length);(await assert.rejects(async ()=>(await S.tournamentBracket(cup.id,'shuffle')),/organiser/));}
current=owner;let view=(await S.tournamentBracket(cup.id,'shuffle'));assert.equal(view.bracket.slots.length,8);
view=(await S.tournamentBracket(cup.id,'start'));assert(view.bracket.started);
(await assert.rejects(async ()=>(await S.tournamentBracket(cup.id,'shuffle')),/locked/));
(await assert.rejects(async ()=>(await S.tournamentBracket(cup.id,'advance',{match:'1:0',entryId:999})),/pairing/));
for(let r=0;r<3;r++)for(const m of S.tournamentBracket(cup.id).rounds[r])if(!m.bye)(await S.tournamentBracket(cup.id,'advance',{match:m.key,entryId:m.a.id}));
view=S.tournamentBracket(cup.id);assert(view.rounds[2][0].winner);
const first=view.rounds[0].find(m=>!m.bye);(await S.tournamentBracket(cup.id,'advance',{match:first.key,entryId:first.b.id}));
assert.equal(S.tournamentBracket(cup.id).rounds[2][0].winner,null);
(await assert.rejects(async ()=>(await S.remove('registrations',1)),/locked/));
(await assert.rejects(async ()=>(await S.save('registrations',{...S.list('registrations')[0],status:'Withdrawn'})),/locked/));
blocked=true;(await assert.rejects(async ()=>(await S.tournamentBracket(cup.id,'advance',{match:first.key,entryId:first.a.id})),/storage/));blocked=false;
assert.equal(S.tournamentBracket(cup.id).rounds[0].find(m=>m.key===first.key).winner,first.b.id);
console.log('PASS: 2–64-team byes, captain-approved departures, permissions, persistence rollback, locked draw, winner propagation and downstream correction.');

})().catch(error => { console.error(error); process.exitCode = 1; });
