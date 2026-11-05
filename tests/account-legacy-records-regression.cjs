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
const fixture=JSON.parse(fs.readFileSync('.local/data-audit/demo-fixture.json','utf8'));
fixture.users.unshift({id:99999,name:'Legacy account without email',role:'player',status:'Inactive'});
stored=JSON.stringify(fixture);
const registered=await auth.register({name:'New sample registration',email:'new-legacy-test@example.test',password:'Example123!',role:'player'});
assert.equal(registered.status,'Pending');
await assert.rejects(auth.login('missing@example.test','Example123!'),/incorrect/);
await auth.login('sample200@kicks.example.test','KicksDemo2026!');
assert.equal(auth.current().id,200);
assert(store.list('users').some(u=>u.id===99999&&u.email===undefined));
console.log('PASS: legacy missing-email record neither blocks registration/login nor gets overwritten.');
})().catch(e=>{console.error(e);process.exit(1)});
