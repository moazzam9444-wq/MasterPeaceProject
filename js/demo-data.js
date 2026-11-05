/*
 * Compatibility entry point for pages that still load demo-data.js.
 *
 * KICKS-012: automatic legacy cleanup is disabled. A demo tag or a relation
 * to a tagged record is not permission to delete bookings, accounts, ledger
 * history, messages, squad members, or any other stored data.
 *
 * Keep every existing record and session unchanged. Do not read, rewrite,
 * reset, archive, or repair storage on page load. Explicit isolated demo
 * initialization remains in full-demo.js; any future legacy archival needs
 * its own reviewed, non-destructive migration.
 */
(() => {
  'use strict';
  // Deliberately no automatic migration or storage access.
})();
