# KICKS technical audit ? current checkpoint

**Resume note:** Batch 1 below is historical. The latest Batch 2 checkpoint and final test ledger at the end supersede its unresolved-issue list. The full audit/cleanup is not complete; KICKS-008 has been reopened after real-browser data loss.

Date: 2026-11-05. This is an incremental audit checkpoint, not a declaration of production readiness or a completed full-system audit. Resume from `kicks-technical-audit-checklist.md`.

## 1. Actual architecture

The application is static HTML/CSS/vanilla JavaScript, with three roles (Player, Owner, Admin). There are 19 HTML routes and role-specific dashboard hash tabs. There is no running business backend, HTTP business API, controller framework, deployed database connection, package-manager dependency manifest or server-enforced booking constraint in this project. `scripts/demo-server.cjs` is a loopback static file server, not an application API. The audited local application runs at http://127.0.0.1:4181/ using the existing development server. No server or framework was added.

`js/data-store.js` provides KicksStore. The catalogue is one JSON document in localStorage key kicks-data-v2. SessionStorage holds a numeric account identifier; `KicksAuth.current()` resolves an Active stored account and strips password hash/salt from its profile return value. Passwords use salted Web Crypto PBKDF2. These mechanisms provide local prototype behavior, not trusted server identity, session expiration, cross-device data isolation or server authorization. No password reset endpoint was found. Do not print credentials or private records in reports.

Reads are synchronous snapshots; writes are asynchronous Web Locks transactions under kicks-storage-v2. Lock acquisition precedes fresh storage reads and mutation/persistence. Unsupported coordination, malformed storage, write failures and stale records are rejected by the existing mechanisms. Transactions only coordinate cooperating current-version tabs on one origin; direct localStorage manipulation, old-version tabs and other devices are outside that guarantee.

Other stores include messages in kicks-messages-v1, theme preference and opt-in demo metadata. Payment behavior is explicitly simulated, with local ledger/balance records; there is no processor confirmation. Meeting media is browser functionality, not evidence of a production conferencing backend. GSAP/ScrollTrigger/SplitText/Lenis and existing browser/UI libraries supply presentation. The assistant uses a local parser/search provider by default; provider injection exists but no live model API was tested. SQL/schema files are documentation/proposed infrastructure: the schema check passes, but no live SQL constraints or database transactions were exercised.

## 2. Entities and workflows

Users own fields, organize games and captain teams. Bookings reference users and fields. Game memberships reference games/users. Tournament registrations reference tournaments, captain users and team/roster snapshots; brackets are embedded tournament state. Challenges connect teams and can link bookings. Team requests manage membership/leave decisions. Payments reference source collection/record and user/owner/admin ledgers. Meetings can reference tournaments and invited participants. Feedback, settings and messages support secondary areas. No schema or storage migration was performed.

Booking UI: discover field -> choose future Amman date/hour -> open demo-payment dialog -> confirm -> atomic local booking/ledger write -> confirmation/history. Cancelling the demo-payment dialog writes nothing. Player booking cancellation is intentionally disabled by existing rules; no new cancellation permission was introduced. Existing organizers/admin actions require their separate policy audit.

Routes discovered (reused from the recent verified route inventory):
- `index.html`
- `Pages/Fields/fields.html`
- `Pages/Fields/field-details.html?id=1001`
- `Pages/OpenGames/open-games.html`
- `Pages/OpenGames/game-details.html?id=2001`
- `Pages/Teams/teams.html`
- `Pages/Challenges/challenges.html`
- `Pages/Tournaments/tournaments.html`
- `Pages/Tournaments/tournament-details.html?id=3001`
- `Pages/Meetings/meeting.html?id=10001`
- `Pages/About/about.html`
- `Pages/Contact/contact.html`
- `Pages/Auth/login.html`
- `Pages/Auth/register.html`
- `Pages/Dashboard/player.html`
- `Pages/Dashboard/owner.html`
- `Pages/Dashboard/admin.html`
- `Pages/Demo/demo.html`
- `Pages/Demo/catalogue.html`

## 3. Fix implemented: KICKS-005, invalid calendar normalization (P1)

**Affected functions:** isFuture, endsAt, isFieldSlotAvailable in js/data-store.js.

**Reproduce:** with an authenticated fictional player, request a reservation on a future February 30. Before the correction, JavaScript normalized the timestamp into March, passed future validation and persisted the original impossible date. The desired-behavior regression failed with Missing expected rejection before implementation; `.local/technical-audit/calendar-before.log` retains evidence.

**Expected:** reject impossible dates before availability/payment writes, retain valid leap dates and Amman time rules.

**Root cause:** Date parsing alone was used as calendar validation. A finite/future timestamp does not prove the supplied calendar date exists.

**Correction:** require exact YYYY-MM-DD, a valid UTC date round-trip and valid HH:mm before interpreting the original +03:00 schedule. Availability rejects invalid dates. Invalid legacy schedule end times are reported as unknown instead of normalized; existing records remain untouched. No API signature changed, public read APIs remain synchronous and mutation APIs remain asynchronous.

**Evidence:** eight invalid dates rejected without storage changes; four valid boundary dates accepted, including leap-year February 29. A normal-login browser test rejects February 30 without writes; two actual tabs contending for one slot produce one booking and one simulated ledger payment. UI date/slot selection, payment-dialog cancellation/confirmation and history passed.

**Important limit:** generic save remains a separate bypass (KICKS-002). This correction does not imply that arbitrary generic mutation payloads are validated or authorized.

## 4. Historical Batch 1 unresolved defects

The existing evidence runner was executed in disposable VM storage and reproduced these four failures. Its successful exit means the defects were reproduced, not that the application passed a security test.

| ID | Priority | Confirmed behavior / affected surface | Next safe correction |
|---|---|---|---|
| KICKS-001 | P0 for any production deployment | Guest generic save creates a privileged account, updates settings and reassigns field ownership. Generic save/remove/settings do not consistently enforce UI permissions. | Complete caller inventory, then enforce actor-derived per-collection policy preserving registration/profile/owner/admin paths. Trusted authorization ultimately needs a backend. |
| KICKS-002 | P1 | Generic booking save accepts orphan IDs, negative amounts, invalid dates, duplicate confirmed slots and invalid status restoration. | Central mutation validation and existing transition rules, referential and same-collection occupancy checks inside coordinated transactions; retain legacy history. |
| KICKS-003 | P1 | A player passes another player's ID to book/join, recording the other identity. | Bind actions to the current verified local actor; review legitimate delegated/admin flows and migrate affected tests/callers. This alone cannot secure client-controlled storage. |
| KICKS-006 | P1 | Activity deletion removes memberships but leaves payment source IDs dangling; cancelled meetings retain deleted tournament references. | Decide an archival/reference-preservation policy consistent with financial history before changing deletion behavior; no destructive cleanup. |

These are not silently deferred as safe behavior. Completing the generic-write policy requires auditing all account/registration/profile/dashboard/payment/store-transaction callers and regressions; a partial allowlist could break legitimate account creation or leave alternate writes open. That migration was not attempted in this bounded batch. No backend was introduced as a workaround.

Previously documented KICKS-009 (stale field-price presentation) and KICKS-010 (completed tournament visibility for non-captains) remain queued and were not newly reproduced in this batch. KICKS-011 is a confirmed test defect: the static navigation scanner treats inline JavaScript template ${url} in the demo catalogue as a literal path. Its failure is recorded rather than hidden or marked passing.

## 5. Tests actually executed

- Twelve high-risk baseline suites passed before the correction, and again after: legacy cleanup preservation, field/event conflicts, team authorization, concurrent store, accounts, store, payments, teams, challenges, lifecycle, discovery and SQL documentation schema check.
- Twenty distinct `*-regression.cjs` non-browser suites were executed after the correction: **19 passed, 1 failed**. Exact filenames/exit codes and logs: `.local/technical-audit/unit-results.json` and sibling logs. Failure: navigation-regression.cjs, the template-expression scanner defect above. No timeout was recorded.
- database-schema-check.cjs additionally passed. This verifies schema documentation, not a live SQL integration.
- audit-business-logic-reproductions.cjs reproduced four unresolved defects and verified KICKS-004/005/007/008 rejection/coordination outcomes.
- New technical-booking-browser.cjs passed **5 checks**, using actual login forms rather than injected sessions: two actors, invalid-date rejection/no writes, same-slot race, UI simulated-payment cancel/confirm and history. No JS page errors.
- Existing home-floodlights-browser.cjs passed **13 checks**, covering live catalogue/search/availability, accounts/logout/navigation, responsive menus, assistant, FAQ, axe A/AA, motion fallback, GSAP/Lenis/stacking, references and inner-page smoke states.
- Existing ui-quality-browser.cjs passed the account-menu, filter reset and real assistant response/viewport/focus checks. Prior UI changes remain working in those tested states.

VM concurrency doubles test deterministic transaction behavior. The new two-tab test additionally uses actual browser Web Locks. Neither establishes a database-level or cross-device exclusivity constraint. No real payment, notification, production/shared database mutation or existing browser-profile modification occurred.

## 6. Security and failure handling conclusions

No new security vulnerability is claimed resolved in this batch; one business-date defect was fixed. Existing account/store/team/transaction tests cover selected validation and failure behavior, including lock unavailability/rejection, storage quota/read errors, stale updates and rollback/recovery. Broad security claims would be unsupported: client-controlled identities/data are inherently mutable, local copies contain other accounts, and public generic writes remain privileged. There are no server cookies, CSRF middleware, SQL query endpoints, rate limits or trusted payment callbacks here to verify. Those categories are architectural gaps/N/A for this static runtime, not passed backend security tests.

A complete XSS/upload/redirect/sensitive-data and dependency-advisory review remains pending. No secrets or private credentials were printed. Deployment security headers and shared-database integrity have not been validated. Server authentication, authoritative booking transactions and real payment verification would require separately approved backend work.

## 7. Performance

No performance optimization was made or measured. Existing animation and UI features were preserved. No query/N+1 optimization claim is possible without a live data backend. Browser/asset/CPU measurements and memory-leak review remain in the checklist.

## 8. Files changed

- js/data-store.js ? strict calendar/schedule interpretation only; backup at .local/technical-audit/data-store.before.js.
- tests/calendar-integrity-regression.cjs ? new desired-behavior unit regression.
- tests/technical-booking-browser.cjs ? new authenticated browser workflow/concurrency regression.
- tests/audit-business-logic-reproductions.cjs ? KICKS-005 assertion updated to rejection; other defect characterization retained.
- docs/kicks-data-and-logic-audit.md ? appended resolution/test evidence.
- docs/kicks-technical-audit-checklist.md ? persistent resume checklist.
- docs/kicks-technical-audit.md ? this report.

No HTML, styles, Hero/Halftone shader, pitch presentation, UI component code, schema, storage keys or user data changed. KICKS-012/004/007/008 remain covered by passing regressions.

## 9. Remaining work and manual actions

Resume the checklist with KICKS-001/002/003/006, then lifecycle/visibility defects, full role CRUD and authorization E2E, account lifecycle, messaging/assistant failure/privacy, meeting media, exhaustive route/modal states, dependency/security-header review and performance measurement. Browser coverage here is selected workflows, not the whole website. No manual storage reset or migration is required. Do not deploy this as a production booking/payment service on the strength of this batch.

## Batch 2 � current verified checkpoint (2026-11-05)

This section supersedes Batch 1's unresolved/status counts above; Batch 1 is retained as historical evidence. Full audit and cleanup are **not complete**.

### Implemented and verified corrections

| Issue | Root cause and correction | Regression evidence |
|---|---|---|
| KICKS-001 | Generic save/remove/settings trusted UI access. Central per-collection permission checks now resolve the current active stored account, preserve pending registration/self-profile/owner/admin rules, and deny privileged generic collections. | mutation-integrity-regression; mutation-integrity-browser (6 normal-login checks); accounts/team regressions |
| KICKS-002 | Generic booking writes bypassed schedule/reference/transition validation. Validate IDs, strict dates/hour slots, nonnegative amount, occupancy, cancelled/refunded/completed transitions; refuse early completion. | mutation-integrity-regression; booking/payment/event regression suites; technical-booking-browser (5 checks) |
| KICKS-003 | Book/join accepted another player's identity. Require the current active player to match; retain existing administrator delegation. Caller-supplied roles are not proof. | mutation-integrity-regression/browser; normal-login two-player booking race |
| KICKS-006 | Deletion cascades left financial/meeting/roster/message references dangling. Refuse removal of linked records/accounts and retain all history; unlinked removal remains supported. | mutation-integrity-regression, including financial roles, frozen rosters and unreadable message-history cases |
| KICKS-009 | Details retained a field snapshot and stale checkout amount after another tab changed the price. Refresh on storage/data-change/focus/pageshow and close stale checkout without payment. | live-state-browser: reproduced failing before correction; 3 checks pass |
| KICKS-010 | Dashboard hid Completed tournament entries from non-captain frozen-roster members. Include the derived Completed state. | live-state-browser and demo-population-browser |
| KICKS-011 | Static navigation scanner mistook inline JavaScript template strings for HTML resource URLs. Exclude script bodies while retaining script src checks. | navigation-regression passes |
| KICKS-013 | Generic activity mutations admitted invalid field/organizer/participation references and malformed capacity/schedule/meeting values. Validate new/changed values while preserving unchanged incomplete legacy records. | mutation-integrity-regression; existing activity, meeting, tournament and demo suites |
| KICKS-014 | Legacy user rows without email caused registration/login/duplicate checks to throw. Guard email comparisons without rewriting legacy rows. | account-legacy-records-regression; failing-before log retained |
| KICKS-015 | Malformed optional collections/settings/rows could be silently replaced with defaults on a later write. Reject unreadable existing shapes without altering bytes; keep missing legacy optional collections compatible. | storage-shape-regression: ten malformed shapes plus legacy compatibility; failing-before log retained |

A new final raw-snapshot comparison rejects observable intervening changes before persistence. Its deterministic desired-behavior test first failed, then passed. This is **not** proof of atomic cross-renderer compare-and-swap.

### Newly confirmed concurrency blocker � KICKS-008 reopened

Repeated genuine same-origin Edge tab races between feedback append and administrator settings update silently lost acknowledged feedback. Both tabs used actual logins and the existing Web Lock. Instrumented writes show one tab committing a document with fewer feedback entries immediately after the other tab's successful append. This is not merely a stale rendered UI: the entry was still absent from raw storage after settling.

Evidence: `.local/technical-audit/batch-2/concurrency-write-trace.json` (loss at iteration 20), `concurrency-trace.json` (loss at iteration 209), and `concurrency-before-barrier.json` (59 of 60 acknowledged records retained). A zero-delay event-loop barrier was experimentally tested and **did not fix it**; it has been removed. Do not add longer arbitrary sleeps or claim Web Locks alone eliminate this observed case. `tests/concurrent-visibility-browser.cjs` now preserves the real-browser stress regression. The raw snapshot guard catches changes visible to the current tab, but cannot detect a newer document that its own storage view has not observed.

Priority P1/data loss. A reliable frontend-only handoff/acknowledgement protocol needs design and failure/lifecycle tests across tabs and every writer (including messages and the opt-in demo initializer). No second data system, schema migration, backend, framework or guessed timing workaround was introduced. Until a verified correction exists, do not describe concurrent writes as guaranteed safe. Cleanup remains deferred under the requested execution order.

### Test execution and preservation

- Latest focused unit run: **23/23 non-browser regression scripts passed**; `mutation-integrity-regression` includes **15 cases**. Exact output: `.local/technical-audit/unit-results.json` and `batch-2/mutation-results.json`.
- Historical initial full attempt: 52 scripts, 37 exit-zero and 15 failures/timeouts. Several obsolete fixtures attempted unauthorized writes; they were migrated to explicit isolated test actors or actual login forms. No runtime authorization bypass was added.
- Subsequent full run: 55 scripts, 54 exit-zero, 1 failed assertion-message expectation; corrected and rerun separately. Keep these historical results rather than reporting them as final.
- Pre-cleanup full run: 57 scripts, 55 exit-zero, 2 failures: real concurrent-store data loss and team-authorization browser login helper evaluating during navigation. The latter helper now waits for the login destination instead of evaluating the disappearing document; rerun pending at this checkpoint.
- Another complete run is in progress under `batch-2/latest/`; its final result must be recorded before claiming any final pass count. A newly added visibility stress test is also run separately and must be included in the final ledger.
- Stored-text browser tests exercised escaped field/user/feedback content on home, listings, details, admin feedback and assistant: 5 checks passed with no payload execution or page errors. This is selected XSS coverage, not a complete proof of sanitization.
- Existing UI suites actually rendered all 19 routes, roles and responsive widths; their assertions cover selected states, not every modal/input permutation. Firefox/WebKit binaries, real mobile devices, real media-device meetings and external provider availability remain unverified.
- Syntax parsing: 50 application JS files passed. Static 19-route scan found no duplicate IDs or duplicate script includes. These are syntax/markup checks, not semantic function coverage.
- Baseline hash inventory contains 222 files. All **118 protected HTML/CSS/assets** remained byte-identical to the resumed-work baseline. Application changes are limited to `js/data-store.js`, `js/account.js`, `js/dashboard.js`, `js/field-details.js`; no homepage/design/animation files were changed in this batch. Test/fixture/docs changes are additional. Backups and per-test logs are under `.local/technical-audit/batch-2/`.

### Remaining limits and exact next steps

1. Resolve KICKS-008 visibility loss with a tested coordination design; preserve the new failing evidence and all existing data.
2. Finish/latest complete-suite ledger, investigate every new failure, and rerun the new visibility regression.
3. Complete normal-UI account/password lifecycle, assistant failure/malformed-provider/privacy, remaining role CRUD and media failure coverage; do not mark every function inspected solely because its file parsed or page loaded.
4. Complete dependency/deployment-header review and performance/memory measurements. No measured optimization claim is made.
5. Only after audit/fixes/regression gates pass, remove provably unreachable deletion cascades/redundant reads; leave dynamic CSS/assets/hooks intact absent proof of non-use. Then rerun the entire suite.

Frontend-only records and numeric session identities remain editable by the browser user; password hashes/other accounts reside locally. These corrections improve application integrity, not trusted access control. There is no shared-database transaction, cross-device exclusivity, real payment processor, server rate limit or server session expiration to certify. Existing data was neither reset nor destructively migrated. No production data or real payments were used.

### Additional verified work and coverage detail

**KICKS-016 � P2, invalid settings mutations.** `updateSettings` accepted administrator payloads with negative/non-finite listing fees or commission outside 0�100, even though the settings form rejected them. Reproduction: call the existing async API as an actual stored administrator with `{commissionRate:-1}`; before the fix it saved successfully and subsequent payment validation failed. Root cause: range validation existed only in the form. The store now applies the same existing rules to provided values and rejects null/array payloads without writes; valid partial updates and numeric form values remain supported. `tests/settings-validation-regression.cjs` first failed, then passed ten invalid cases and valid boundary/partial updates. Payments, accounts and coordinated-store unit suites passed afterward. No payment policy or schema changed.

**KICKS-014 completion.** The same missing-email assumption also remained in `dashboard.js:validate`. A disposable legacy account without email caused a valid password/profile save to remain in the editor. The real-browser account suite first failed waiting for the saved profile view. Guarding that comparison fixed the flow; all seven account/assistant checks then passed with the malformed legacy row retained. No automatic repair/deletion of that row occurs.

**Snapshot guard compatibility.** A regression exposed the new guard rejecting its own second persistence when both existing startup retirement and legacy-payment backfill were needed under one lock. After each successful write, the comparison baseline now advances to that exact serialized commit. `storage-transaction-snapshot-regression.cjs` first failed with a changed-data error, then passed with both operations completed and every booking unchanged. This compatibility correction does not resolve the independently observed cross-renderer visibility loss.

**Account/assistant E2E:** actual login and password form validation, external return target rejection, wrong-role redirect, password-change persistence/old-password rejection, deactivated-account redirect, provider failure/recovery, malformed response property filtering, busy duplicate-submit suppression, and close-during-pending behavior. Seven grouped checks pass with no JS page errors. Only fictional credentials/isolated storage were used.

**Dashboard coverage:** the existing secondary reconstruction suite rendered all 26 available role/hash tabs (Player 6, Owner 8, Admin 12), exercised ledger search, profile editor/cancel, mobile menu/focus and tab navigation. Its session fixtures are presentation coverage, not proof of login verification. New normal-login integrity/account suites supply the separate role/permission evidence. Not every CRUD/form/error permutation has been exercised.

**Page coverage:** 19 application HTML routes plus the separate database-documentation page were rendered by existing browser suites. The documentation diagram/SQL-download tests verify a static reference artifact, not a real database. Detail query/modal states, mobile/desktop and both themes are included in the existing secondary/visual suites. Browser screenshots are under `.local/secondary-reconstruction/final/`, `.local/premium-shell/qa/`, `.local/visual-editorial/`, and audit-specific directories. Automatically captured screenshots/assertions are not a claim that every screenshot received a fresh human-style visual review during this technical batch.

**Security/dependency review limits:** runtime external script/CSS references were inventoried in `batch-2/external-resources.json`; Bootstrap URLs are pinned to 5.3.8, icons to 1.11.3, Jitsi loads its provider script when requested. No package-manager dependency manifest or complete machine-readable vulnerability inventory exists. An attempted official Bootstrap advisory lookup was incomplete; dependency vulnerability clearance is **not claimed**. The local development response was measured as HTTP 200 with no CSP, nosniff, referrer/permissions policy, frame or HSTS headers (`headers.json`). These are loopback-server observations, not production deployment findings; no server or deployment preparation was added. Upload data-URL allowlists, escaping, return-address allowlists and selected stored-XSS cases were reviewed/tested; exhaustive exploit coverage is not claimed.

**Performance observations:** one headless Edge run at 1440�1000 with a 94,813-character sample store observed 7/1/7 catalogue reads over two idle seconds on Home/Fields/Player Dashboard. Navigation loadEventEnd was approximately 2358/2105/425 ms, with initial long tasks captured in `performance-observations.json`. Other browser tests were running, so these are noisy diagnostic observations, not a controlled benchmark or improvement claim. No animation, layout, asset or caching changes were made; long-task attribution and memory-growth testing remain pending.

**Concurrency evidence extended:** actual Chrome stress also lost three of 160 acknowledged writes (`concurrency-chrome.json`). The Edge visibility regression failed again at iteration 75 in the full verification run. Exact browser-engine scheduling/cache cause remains an inference from the stale-document trace, not a verified Chromium internals diagnosis. The [HTML storage specification](https://html.spec.whatwg.org/multipage/webstorage.html) explicitly leaves multiprocess agent-cluster interaction undefined; do not equate a same-origin lock with a storage-visibility acknowledgement protocol. There is no safe timing delay established by these tests.

**Reproduction runner:** `node scripts/test-regressions.cjs` runs all top-level test scripts in separate processes, writes a persistent result/log ledger, and returns nonzero on failures. It uses loopback only; the existing static test servers must already be running on 4181 and, for opt-in demo tests, 5501. `node scripts/test-regressions.cjs --test tests/settings-validation-regression.cjs` runs one script. `KICKS_PLAYWRIGHT_PATH` can point to the existing Playwright installation. The runner adapts legacy hardcoded 4173/4181 test URLs in memory; assertions and application files are untouched. It does not install dependencies, start a business backend or modify a user browser profile.

## Final ledger for this resumed checkpoint

**Audit status: incomplete; verified fixes retained. Cleanup has not started.** The blocking confirmed defect is KICKS-008 cross-tab visibility/data loss. No guaranteed-safe frontend correction has been demonstrated yet; do not disable the regression or substitute a longer sleep.

- Complete verification run: **61 scripts executed, 60 passed, 1 failed, 0 timeouts**. Exact ledger: `.local/technical-audit/batch-2/verification/complete-suite.json`, with one log per script. Failure: `concurrent-visibility-browser.cjs` lost acknowledged feedback at iteration 75. The shorter concurrent-store browser test passed in the same run; this does not cancel the stress failure.
- An earlier 57-script run passed all 57 before the extra stress/account/settings/startup cases were added. It is preserved at `batch-2/latest/complete-suite.json`, not presented as final completeness evidence.
- Latest focused unit rerun: **25/25 regression scripts pass**, including settings/startup and all authorization, booking, actor, orphan-history, legacy data, team and transaction cases. `mutation-integrity-regression` passes **15 grouped cases**. Syntax: **50/50 app JS scripts parse**, no failures.
- Account/assistant suite was rerun after the final dashboard legacy-email guard and passed all seven checks. Legacy account and 15-case mutation suites also passed afterward. The full run began before that one-line dashboard guard; its account test passed the prior fixture, and this targeted rerun verifies the added missing-email fixture against the final code. Other full-run tests are reported as actually executed, not relabeled as a post-cleanup run.
- Coverage totals: **19 application routes + 1 documentation route rendered; 3 roles; 26 dashboard hash tabs rendered**. These totals mean rendering/selected interaction coverage, not every combination of CRUD, malformed historical record and browser lifecycle.
- Baseline inventory: **222 files catalogued and hashed**. This is not a claim of manual semantic inspection of all 222. Critical account/store/booking/team/activity/bracket/meeting/message/assistant logic was reviewed with the reported tests. Exhaustive function-by-function and every-form edge coverage remain unfinished.
- Preservation: all **118 baseline HTML/CSS/assets remain byte-identical**. Application modifications are confined to four JS files. No homepage, shader, animation, stylesheet, storage key/schema or original user records were reset/replaced. Existing dirty Git changes were preserved.
- File accounting relative to the resume snapshot: **4 application JS files, 26 existing test files, 10 new test scripts, 2 new test helpers, 1 new test runner, 3 audit documents**. Full list follows. This separates the resumed audit's edits from the much larger pre-existing Git diff.
- Cleanup: **none performed as a broad cleanup phase**, because the required preceding audit/fix/regression gate is still failing. No assets or dynamic hooks were removed. No post-cleanup pass is claimed.
- Remaining work: verified frontend coordination/handoff for all writers; remaining exhaustive role/CRUD/error/media/dependency/performance coverage; then proven-safe dead-code cleanup and a new entire-suite run. Physical devices, Firefox/Safari/WebKit, live Jitsi calls and production deployment/security remain unverified. No production-readiness claim.

### Files modified or added during the resumed batch
- `js/account.js`
- `js/dashboard.js`
- `js/data-store.js`
- `js/field-details.js`
- `tests/accounts-regression.cjs`
- `tests/activity-lifecycle-regression.cjs`
- `tests/audit-business-logic-reproductions.cjs`
- `tests/bracket-leave-regression.cjs`
- `tests/browser-regression.cjs`
- `tests/catalogue-regression.cjs`
- `tests/challenges-regression.cjs`
- `tests/concurrent-store-browser.cjs`
- `tests/concurrent-store-regression.cjs`
- `tests/database-browser.cjs`
- `tests/demo-population-browser.cjs`
- `tests/dialogs-flow-browser.cjs`
- `tests/features-browser-regression.cjs`
- `tests/field-event-conflicts-browser.cjs`
- `tests/field-event-conflicts-regression.cjs`
- `tests/focused-motion-browser.cjs`
- `tests/home-floodlights-browser.cjs`
- `tests/navigation-regression.cjs`
- `tests/payments-regression.cjs`
- `tests/premium-shell-browser.cjs`
- `tests/premium-shell-interactions.cjs`
- `tests/store-regression.cjs`
- `tests/structural-fields-workflows.cjs`
- `tests/team-authorization-browser.cjs`
- `tests/teams-regression.cjs`
- `tests/visual-editorial-interactions.cjs`
- `tests/account-assistant-browser.cjs`
- `tests/account-legacy-records-regression.cjs`
- `tests/concurrent-visibility-browser.cjs`
- `tests/live-state-browser.cjs`
- `tests/mutation-integrity-browser.cjs`
- `tests/mutation-integrity-regression.cjs`
- `tests/settings-validation-regression.cjs`
- `tests/storage-shape-regression.cjs`
- `tests/storage-transaction-snapshot-regression.cjs`
- `tests/stored-text-security-browser.cjs`
- `tests/helpers/browser-fixtures.cjs`
- `tests/helpers/test-actor.cjs`
- `scripts/test-regressions.cjs`
- `docs/kicks-technical-audit.md`
- `docs/kicks-technical-audit-checklist.md`
- `docs/kicks-data-and-logic-audit.md`

Final runner check: executing the new runner with `--test tests/concurrent-visibility-browser.cjs` reproduced loss at iteration 4 and returned exit code 1, as required. The full-run failure at iteration 75 remains preserved in its separate verification log; the latest standalone JSON is a newer reproduction, not a replacement for the full-run ledger.
