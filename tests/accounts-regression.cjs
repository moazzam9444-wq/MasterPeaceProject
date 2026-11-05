(async () => {
// Run: node tests/accounts-regression.cjs
// All records below exist only in an isolated test context.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
let stored = null,
  navigation = "";
const session = new Map();
const persistent = new Map();
const context = {
  structuredClone,
  Event,
  URL,
  URLSearchParams,
  TextEncoder,
  crypto: webcrypto,
  setTimeout,
  clearTimeout,
  localStorage: {
    getItem: (key) =>
      key === "kicks-data-v2" ? stored : persistent.get(key) || null,
    setItem: (key, value) =>
      key === "kicks-data-v2" ? (stored = value) : persistent.set(key, value),
    removeItem: (key) => persistent.delete(key),
  },
  sessionStorage: {
    getItem: (key) => session.get(key) || null,
    setItem: (key, value) => session.set(key, value),
    removeItem: (key) => session.delete(key),
  },
  location: {
    origin: "http://127.0.0.1:4173",
    pathname: "/index.html",
    search: "",
    hash: "",
    assign: (path) => (navigation = path),
    replace: (path) => (navigation = path),
  },
  window: { dispatchEvent() {}, addEventListener() {} },
  document: {
    currentScript: { src: "http://127.0.0.1:4173/js/account.js" },
    querySelector: () => null,
    addEventListener() {},
  },
};
vm.createContext(require('./helpers/web-locks.cjs').install(context));
vm.runInContext(fs.readFileSync("js/admin-account.js", "utf8"), context);
vm.runInContext(fs.readFileSync("js/data-store.js", "utf8"), context);
// A clean browser has no automatic venues or events, including after reload.
assert.equal(context.window.KicksStore.list("fields").length, 0);
assert.equal(context.window.KicksStore.list("games").length, 0);
assert.equal(context.window.KicksStore.list("tournaments").length, 0);
vm.runInContext(fs.readFileSync("js/data-store.js", "utf8"), context);
assert.equal(context.window.KicksStore.list("fields").length, 0);
context.KicksStore = context.window.KicksStore;
vm.runInContext(fs.readFileSync("js/account.js", "utf8"), context);
const store = context.KicksStore,
  auth = context.window.KicksAuth;
(async () => {
  auth.afterLogin(store.find("users", 1));
  assert.equal(navigation, "http://127.0.0.1:4173/Pages/Dashboard/admin.html");
  assert.equal(store.list("fields").length, 0);
  assert.equal(store.list("users").length, 1);
  assert.equal(
    auth.fieldImage({ image: 2 }),
    "http://127.0.0.1:4173/assets/images/field2.jpg",
  );
  const photo = "data:image/jpeg;base64,dGVzdA==";
  assert.equal(auth.fieldImage({ image: 2, photo }), photo);
  assert.equal(
    auth.fieldImage({ image: 2, photo: "javascript:alert(1)" }),
    "http://127.0.0.1:4173/assets/images/field2.jpg",
  );
  assert.equal(auth.current(), null);
  auth.requirePlayer();
  assert.match(navigation, /Auth\/login.html\?returnTo=/);
  await assert.rejects(
    auth.register({
      name: "Intruder",
      email: "intruder@test.local",
      password: "Testpass123!",
      role: "admin",
    }),
  );
  const player = await auth.register({
    name: "Test Player",
    email: "player@test.local",
    password: "Testpass123!",
    role: "player",
  });
  assert.equal(player.status, "Pending");
  assert.equal(auth.current(), null);
  await assert.rejects(auth.login("player@test.local", "Testpass123!"), /awaiting administrator/);
  (await require('./helpers/test-actor.cjs').save(context,"users", {...store.find("users", player.id), status: "Rejected"}));
  await assert.rejects(auth.login("player@test.local", "Testpass123!"), /rejected/);
  (await require('./helpers/test-actor.cjs').save(context,"users", {...store.find("users", player.id), status: "Active"}));
  await auth.login("player@test.local", "Testpass123!");
  assert.equal(auth.current().id, player.id);
  assert(!stored.includes("Testpass123!"));
  assert.equal(auth.current().passwordHash, undefined);
  auth.afterLogin(player);
  assert.equal(navigation, "http://127.0.0.1:4173/index.html");
  context.location.search = "?returnTo=" + encodeURIComponent("/Pages/Fields/field-details.html?id=1");
  auth.afterLogin(player);
  assert.equal(navigation, "http://127.0.0.1:4173/Pages/Fields/field-details.html?id=1");
  for(const target of ['/Pages/Teams/teams.html?team=host','/Pages/Challenges/challenges.html?id=1']) {
    context.location.search='?returnTo='+encodeURIComponent(target);
    auth.afterLogin(player);
    assert(navigation.endsWith(target));
  }
  for (const target of ["https://example.com/", "//example.com/", "javascript:alert(1)", "/Pages/Dashboard/admin.html"]) {
    context.location.search = "?returnTo=" + encodeURIComponent(target);
    auth.afterLogin(player);
    assert.equal(navigation, "http://127.0.0.1:4173/index.html");
  }
  context.location.search = "";
  await assert.rejects(
    auth.register({
      name: "Duplicate",
      email: "PLAYER@test.local",
      password: "Testpass123!",
      role: "player",
    }),
  );
  auth.logout();
  assert.equal(auth.current(), null);
  await assert.rejects(auth.login("player@test.local", "Wrongpass123!"));
  await assert.rejects(auth.login("missing@test.local", "Testpass123!"));
  await assert.rejects(auth.register({name:"No proof", email:"no-proof@test.local", password:"Testowner123!", role:"owner"}), /license/);
  const owner = await auth.register({
    ownershipProof: {name:"license.pdf", size:4, data:"data:application/pdf;base64,dGVzdA=="},
    name: "Test Owner",
    email: "owner@test.local",
    password: "Testowner123!",
    role: "owner",
  });
  auth.logout();
  assert.equal(owner.status, "Pending");
  await assert.rejects(auth.login("owner@test.local", "Testowner123!"), /awaiting administrator/);
  (await require('./helpers/test-actor.cjs').save(context,"users", {...store.find("users", owner.id), status: "Active"}));
  const signedInOwner = await auth.login("owner@test.local", "Testowner123!");
  assert.equal(signedInOwner.role, "owner");
  (await assert.rejects(async () => (await auth.setAccountActive(player.id, false)), /Administrator/));
  session.set("kicks-session-v2", "1");
  (await assert.rejects(async () => (await auth.setAccountActive(1, false)), /own administrator/));
  const countBeforeDeactivation = store.list("users").length;
  (await auth.setAccountActive(owner.id, false));
  assert.equal(store.list("users").length, countBeforeDeactivation);
  session.set("kicks-session-v2", String(owner.id));
  assert.equal(auth.current(), null);
  await assert.rejects(auth.login("owner@test.local", "Testowner123!"), /inactive/);
  session.set("kicks-session-v2", "1");
  (await auth.setAccountActive(owner.id, true));
  await auth.login("owner@test.local", "Testowner123!");
  auth.afterLogin(signedInOwner);
  assert.equal(navigation, "http://127.0.0.1:4173/Pages/Dashboard/owner.html");
  assert.equal(auth.requireRole("admin"), null);
  assert.match(navigation, /owner.html$/);
  const field = (await require('./helpers/test-actor.cjs').save(context,"fields", {
    name: "Test Pitch",
    ownerId: owner.id,
    city: "Amman",
    price: 25,
  }, { method: "Visa demo", amount: store.settings().listingFee }));
  const signedInPlayer = await auth.login("player@test.local", "Testpass123!");
  assert.equal(signedInPlayer.role, "player");
  auth.afterLogin(signedInPlayer);
  assert.equal(navigation, "http://127.0.0.1:4173/index.html");
  await assert.rejects(
    auth.passwordChanges("incorrect", "Changedpass123!"),
    /incorrect/,
  );
  await assert.rejects(
    auth.passwordChanges("Testpass123!", "short"),
    /8 characters/,
  );
  const credentials = await auth.passwordChanges(
    "Testpass123!",
    "Changedpass123!",
  );
  (await store.save("users", {
    ...store.find("users", player.id),
    ...credentials,
    phone: "+962790000000",
    address: "Amman",
  }));
  auth.logout();
  await assert.rejects(auth.login("player@test.local", "Testpass123!"));
  await auth.login("player@test.local", "Changedpass123!");
  assert.equal(auth.current().phone, "+962790000000");
  const booking = (await store.book(player.id, field.id, "2100-01-01", "18:00", { method: "Visa demo", amount: 25 }));
  assert.equal(booking.price, 25);
  assert.equal(booking.status, "Confirmed");
  (await assert.rejects(
    async () => (await store.book(player.id, field.id, "2100-01-01", "18:00")),
    /slot/,
  ));
  (await assert.rejects(
    async () => (await store.book(owner.id, field.id, "2100-01-01", "19:00")),
    /player/,
  ));
  (await assert.rejects(
    async () => (await store.book(player.id, field.id, "2000-01-01", "18:00")),
    /future/,
  ));
  (await assert.rejects(async () => (await require('./helpers/test-actor.cjs').asAdmin(context,()=>store.remove("fields", field.id))), /bookings/));
  const game = (await require('./helpers/test-actor.cjs').save(context,"games", {
    title: "Test Game",
    fieldId: field.id,
    date: "2100-01-01",
    time: "20:00",
    durationMinutes: 60,
    joined: 0,
    capacity: 1,
    price: 0,
  }));
  (await store.join(player.id, "games", game.id, {position:"Defender"}));
  assert.equal(store.find("games", game.id).joined, 1);
  (await assert.rejects(async () => (await store.join(player.id, "games", game.id, {position:"Defender",position:"Defender"})), /already/));
  const cup = (await require('./helpers/test-actor.cjs').save(context,"tournaments", {
    name: "Test Cup",
    fieldId: field.id,
    date: "2100-01-02",
    time: "20:00",
    durationMinutes: 180,
    teams: 0,
    capacity: 8,
    fee: 0,
  }));

  (await require('./helpers/test-actor.cjs').save(context,'fields',{...field,type:'5v5'}));
  const squadMembers=[{userId:player.id,position:'Forward'}];
  for(let n=0;n<4;n++){const u=(await require('./helpers/test-actor.cjs').save(context,'users',{name:'Squad '+n,email:'squad'+n+'@test.local',role:'player',status:'Active'}));squadMembers.push({userId:u.id,position:'Defender'});}
  // Pre-existing squad fixture; registration tests do not exercise enrollment.
  const squadFixture=JSON.parse(stored);squadFixture.teams.push({id:'test-squad-fixture',name:'Test Team',captainId:player.id,format:'5v5',capacity:12,members:squadMembers});stored=JSON.stringify(squadFixture);
  const squadId=store.list('teams').at(-1).id;
  (await store.join(player.id, "tournaments", cup.id, { teamName: "Test Team", teamId:squadId }));
  assert.equal(store.find("tournaments", cup.id).teams, 1);
  (await assert.rejects(async () => (await require('./helpers/test-actor.cjs').asAdmin(context,()=>store.remove("users", 1))), /administrator/));
  // Players cannot withdraw; an organiser can update an entry without double-counting.
  const membership = store.list("memberships")[0];
  (await assert.rejects(
    async () => (await store.leave(owner.id, "memberships", membership.id)),
    /disabled/,
  ));
  (await assert.rejects(async () => (await store.leave(player.id, "memberships", membership.id)), /disabled/));
  await auth.login("owner@test.local", "Testowner123!");
  (await store.save("memberships", { ...membership, status: "Left" }));
  assert.equal(store.find("games", game.id).joined, 0);
  (await assert.rejects(
    async () => (await store.leave(player.id, "memberships", membership.id)),
    /disabled/,
  ));
  await auth.login("player@test.local", "Changedpass123!");
  (await store.join(player.id, "games", game.id, {position:"Defender",position:"Defender"}));
  assert.equal(store.find("games", game.id).joined, 1);
  assert.equal(store.list("memberships").length, 1);
  const registration = store.list("registrations")[0];
  (await assert.rejects(async () => (await store.leave(player.id, "registrations", registration.id)), /disabled/));
  await auth.login("owner@test.local", "Testowner123!");
  (await store.save("registrations", { ...registration, status: "Withdrawn" }));
  assert.equal(store.find("tournaments", cup.id).teams, 0);
  await auth.login("player@test.local", "Changedpass123!");
  (await store.join(player.id, "tournaments", cup.id, { teamName: "New Team", teamId:squadId }));
  assert.equal(store.find("tournaments", cup.id).teams, 1);
  assert.equal(store.list("registrations").length, 1);
  // Field management keeps edits; deleting an event removes its linked entries.
  (await require('./helpers/test-actor.cjs').save(context,"fields", {
    ...store.find("fields", field.id),
    description: "Updated venue",
    amenities: "Parking",
    photo: "data:image/jpeg;base64,dGVzdA==",
  }));
  assert.equal(store.find("fields", field.id).description, "Updated venue");
  await assert.rejects(require('./helpers/test-actor.cjs').asAdmin(context,()=>store.remove("games", game.id)),/linked history/);
  assert.equal(store.list("memberships").length, 1);
  await assert.rejects(require('./helpers/test-actor.cjs').asAdmin(context,()=>store.remove("tournaments", cup.id)),/linked history/);
  assert.equal(store.list("registrations").length, 1);
  await require('./helpers/test-actor.cjs').save(context,"bookings",{...booking,status:"Cancelled"});
  const replacement = (await store.book(player.id, field.id, "2100-01-01", "18:00", {
    method: "Visa demo",
  }));
  assert.equal(replacement.status, "Confirmed");
  assert.equal(replacement.paymentMethod, "Visa (demo)");
  assert.equal(replacement.paymentStatus, "Paid (demo)");
  assert.equal(
    replacement.commission,
    Number((replacement.price * 0.1).toFixed(2)),
  );
  assert.equal(
    replacement.ownerNet,
    Number((replacement.price * 0.9).toFixed(2)),
  );
  await assert.rejects(require('./helpers/test-actor.cjs').asAdmin(context,()=>store.remove("bookings",replacement.id)),/linked history/);
  await assert.rejects(require('./helpers/test-actor.cjs').asAdmin(context,()=>store.remove("bookings",booking.id)),/linked history/);
  // Leave the field for the storage-failure check below.
  // Exercise dashboard menus, ownership and player actions in isolated DOMs.
  function dashboardHarness(account, hash = "") {
    const elements = {},
      events = {};
    let overview;
    function element(id) {
      if (!elements[id])
        elements[id] = {
          textContent: "",
          innerHTML: "",
          hidden: false,
          elements: {},
          querySelectorAll: () => [],
          classList: { remove() {} },
          addEventListener(name, handler) {
            this[name] = handler;
          },
          showModal() {
            this.open = true;
          },
          close() {
            this.open = false;
          },
          insertAdjacentHTML(position, html) {
            this.innerHTML += html;
          },
        };
      return elements[id];
    }
    const dashboardContext = {
      KicksDialogs: { open: dialog => dialog.showModal() },
      KicksStore: { ...store, watchActivityClock() {} },
      KicksAuth: {
        ...auth,
        requireRole: (role) => (role === account.role ? account : null),
      },
      KicksDashboardOverview: {
        render(options) {
          overview = options;
        },
      },
      location: { hash },
      document: {
        body: {
          dataset: { dashboard: account.role },
          classList: { remove() {} },
        },
        getElementById: element,
        querySelectorAll: () => [],
        addEventListener: (name, handler) => (events[name] = handler),
      },
      window: { addEventListener() {} },
      setTimeout: () => 1,
      clearTimeout,
      Image: class {},
      FormData,
      Date,
    };
    vm.runInNewContext(
      fs.readFileSync("js/dashboard.js", "utf8"),
      dashboardContext,
    );
    return { elements, events, overview };
  }
  const ownerView = dashboardHarness(owner);
  assert(ownerView.elements.dashNav.innerHTML.includes("#bookings"));
  assert(ownerView.elements.dashNav.innerHTML.includes("#memberships"));
  assert.equal(ownerView.overview.getRecords("fields").length, 1);
  const otherField = (await require('./helpers/test-actor.cjs').save(context,"fields", {
    ...field,
    id: undefined,
    name: "Other owner field",
    ownerId: 1,
  }));
  assert.equal(ownerView.overview.getRecords("fields").length, 1);
  const usersView = dashboardHarness(store.find("users", 1), "#users");
  assert(!usersView.elements.dashboardView.innerHTML.includes('data-delete="users"'));
  assert(usersView.elements.dashboardView.innerHTML.includes('data-account-access="'));
  const adminView = dashboardHarness(store.find("users", 1));
  assert.equal(adminView.overview.getRecords("fields").length, 2);
  assert(adminView.elements.dashNav.innerHTML.includes("#registrations"));
  assert(adminView.elements.dashNav.innerHTML.includes("#bookings"));
  for (const profileAccount of [player, owner, store.find("users", 1)]) {
    const profileView = dashboardHarness(profileAccount, "#profile");
    assert(
      profileView.elements.dashboardView.innerHTML.includes('id="editProfile"'),
    );
    assert(
      !profileView.elements.dashboardView.innerHTML.includes(
        'id="personalForm"',
      ),
    );
    profileView.elements.editProfile.click();
    assert(
      profileView.elements.dashboardView.innerHTML.includes(
        'id="personalForm"',
      ),
    );
    assert(
      profileView.elements.dashboardView.innerHTML.includes(
        'id="avatarUpload"',
      ),
    );
    profileView.elements.cancelProfileEdit.click();
    assert(
      profileView.elements.dashboardView.innerHTML.includes('id="editProfile"'),
    );
    assert(
      !profileView.elements.dashboardView.innerHTML.includes(
        'id="personalForm"',
      ),
    );
  }
  const ownerEditor = dashboardHarness(owner, "#fields");
  ownerEditor.events.click({
    target: {
      closest: () => ({ dataset: { edit: "fields", id: String(field.id) } }),
    },
  });
  assert(
    ownerEditor.elements.editorFields.innerHTML.includes("fieldPhotoUpload"),
  );
  assert(!ownerEditor.elements.editorFields.innerHTML.includes("edit-rating"));
  const newGame = (await require('./helpers/test-actor.cjs').save(context,"games", { ...game, id: undefined, joined: 0,date:"2100-01-03" }));
  (await assert.rejects(async () => (await store.join(player.id, "games", newGame.id)), /playing position/));
  (await assert.rejects(async () => (await store.join(player.id, "games", newGame.id, {position:"Striker"})), /playing position/));
  assert.equal(store.find("games", newGame.id).joined, 0);
  const newEntry = (await store.join(player.id, "games", newGame.id, {position:"Defender",position:"Defender"}));
  assert.equal(newEntry.position, "Defender");
  const playerView = dashboardHarness(player, "#memberships");
  assert(playerView.elements.dashboardView.innerHTML.includes("Defender"));
  playerView.events.click({
    target: {
      closest: () => ({
        dataset: { cancel: "memberships", id: String(newEntry.id) },
      }),
    },
  });
  assert(!playerView.elements.dashboardView.innerHTML.includes("data-cancel"));
  assert(!playerView.elements.confirmDialog?.open);
  assert.equal(store.find("games", newGame.id).joined, 1);
  assert.equal(store.find("memberships", newEntry.id).status, "Joined");
  await assert.rejects(require('./helpers/test-actor.cjs').asAdmin(context,()=>store.remove("games",newGame.id)),/linked history/);
  await require('./helpers/test-actor.cjs').asAdmin(context,()=>store.remove("fields",otherField.id));

  // Transactions fail without changing in-memory data when browser storage is full.
  context.localStorage.setItem = () => {
    throw Error("Quota exceeded");
  };
  (await assert.rejects(
    async () => (await require('./helpers/test-actor.cjs').save(context,"fields", { name: "Unsaved Pitch",ownerId:owner.id,price:25 }, {method:"Visa demo",amount:5})),
    /storage/,
  ));
  assert.equal(store.list("fields").length, 1);

  // Overview tables show the right kind of information for each role.
  function renderOverview(role) {
    const records = {
      fields: [{ id: 1, name: "KICKS Arena", city: "Amman", type: "5v5" }],
      games: [
        {
          id: 1,
          title: "Friday Kickabout",
          durationMinutes: 60,
          fieldId: 1,
          date: "2100-01-01",
          time: "18:00",
        },
      ],
      tournaments: [],
      bookings: [
        {
          id: 1,
          userId: 2,
          fieldId: 1,
          date: "2100-01-02",
          time: "19:00",
          price: 25,
          status: "Confirmed",
        },
      ],
      memberships: [],
      registrations: [],
      users: [
        {
          id: 2,
          name: "Test Player",
          email: "player@test.local",
          role: "player",
          status: "Active",
        },
      ],
    };
    let html = "";
    const overviewContext = {
      KicksStore: { ...store, escape: (value) => String(value ?? ""), list: () => [] },
      KicksAuth: { fieldImage: () => "field.jpg" },
      document: {
        getElementById: () => ({ dataset: {},
          set innerHTML(value) {
            html = value;
          },
        }),
      },
      window: {},
      Date,
    };
    vm.runInNewContext(
      fs.readFileSync("js/dashboard-overview.js", "utf8"),
      overviewContext,
    );
    overviewContext.window.KicksDashboardOverview.render({
      role,
      labels: {
        games: "Open games",
        tournaments: "Tournaments",
        memberships: "My games",
        registrations: "My tournaments",
      },
      getRecords: (name) => records[name] || [],
      getRecord: (name, id) =>
        (records[name] || []).find((row) => row.id === id),
    });
    return html;
  }
  const playerOverview = renderOverview("player");
  assert(playerOverview.includes("Your active bookings"));
  assert(playerOverview.includes("Your activity"));
  assert(playerOverview.includes("booking-donut"));
  assert(playerOverview.includes("KICKS Arena"));
  const ownerOverview = renderOverview("owner");
  assert(ownerOverview.includes("Activity by field"));
  assert(ownerOverview.includes("Your field activity"));
  assert(ownerOverview.includes("Active bookings"));
  const adminOverview = renderOverview("admin");
  assert(adminOverview.includes("Platform activity"));
  assert(adminOverview.includes("Latest bookings"));
  assert(adminOverview.includes("Recent accounts"));
  assert(adminOverview.includes("Test Player"));
  console.log(
    "PASS: signup, role-based login, role-specific dashboard overviews, profiles, bookings, event joining and storage failure handling.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

})().catch(error => { console.error(error); process.exitCode = 1; });
