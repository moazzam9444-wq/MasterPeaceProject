// Deterministic FIFO Web Locks test double shared across VM contexts.
let tail = Promise.resolve();
exports.install = context => {
  // IndexedDB test double: scoped to the same Storage object as the VM origin.
  if (!context.indexedDB) {
    const records = context.localStorage ? (context.localStorage.__snapshots ||= new Map()) : new Map();
    context.indexedDB = {open() {
      const request = {};
      const db = {createObjectStore() {}, transaction() {
        const tx = {objectStore() {return {
          get(key) {const op = {}; Promise.resolve().then(() => {op.result = records.get(key); tx.oncomplete?.();}); return op;},
          put(value,key) {const op = {}; Promise.resolve().then(() => {records.set(key,value); tx.oncomplete?.();}); return op;}
        };}};
        return tx;
      }};
      Promise.resolve().then(() => {request.result = db; request.onsuccess?.();});
      return request;
    }};
  }
  if (context.navigator?.locks) return context;
  context.navigator = { ...context.navigator, locks: { request(name, options, callback) {
    if (typeof options === 'function') callback = options;
    const result = tail.then(() => callback({name, mode:'exclusive'}));
    tail = result.catch(() => {});
    return result;
  } } };
  return context;
};
