(async () => {
// Isolated clock and storage: no real account records or payments are modified.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let now = Date.parse('2030-10-31T16:00:00+03:00');
class ClockDate extends Date {
  constructor(...args) { super(...(args.length ? args : [now])); }
  static now() { return now; }
}
let saved;
const timers = [];
const events = {};
const ctx = {
  Date: ClockDate, structuredClone, Event,
  localStorage: { getItem: () => saved, setItem: (_, value) => { saved = value; } },
  document: { addEventListener: (name, callback) => { events[name] = callback; } },
  window: {
    dispatchEvent() {},
    addEventListener: (name, callback) => { events[name] = callback; },
    setInterval: callback => { timers.push(callback); return timers.length; },
  },
};
vm.createContext(require('./helpers/web-locks.cjs').install(require('./helpers/test-actor.cjs').admin(ctx)));
for (const name of ['admin-account', 'data-store']) vm.runInContext(fs.readFileSync(`js/${name}.js`, 'utf8'), ctx);
const store = ctx.window.KicksStore;
const field = (await store.save('fields', {name:'Timed test pitch',ownerId:1,price:25}));
const game = (await store.save('games', { title: 'Timed match', fieldId: field.id, date: '2030-10-31', time: '17:00', durationMinutes: 90, capacity: 10, joined: 0, price: 0 }));
const cup = (await store.save('tournaments', { name: 'Overnight cup', fieldId: field.id, date: '2030-10-31', time: '23:30', durationMinutes: 120, capacity: 8, teams: 0, fee: 0 }));
const legacy = {...game,id:game.id+1,title:'Needs duration',durationMinutes:undefined};
const legacyFixture=JSON.parse(saved);legacyFixture.games.push(legacy);saved=JSON.stringify(legacyFixture);
assert.equal(store.activityStatus('games', legacy), 'Set duration');
assert(!store.publicActivities('games').some(row => row.id === legacy.id));
assert.equal(store.endsAt('games', game), Date.parse('2030-10-31T18:30:00+03:00'));
assert.equal(store.endsAt('tournaments', cup), Date.parse('2030-11-01T01:30:00+03:00'));
for (const durationMinutes of [0, -1, 1.5, 'bad', Infinity]) (await assert.rejects(async () => (await store.save('games', { ...game, durationMinutes })), /duration/));
const player = (await store.save('users', { name: 'Test player', email: 'timed-player@test.local', role: 'player', status: 'Active' }));
const membership = (await store.join(player.id, "games", game.id, {position:"Defender"}));

  (await store.save('fields',{...field,type:'5v5'}));
  const squadMembers=[{userId:player.id,position:'Forward'}];
  for(let n=0;n<4;n++){const u=(await store.save('users',{name:'Squad '+n,email:'squad'+n+'@test.local',role:'player',status:'Active'}));squadMembers.push({userId:u.id,position:'Defender'});}
  // Pre-existing squad fixture; registration tests do not exercise enrollment.
  const squadFixture=JSON.parse(saved);squadFixture.teams.push({id:'test-squad-fixture',name:'Test Team',captainId:player.id,format:'5v5',capacity:12,members:squadMembers});saved=JSON.stringify(squadFixture);
  const squadId=store.list('teams').at(-1).id;
const registration = (await store.join(player.id, 'tournaments', cup.id, { teamName: 'Night team',teamId:squadId }));
(await assert.rejects(async () => (await store.join(player.id, "games", legacy.id, {position:"Defender",position:"Defender"})), /no longer open/));
// Lifecycle fixture uses a separate pitch: the timed game already occupies the first pitch.
const bookingField = (await store.save('fields', {name:'Booking lifecycle pitch',ownerId:1,price:25}));
const booking = { id: 99, userId: player.id, fieldId: bookingField.id, date: '2030-10-31', time: '17:00', price: 25, status: 'Confirmed', paymentStatus: 'Paid (demo)' };
const storedBooking = (await store.save('bookings', { ...booking, id: undefined }));
assert.equal(store.endsAt('bookings', storedBooking), Date.parse('2030-10-31T18:00:00+03:00'));
let renders = 0;
store.watchActivityClock(() => { renders++; });
assert.equal(renders, 0);
now = Date.parse('2030-10-31T17:00:00+03:00');
timers[0]();
assert.equal(renders, 1);
assert.equal(store.activityStatus('games', game), 'In progress');
assert(store.publicActivities('games').some(row => row.id === game.id));
now = Date.parse('2030-10-31T18:00:00+03:00');
timers[0]();
assert.equal(store.activityStatus('bookings', storedBooking), 'Completed');
assert(store.publicActivities('games').some(row => row.id === game.id));
now = Date.parse('2030-10-31T18:29:59.999+03:00');
assert.equal(store.hasEnded('games', game), false);
now++;
timers[0]();
assert.equal(store.hasEnded('games', game), true);
assert(!store.publicActivities('games').some(row => row.id === game.id));
assert.equal(store.activityStatus('games', game), 'Ended');
assert.equal(store.activityStatus('memberships', membership), 'Completed');
const count = renders;
timers[0]();
assert.equal(renders, count);
assert.equal(store.find('games', game.id).joined, 1);
assert.equal(store.find('memberships', membership.id).status, 'Joined');
assert.equal(store.find('bookings', storedBooking.id).paymentStatus, 'Paid (demo)');
assert.equal(store.activityStatus('bookings', { ...booking, status: 'Cancelled' }), 'Cancelled');
now = Date.parse('2030-11-01T00:30:00+03:00');
events.pageshow();
assert(store.publicActivities('tournaments').some(row => row.id === cup.id));
now = Date.parse('2030-11-01T01:30:00+03:00');
events.visibilitychange();
assert(!store.publicActivities('tournaments').some(row => row.id === cup.id));
assert.equal(store.activityStatus('registrations', registration), 'Completed');
assert(store.find('tournaments', cup.id));
assert(store.find('registrations', registration.id));
assert(store.find('fields', field.id));
ctx.window.KicksAuth = { current: () => player };
(await assert.rejects(async () => (await store.leave(player.id, 'memberships', membership.id)), /disabled/));
(await assert.rejects(async () => (await store.save('bookings', { ...storedBooking, status: 'Cancelled' })), /disabled/));
(await assert.rejects(async () => (await store.save('memberships', { ...membership, status: 'Left' })), /disabled/));
(await assert.rejects(async () => (await store.save('registrations', { ...registration, status: 'Withdrawn' })), /disabled/));
(await assert.rejects(async () => (await store.remove('bookings', storedBooking.id)), /disabled/));
assert.equal(store.find('bookings', storedBooking.id).paymentStatus, 'Paid (demo)');
console.log('PASS: exact Amman end times, overnight durations, live boundary refresh, public expiry, retained history/payments and disabled player cancellation.');

})().catch(error => { console.error(error); process.exitCode = 1; });
