const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function harness(blocked = false) {
  let value = null;
  const context = { structuredClone, Event, window: { dispatchEvent() {} }, localStorage: {
    getItem() { if (blocked) throw Error('Blocked'); return value; },
    setItem(key, next) { if (blocked) throw Error('Blocked'); value = next; },
  } };
  vm.createContext(context);
  for (const file of ['admin-account', 'data-store']) vm.runInContext(fs.readFileSync('js/' + file + '.js', 'utf8'), context);
  return { context, store: context.window.KicksStore, block() { blocked = true; }, unblock() { blocked = false; } };
}
const unavailable = harness(true);
assert.equal(unavailable.store.persistent(), false);
assert.throws(() => unavailable.store.save('feedback', {message:'Test'}), /storage/);
unavailable.unblock();
unavailable.store.save('feedback', {message:'Retry'});
assert.equal(unavailable.store.persistent(), true);
const {store, block, unblock} = harness();
const game = store.list('games')[0];
const entry = store.save('memberships', {userId:2,gameId:game.id,status:'Joined'});
assert.equal(store.find('games',game.id).joined,1);
block();
assert.throws(()=>store.save('memberships',{...entry,status:'Left'}), /storage/);
assert.equal(store.find('games',game.id).joined,1);
assert.equal(store.find('memberships',entry.id).status,'Joined');
unblock();
store.save('memberships',{...entry,status:'Left'});
assert.equal(store.find('games',game.id).joined,0);
// A rejected paid edit must not decrement the event counter.
const paid = store.save('memberships',{userId:3,gameId:game.id,status:'Joined',price:4,paymentStatus:'Paid (demo)'});
assert.throws(()=>store.save('memberships',{...paid,status:'Left',price:8}), /paid entry/);
assert.equal(store.find('games',game.id).joined,1);
block();
assert.throws(()=>store.remove('memberships',paid.id), /storage/);
assert.equal(store.find('games',game.id).joined,1);
unblock();
store.remove('memberships',paid.id);
assert.equal(store.find('games',game.id).joined,0);
console.log('PASS: blocked-storage startup, recovery and atomic event counters.');
