(async () => {
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function harness(initial, blocked = false) {
  let saved = initial ? JSON.stringify(initial) : null;
  let writes = 0;
  const context = { structuredClone, Event, window: { dispatchEvent() {} }, localStorage: {
    getItem: () => saved, setItem: (_, value) => { if (blocked) throw Error('full'); saved = value; writes++; }
  }};
  vm.createContext(require('./helpers/web-locks.cjs').install(require('./helpers/test-actor.cjs').admin(context)));
  vm.runInContext(fs.readFileSync('js/admin-account.js', 'utf8'), context);
  const reload = () => vm.runInContext(fs.readFileSync('js/data-store.js', 'utf8'), context);
  reload();
  return { reload, get store() { return context.window.KicksStore; }, raw: () => JSON.parse(saved), writes: () => writes };
}
const fresh = harness();
for (const kind of ['fields', 'games', 'tournaments']) assert.equal(fresh.store.list(kind).length, 0);
assert.equal(fresh.store.list('users').length, 1);
fresh.reload();
assert.equal(fresh.writes(), 0);
const description = 'An intimate pitch for quick passing, evening games and weekly meetups.';
const data = {
  catalogueVersion: 1,
  users: [{ id: 1, role: 'admin', status: 'Active' }, { id: 2, role: 'owner', status: 'Active' }, { id: 3, role: 'player', status: 'Active' }],
  settings: { listingFee: 5, commissionRate: 10 },
  fields: [
    { id: 1, name: 'KICKS Arena', description, ownerId: 1, price: 25 },
    { id: 2, name: 'KICKS Arena', description: 'A real venue with the same name.', ownerId: 1, price: 35 },
    { id: 3, name: 'Owner field', ownerId: 2, price: 30 },
    { id: 4, name: 'KICKS Arena', description, ownerId: 2, price: 40 }
  ],
  games: [
    { id: 11, title: 'Old demo match', fieldId: 1, date: '2100-01-01', time: '18:00', durationMinutes: 60, capacity: 10, joined: 1, price: 4 },
    { id: 12, title: 'Real match', fieldId: 2, date: '2100-01-01', time: '19:00', durationMinutes: 60, capacity: 10, joined: 0, price: 4 }
  ],
  tournaments: [{ id: 21, name: 'Old cup', fieldId: 1, date: '2100-01-02', time: '18:00', durationMinutes: 180, teams: 1, capacity: 8 }],
  bookings: [{ id: 31, userId: 3, fieldId: 1, date: '2100-01-01', time: '18:00', status: 'Confirmed', price: 25, paymentStatus: 'Paid (demo)' }],
  memberships: [{ id: 41, userId: 3, gameId: 11, status: 'Joined' }],
  registrations: [{ id: 51, userId: 3, tournamentId: 21, status: 'Registered', teamName: 'Existing team' }],
  payments: [{ id: 61, collection: 'bookings', recordId: 31, status: 'Paid (demo)', amount: 25, commission: 2.5, ownerNet: 22.5 }],
  feedback: [], meetings: []
};
const old = harness(data);
await old.store.ready;
assert.deepEqual(Array.from(old.store.list('fields'), row => row.id), [2, 3, 4]);
assert.equal(old.store.list('fields', { includeArchived: true }).length, 4);
assert.equal(old.store.find('fields', 1).retiredDemo, true);
assert.deepEqual(Array.from(old.store.publicActivities('games'), row => row.id), [12]);
assert.equal(old.store.publicActivities('tournaments').length, 0);
assert.equal(old.store.activityStatus('games', old.store.find('games', 11)), 'Archived');
for (const name of ['bookings', 'memberships', 'registrations', 'payments'])
  assert.equal(JSON.stringify(old.raw()[name]), JSON.stringify(data[name]));
(await assert.rejects(async () => (await old.store.book(3, 1, '2100-01-03', '18:00')), /no longer available/));
(await assert.rejects(async () => (await old.store.join(3, 'games', 11)), /no longer open/));
const writes = old.writes();
old.reload();
assert.equal(old.writes(), writes);
const manual = (await old.store.save('fields', { name: 'KICKS Arena', description, ownerId: 1, price: 45 }));
old.reload();
assert(old.store.list('fields').some(row => row.id === manual.id));
const blocked = harness(data, true);
assert.deepEqual(Array.from(blocked.store.list('fields'), row => row.id), [2, 3, 4]);
assert.equal(blocked.raw().bookings.length, 1);
console.log('PASS: empty catalogue, conservative retirement, manual venues, preserved history, quota fallback and no reseeding.');

})().catch(error => { console.error(error); process.exitCode = 1; });
