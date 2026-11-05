(async () => {
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function harness(blocked = false) {
  let value = null;
  const context = { structuredClone, Event, window: { dispatchEvent() {} }, localStorage: {
    getItem() { if (blocked) throw Error('Blocked'); return value; },
    setItem(key, next) { if (blocked) throw Error('Blocked'); value = next; },
  } };
  vm.createContext(require('./helpers/web-locks.cjs').install(require('./helpers/test-actor.cjs').admin(context)));
  for (const file of ['admin-account', 'data-store']) vm.runInContext(fs.readFileSync('js/' + file + '.js', 'utf8'), context);
  return { context, store: context.window.KicksStore, block() { blocked = true; }, unblock() { blocked = false; } };
}
const unavailable = harness(true);
assert.equal(unavailable.store.persistent(), false);
(await assert.rejects(async () => (await unavailable.store.save('feedback', {message:'Test'})), /storage/));
unavailable.unblock();
(await unavailable.store.save('feedback', {message:'Retry'}));
assert.equal(unavailable.store.persistent(), true);
const {store, block, unblock} = harness();
const field = (await store.save('fields', {name:'Atomic test pitch',ownerId:1,price:25}));
const game = (await store.save('games', {title:'Atomic test match',fieldId:field.id,date:'2100-01-01',time:'18:00',durationMinutes:60,capacity:10,joined:0,price:0}));
await store.save('users',{name:'Counter player A',email:'counter-a@example.test',role:'player',status:'Active'});
await store.save('users',{name:'Counter player B',email:'counter-b@example.test',role:'player',status:'Active'});
const entry = (await store.save('memberships', {userId:2,position:'Defender',gameId:game.id,status:'Joined'}));
assert.equal(store.find('games',game.id).joined,1);
block();
(await assert.rejects(async ()=>(await store.save('memberships',{...entry,status:'Left'})), /storage/));
assert.equal(store.find('games',game.id).joined,1);
assert.equal(store.find('memberships',entry.id).status,'Joined');
unblock();
(await store.save('memberships',{...entry,status:'Left'}));
assert.equal(store.find('games',game.id).joined,0);
// A rejected paid edit must not decrement the event counter.
const paid = (await store.save('memberships',{userId:3,position:'Forward',gameId:game.id,status:'Joined',price:4,paymentStatus:'Paid (demo)'}));
(await assert.rejects(async ()=>(await store.save('memberships',{...paid,status:'Left',price:8})), /paid entry/));
assert.equal(store.find('games',game.id).joined,1);
block();
(await assert.rejects(async ()=>(await store.remove('memberships',paid.id)), /storage/));
assert.equal(store.find('games',game.id).joined,1);
unblock();
(await store.remove('memberships',paid.id));
assert.equal(store.find('games',game.id).joined,0);
console.log('PASS: blocked-storage startup, recovery and atomic event counters.');

})().catch(error => { console.error(error); process.exitCode = 1; });
