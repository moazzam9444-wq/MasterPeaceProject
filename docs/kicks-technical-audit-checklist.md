# Technical audit checkpoint

Use the newest Batch 2 checkpoint at the end. Earlier unchecked items are historical, not instructions to redo resolved work. KICKS-008 remains an active data-integrity blocker; cleanup is deferred.

## Batch 1 ? 2026-11-05
- [x] Confirm static runtime, 19 HTML routes, three roles and current storage/transaction boundary.
- [x] Read previous audit and preserve KICKS-012/004/007/008.
- [x] Run 12 high-risk baseline suites: all passed.
- [x] Reproduce KICKS-005 with failing desired-behavior regression before implementation.
- [x] Strict calendar validation in booking/future-time checks, availability and lifecycle interpretation; no migration.
- [x] Unit boundary cases: eight invalid and four valid dates.
- [x] Run 20 regression suites: 19 passed; navigation static scanner remains a confirmed test defect.
- [x] SQL documentation schema check passed; no SQL runtime exists to integration-test.
- [x] Reproduce unresolved generic-write/identity/deletion defects in isolated VM storage.
- [x] Normal-login browser booking/concurrency: five checks passed; UI quality suite and homepage regression passed.

## Next batches ? highest risk first
- [ ] KICKS-001: map every generic save/remove/settings caller; enforce session-derived authorization without breaking registration, profile, owner/admin workflows.
- [ ] KICKS-002: validate generic mutations, booking transitions and same-collection occupancy; preserve legacy records.
- [ ] KICKS-003: bind booking/join actions to verified current actor and migrate unit fixture contracts.
- [ ] KICKS-006: preserve financial history and repair deletion/reference policy without deleting user records.
- [ ] KICKS-009: stale field-price presentation and checkout refresh.
- [ ] KICKS-010: completed tournament visibility for non-captains.
- [ ] KICKS-011: navigation scanner falsely reads inline template ${url} as a file.
- [ ] Complete normal-UI registration, failed login/logout, password/profile/session lifecycle E2E.
- [ ] Complete game/team/challenge/tournament/bracket/meeting CRUD E2E across all roles, failure and concurrency states.
- [ ] Complete assistant malformed-provider/error and private-data checks, messaging ownership/concurrency.
- [ ] Review XSS/upload/redirect surfaces, dependencies and deployment headers; no secrets printed.
- [ ] Measure performance before any optimization; no optimization claim yet.
- [ ] Exhaustive route/modal/error coverage and final regression.

Known architectural blocker to production: client-controlled identities and storage, no trusted shared backend, no cross-device reservation constraint, simulated payments. Do not claim production security or readiness. A backend or database requires separate approval; none added.


## Batch 2 - interrupted work resumed
- [x] Working tree and batch-2 backups inspected; previous changes preserved.
- [x] Runtime checks implemented for KICKS-001/002/003/006; eleven focused mutation tests pass.
- [x] KICKS-011 static navigation scanner corrected; navigation regression executed successfully.
- [x] Existing VM fixtures migrated to explicit authorized administrator setup, not a runtime bypass.
- [x] Accounts quota regression now supplies a valid authorized paid listing and reaches the intended storage error.
- [x] All 21 non-browser regression suites passed; old vulnerability evidence runner converted to desired rejection assertions.
- [ ] Verify normal-login owner/admin/player workflows and all affected browser regressions.
- [ ] Finish remaining audit areas before broad cleanup. Do not label full audit complete yet.

Resume evidence: .local/technical-audit/batch-2 contains pre-change source/test backups, inventory hashes, failing-before log and mutation-results.json. Earlier Batch 1 counts and unresolved lists are historical; Batch 2 changes are not yet fully browser-verified.

### Batch 2 current browser checkpoint
- [x] Normal-login Player/Owner/Admin integrity suite passed 6 checks: guest denial, player impersonation/escalation denial, owner form edit, invalid booking/deletion rejection, self profile and admin settings UI.
- [x] Technical booking browser suite passed 5 checks, including real two-tab slot contention and simulated payment cancel/confirm/history.
- [x] KICKS-009 and KICKS-010 reproduced with failing tests/live-state-browser.cjs; fixed and 3 live-state checks passed (price updates, stale quote close/no payment, completed non-captain roster history).
- [x] Existing homepage regression migrated to actual admin-login fixture setup and passed all 13 checks.
- [x] Existing feature browser suite migrated setup and passed registration, nearby search, assistant, positions, messages, account deactivation and public/mobile checks.
- [x] Existing field/event scheduling browser suite migrated to actual fixture logins and passed all 6 checks.
- [x] Entire 52-script suite attempted. Initial pass: 37 exit-zero, 15 failures/timeouts. This is an INITIAL run, not final evidence; some tests ran before the latest test migrations. complete-suite.json/logs retain results.
- [ ] Retry browser-regression after opening the now-collapsed Refine search panel normally.
- [ ] Retry concurrent-store-browser after navigating authorized admin tabs back to Contact for feedback failure tests.
- [ ] Migrate remaining unauthorized fixture writes in dialogs-flow-browser and premium-shell-browser.
- [ ] Investigate focused-motion/visual-editorial hover timing failures; do not change animations to satisfy timing assertions.
- [ ] Update structural-fields-workflows assistant locator for the approved floating launcher; rerun.
- [ ] Update demo-population evidence expectations for resolved 009/010 and use actual admin login for price change; rerun.
- [ ] Investigate database-browser async clipboard assertion, premium-shell-interactions stale dark color expectation, and two visual-suite timeouts.
- [ ] Rerun entire suite after all migrations; retain initial and final outcomes separately.
- [ ] Complete remaining security/input/messaging/date/entity/deletion audit. Broad cleanup remains deferred, as requested, until this work and regressions are complete.

Additional reproduced/fixed integrity gaps: future bookings cannot be marked Completed early to release their slots; deleting users cannot orphan financial roles or immutable tournament-roster entries. These have failing-before evidence and explicit passing mutation assertions. Linked deletion now refuses destructive operations with actionable errors; no existing records are migrated or deleted.

## Batch 2 superseding checkpoint ï¿½ resumed verified work

- [x] KICKS-001/002/003/006 central authorization, booking/activity mutation, actor binding and linked-history preservation implemented and regression-tested.
- [x] KICKS-009/010 reproduced in real browser and corrected; three live-state checks pass.
- [x] KICKS-011 scanner fixed; navigation test passes.
- [x] KICKS-013 activity references/values, KICKS-014 missing legacy email, KICKS-015 malformed storage shapes reproduced and corrected.
- [x] All 23 focused unit regression scripts pass; mutation-integrity has 15 focused cases.
- [x] Earlier pending browser fixture migrations completed: browser/dialogs/premium shell/fields workflows/demo population/clipboard/hover/theme assertions executed successfully in the later full runs.
- [x] Actual login used by new integrity, booking, live-state and stress suites. Legacy visual session fixtures are not evidence of authentication enforcement.
- [x] All 19 HTML routes scanned; 50 JS files parsed; 118 protected presentation files retain baseline hashes.
- [x] Stored-text browser injection checks passed five selected surfaces.
- [x] Full pre-cleanup 57-script run completed: 55 zero exits, two failures retained.
- [x] Team browser login helper navigation race corrected; focused rerun in progress.
- [ ] KICKS-008 REOPENED: real two-tab stress loses acknowledged feedback despite Web Locks. Evidence and new stress regression retained. Timer experiment failed and was removed. Snapshot guard passes deterministic test but is not a cross-renderer guarantee.
- [ ] Record latest complete-suite and separate visibility-stress outcomes. Do not call this the final green suite.
- [ ] Finish untested account/password lifecycle, assistant error/provider/privacy, role CRUD and meeting-media states.
- [ ] Dependency/header and performance/memory review; no optimization measured.
- [ ] Safe cleanup deferred until preceding audit/fix/regression gates pass.
- [ ] Final full-suite run after cleanup; no final-cleanup claim yet.

Previous unchecked entries above are historical; use this section and the newest report checkpoint for resume. Do not repeat completed scans blindly. Current highest-risk blocker is observed cross-tab stale-storage overwrite, not the resolved generic authorization defects.

### Latest additions
- [x] KICKS-016 settings validation reproduced, fixed, ten rejection cases plus valid boundaries/partial updates pass; payment/account/store regressions rerun.
- [x] KICKS-014 dashboard comparison reproduced with missing-email legacy fixture; real profile/password save now passes without repairing/deleting that record.
- [x] New snapshot guard tested with successive existing startup writes; self-conflict corrected, booking bytes/history retained.
- [x] Seven normal-login account/password and assistant failure/duplicate-submit checks pass.
- [x] Chrome stress independently reproduces KICKS-008 (157/160 acknowledged records retained). Keep this issue open.
- [x] Reusable loopback-only regression runner added; individual settings/startup tests executed through it.
- [x] Loopback response headers and selected performance observations recorded; no production-header or performance-improvement claim.
- [x] Distinguish 19 application routes + one static documentation route, 26 rendered dashboard tabs, and selected CRUD E2E coverage.
- [ ] Final 61-script ledger currently has one outstanding screenshot suite; visibility stress is a confirmed failing test. Record completion before final report.
- [ ] Broad cleanup and post-cleanup regression remain deliberately unstarted while the integrity gate fails.

## Final resume position — do not restart

- [x] Complete 61-script verification run recorded: **60 pass, 1 fail, no timeouts**. Ledger: `.local/technical-audit/batch-2/verification/complete-suite.json`.
- [x] Only full-run failure is the real `concurrent-visibility-browser.cjs` data-loss reproduction; shorter same-origin coordination tests passing do not resolve it.
- [x] Final focused unit run: **25/25 pass**. All 50 application JS files parse.
- [x] Final dashboard legacy-email change verified by rerunning the 7-check account/assistant suite, legacy-account unit and 15-case mutation suite.
- [x] Final source-preservation and changed-file inventories saved; 118 protected presentation files unchanged, existing user data untouched.
- [x] Current report distinguishes historical failures, actual full run, targeted later reruns, rendered tabs, and untested permutations.
- [ ] **NEXT: KICKS-008 frontend-only cross-tab handoff/visibility correction.** Reproduce with existing stress test; do not weaken assertions, add arbitrary sleeps, claim guaranteed safe Web Locks persistence, introduce a second data system, or touch real storage. Include every writer and lifecycle/failure tests in any proposed fix.
- [ ] Finish exhaustive role/CRUD/error/media/security dependency and performance coverage still listed above.
- [ ] Only then perform comprehensive safe cleanup and rerun every test. No cleanup or final all-green status is claimed at this checkpoint.

Source/test backups, failing-before traces, final logs, screenshot artifacts and exact file list are retained under `.local/technical-audit/batch-2/`. Existing server processes and user working tree were preserved. No backend, database, framework, destructive migration or data reset was introduced.
- [x] New runner's failing-test path executed: visibility regression reproduces at iteration 4; process exits 1. Full-run iteration-75 evidence remains in its own log.
