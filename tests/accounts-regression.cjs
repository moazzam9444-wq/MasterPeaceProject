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
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/admin-account.js", "utf8"), context);
vm.runInContext(fs.readFileSync("js/data-store.js", "utf8"), context);
assert.equal(context.window.KicksStore.list("fields").length, 9);
assert.equal(context.window.KicksStore.list("games").length, 6);
assert.equal(context.window.KicksStore.list("tournaments").length, 3);
const seeded = JSON.parse(stored);
assert.ok(
  seeded.games.every(
    (game) =>
      seeded.fields.some((field) => field.id === game.fieldId) &&
      game.joined === 0,
  ),
);
assert.ok(
  seeded.tournaments.every(
    (cup) =>
      seeded.fields.some((field) => field.id === cup.fieldId) &&
      cup.teams === 0,
  ),
);
vm.runInContext(fs.readFileSync("js/data-store.js", "utf8"), context);
assert.equal(context.window.KicksStore.list("fields").length, 9);
// Run account tests on an isolated empty catalogue marked as already provisioned.
stored = JSON.stringify({ ...seeded, fields: [], games: [], tournaments: [] });
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
  assert.equal(auth.current().id, player.id);
  assert(!stored.includes("Testpass123!"));
  assert.equal(auth.current().passwordHash, undefined);
  auth.afterLogin(player);
  assert.equal(navigation, "http://127.0.0.1:4173/index.html");
  context.location.search = "?returnTo=" + encodeURIComponent("/Pages/Fields/field-details.html?id=1");
  auth.afterLogin(player);
  assert.equal(navigation, "http://127.0.0.1:4173/Pages/Fields/field-details.html?id=1");
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
  const owner = await auth.register({
    name: "Test Owner",
    email: "owner@test.local",
    password: "Testowner123!",
    role: "owner",
  });
  auth.logout();
  const signedInOwner = await auth.login("owner@test.local", "Testowner123!");
  assert.equal(signedInOwner.role, "owner");
  auth.afterLogin(signedInOwner);
  assert.equal(navigation, "http://127.0.0.1:4173/Pages/Dashboard/owner.html");
  assert.equal(auth.requireRole("admin"), null);
  assert.match(navigation, /owner.html$/);
  const field = store.save("fields", {
    name: "Test Pitch",
    ownerId: owner.id,
    city: "Amman",
    price: 25,
  }, { method: "Visa demo", amount: store.settings().listingFee });
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
  store.save("users", {
    ...store.find("users", player.id),
    ...credentials,
    phone: "+962790000000",
    address: "Amman",
  });
  auth.logout();
  await assert.rejects(auth.login("player@test.local", "Testpass123!"));
  await auth.login("player@test.local", "Changedpass123!");
  assert.equal(auth.current().phone, "+962790000000");
  const booking = store.book(player.id, field.id, "2100-01-01", "18:00", { method: "Visa demo", amount: 25 });
  assert.equal(booking.price, 25);
  assert.equal(booking.status, "Confirmed");
  assert.throws(
    () => store.book(player.id, field.id, "2100-01-01", "18:00"),
    /slot/,
  );
  assert.throws(
    () => store.book(owner.id, field.id, "2100-01-01", "19:00"),
    /player/,
  );
  assert.throws(
    () => store.book(player.id, field.id, "2000-01-01", "18:00"),
    /future/,
  );
  assert.throws(() => store.remove("fields", field.id), /bookings/);
  const game = store.save("games", {
    title: "Test Game",
    fieldId: field.id,
    date: "2100-01-01",
    time: "20:00",
    joined: 0,
    capacity: 1,
    price: 0,
  });
  store.join(player.id, "games", game.id);
  assert.equal(store.find("games", game.id).joined, 1);
  assert.throws(() => store.join(player.id, "games", game.id), /already/);
  const cup = store.save("tournaments", {
    name: "Test Cup",
    fieldId: field.id,
    date: "2100-01-02",
    time: "20:00",
    teams: 0,
    capacity: 8,
    fee: 0,
  });
  store.join(player.id, "tournaments", cup.id, { teamName: "Test Team" });
  assert.equal(store.find("tournaments", cup.id).teams, 1);
  assert.throws(() => store.remove("users", 1), /administrator/);
  // Full player cycle: leave, rejoin and prevent double-counting.
  const membership = store.list("memberships")[0];
  assert.throws(
    () => store.leave(owner.id, "memberships", membership.id),
    /player/,
  );
  store.leave(player.id, "memberships", membership.id);
  assert.equal(store.find("games", game.id).joined, 0);
  assert.throws(
    () => store.leave(player.id, "memberships", membership.id),
    /inactive/,
  );
  store.join(player.id, "games", game.id);
  assert.equal(store.find("games", game.id).joined, 1);
  assert.equal(store.list("memberships").length, 1);
  const registration = store.list("registrations")[0];
  store.leave(player.id, "registrations", registration.id);
  assert.equal(store.find("tournaments", cup.id).teams, 0);
  store.join(player.id, "tournaments", cup.id, { teamName: "New Team" });
  assert.equal(store.find("tournaments", cup.id).teams, 1);
  assert.equal(store.list("registrations").length, 1);
  // Field management keeps edits; deleting an event removes its linked entries.
  store.save("fields", {
    ...store.find("fields", field.id),
    description: "Updated venue",
    amenities: "Parking",
    photo: "data:image/jpeg;base64,dGVzdA==",
  });
  assert.equal(store.find("fields", field.id).description, "Updated venue");
  store.remove("games", game.id);
  assert.equal(store.list("memberships").length, 0);
  store.remove("tournaments", cup.id);
  assert.equal(store.list("registrations").length, 0);
  store.save("bookings", { ...booking, status: "Cancelled" });
  const replacement = store.book(player.id, field.id, "2100-01-01", "18:00", {
    method: "Visa demo",
  });
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
  store.remove("bookings", replacement.id);
  store.remove("bookings", booking.id);
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
      KicksStore: store,
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
  assert(!ownerView.elements.dashNav.innerHTML.includes("#bookings"));
  assert(!ownerView.elements.dashNav.innerHTML.includes("#memberships"));
  assert.equal(ownerView.overview.getRecords("fields").length, 1);
  const otherField = store.save("fields", {
    ...field,
    id: undefined,
    name: "Other owner field",
    ownerId: 1,
  });
  assert.equal(ownerView.overview.getRecords("fields").length, 1);
  const adminView = dashboardHarness(store.find("users", 1));
  assert.equal(adminView.overview.getRecords("fields").length, 2);
  assert(!adminView.elements.dashNav.innerHTML.includes("#registrations"));
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
  const newGame = store.save("games", { ...game, id: undefined, joined: 0 });
  const newEntry = store.join(player.id, "games", newGame.id);
  const playerView = dashboardHarness(player, "#memberships");
  playerView.events.click({
    target: {
      closest: () => ({
        dataset: { cancel: "memberships", id: String(newEntry.id) },
      }),
    },
  });
  playerView.elements.confirmAction.click();
  assert.equal(store.find("games", newGame.id).joined, 0);
  assert.equal(store.find("memberships", newEntry.id).status, "Left");
  store.remove("games", newGame.id);
  store.remove("fields", otherField.id);

  // Transactions fail without changing in-memory data when browser storage is full.
  context.localStorage.setItem = () => {
    throw Error("Quota exceeded");
  };
  assert.throws(
    () => store.save("fields", { name: "Unsaved Pitch" }),
    /storage/,
  );
  assert.equal(store.list("fields").length, 1);

  // Overview tables show the right kind of information for each role.
  function renderOverview(role) {
    const records = {
      fields: [{ id: 1, name: "KICKS Arena", city: "Amman", type: "5v5" }],
      games: [
        {
          id: 1,
          title: "Friday Kickabout",
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
      KicksStore: { escape: (value) => String(value ?? ""), list: () => [] },
      KicksAuth: { fieldImage: () => "field.jpg" },
      document: {
        getElementById: () => ({
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
  assert(playerOverview.includes("Your upcoming bookings"));
  assert(playerOverview.includes("Your activity"));
  assert(playerOverview.includes("booking-donut"));
  assert(playerOverview.includes("KICKS Arena"));
  const ownerOverview = renderOverview("owner");
  assert(ownerOverview.includes("Upcoming activity by field"));
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
