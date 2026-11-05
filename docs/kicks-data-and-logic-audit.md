# KICKS data population and business logic audit

Audit date: 2026-11-05. Scope: the current working tree, including its existing uncommitted changes, premium OpenDesign presentation, all 19 application/guide HTML pages, frontend modules, data/schema documentation, and regression tests.

**Current checkpoint:** The newest technical audit supersedes the historical completion counts below: KICKS-008 is reopened after real-browser data loss; 61-script verification has 60 passes and 1 confirmed failing stress regression. See the appended checkpoint and `kicks-technical-audit.md`.

**Historical conclusion:** KICKS remains a browser-local prototype, not a production shared booking service. Four approved checkpoints have resolved KICKS-012, KICKS-004, KICKS-007 and KICKS-008 within their documented frontend scope. Of the baseline 11 application/data problems and one test defect, seven application/data problems and the navigation-test defect remain. KICKS-008 coordinates cooperating current-version tabs using Web Locks and explicitly rejects unsupported writes; this is not cross-device persistence, server authorization or real payment verification. No backend was introduced.

During the audit, the explicitly requested demo initializer was made safe. After approval, KICKS-012 disabled automatic legacy cleanup and KICKS-004 added booking/event overlap checks. None of these changes resets user storage. The unsafe automatic preview seed was replaced with explicit, guarded initialization. Normal-origin catalogue, authentication, payments, booking, team, dashboard, theme and design logic were preserved.

## 1. Architecture and storage

### 1.1 Runtime architecture

| Area | Current implementation |
|---|---|
| Presentation | HTML, CSS, vanilla JavaScript, existing Bootstrap dependencies, local GSAP/ScrollTrigger/SplitText/Lenis assets. |
| Shared navigation/themes | `js/navigation.js`, `js/theme.js`, premium shared CSS. Unchanged by the audit. |
| Domain store | `js/data-store.js`, exported as `window.KicksStore`. Stores the full application document in `localStorage['kicks-data-v2']`. |
| Accounts | `js/account.js`; salted PBKDF2/SHA-256 hashes, 100,000 iterations, Web Crypto. Initial administrator comes from `js/admin-account.js`. |
| Session identity | Numeric user ID in `sessionStorage['kicks-session-v2']`. Account lookup requires an Active record. Session storage is client-controlled and is not a server session. |
| Messages | `js/messages.js`; separate `localStorage['kicks-messages-v1']` array. Contacts derive from bookings, administrator relationships and agreed rival captains. |
| Themes | Existing `localStorage['kicks-theme']`. Independent of catalogue/demo initialization. |
| Demo ownership/management | Existing `kicks-full-preview` metadata key, on the existing dedicated `127.0.0.1:5501` origin only. Now records an installation snapshot for conservative reset protection. |
| SQL documentation | `docs/database/` describes 26 tables, 207 columns and 58 relationships. Its schema/documentation tests pass. **The frontend does not connect to SQL Server or a business API.** No live SQL data was inspected or modified. |
| Hosting | Existing static local server, VS Code Live Server or equivalent. Different host/port combinations have separate browser storage. |

Pages on the **same origin** share the catalogue. `KicksStore.list()` reloads the saved JSON and returns clones. Mutations clone the document and replace it with one `localStorage.setItem`; same-page changes dispatch `kicks-data-change`. Some modules also use `storage`, `pageshow`, timers or activity-boundary callbacks. These listeners are not uniform, which matters for KICKS-009/010.

There is no cross-device shared availability. `localhost`, `127.0.0.1`, port 4173, port 5501 and a deployed domain are distinct origins. A static server is not a booking backend.

### 1.2 Existing demo mechanisms inspected

1. `js/full-demo.js` and `scripts/demo-server.cjs`: the integrated preview already used the actual application store on `127.0.0.1:5501`. This is the mechanism reused.
2. The previous `full-demo.js` automatically replaced the document when a version marker differed and selected a session identity. Its destructive behavior was reproduced against an in-memory sentinel, never a real browser profile. See SEED-001 below.
3. `js/demo-data.js`: formerly a destructive **legacy retirement migration**, not a seed API. The approved KICKS-012 fix now leaves this file as a compatibility entry point with no storage access. It no longer removes tagged or linked records, messages or sessions.
4. `Pages/Demo/demo.html` / `js/demo-flow.js`: an older, standalone in-memory walkthrough with its own illustrative controls. It is not the application's authoritative dataset and was not extended into a second persistence system.
5. Static imagery, place catalogues and SQL documentation are not sources of live booking/account records.

## 2. Actual frontend entities and relationships

The fixture uses existing field names and status conventions. It does not attempt to populate SQL-only tables or introduce frontend features that do not exist.

| Entity | Key fields / relationships | Relevant existing rules |
|---|---|---|
| Users | Numeric `id`, name, email, role, status, salt/passwordHash, profile fields, optional requestedRole/ownershipProof | Player/owner signup only; Pending approval; Active/Pending/Rejected/Inactive states; no public admin signup. |
| Fields | Numeric `id`, `ownerId -> users`, city/area, type, JOD price, amenities, image index/upload, coordinates, today/now | Owner publishing fee; supported 5v5/6v6/7v7 formats; archived demo venues excluded from public lists. |
| Bookings | `userId -> player`, `fieldId -> field`, date/time, price, payment split, status; optional challenge/team/captain references | One-hour slots, 10:00–22:00; future checks and duplicate Pending/Confirmed slot checks in `book()`. Pending/Confirmed/Completed/Cancelled. |
| Games | `fieldId`, `createdBy`, kickoff, durationMinutes, capacity/joined, price, level | Lifecycle derives from Amman kickoff/end. Upcoming/ongoing events are public; expired events remain in history. Cancellation currently deletes the event rather than using a modeled cancelled-game state. |
| Memberships | `userId`, `gameId`, position, status, price/payment fields | Position required; duplicate active joins and full events rejected by `join()`. Joined/Left; historical completion is projected. |
| Teams | String ID, captainId, members `{userId,position}`, format, city, capacity, recruitment/profile fields | One current squad per player, captain must belong to squad, unique team name, capacity checks. UI captain permissions; store-level gap in KICKS-007. |
| Team requests | String ID, teamId, userId, position/message, status, optional `type: leave` | Lowercase pending/accepted/declined/cancelled conventions. Non-captain departures require captain approval. |
| Tournaments | Numeric ID, fieldId, createdBy, kickoff/duration, capacity/teams, fee, prize/system, bracket | Captain-owned team, matching format, minimum active roster; draw start locks registration; private bracket access for creator/registered roster. |
| Registrations | tournamentId, teamId, captain userId/name/email, frozen roster, status, payment fields | Registered/Withdrawn; later team edits do not rewrite tournament snapshots. |
| Brackets/fixtures | Embedded `slots`, `started`, `winners`; slots contain registration IDs | `KicksBracketCore` derives knockout rounds/pairings/byes. Winners advance only from their own ready pairing; changing an earlier winner invalidates descendants. No independent live fixture, scoreline or league-standings entity is implemented. |
| Challenges | teamId, opponentId, city/format, date/time, split, status, optional bookingId | Captain actions, active matching squads, future hourly slots, conflict checks; Open/Agreed/Booked/Cancelled plus derived Expired/Completed. |
| Challenge requests | challengeId, requesting teamId, note, status | Pending/Accepted/Declined/Withdrawn; acceptance does not itself reserve a field. |
| Payments | collection + recordId, userId, ownerId, adminId, amount/rate/commission/ownerNet, status | Simulated Paid/Refunded ledger; free entries do not create paid rows. Ledger and entry normally change in the same catalogue write. |
| Meetings | tournamentId, organizerId, title/agenda, startsAt, duration, roomId, status | Before tournament start, supported durations, organizer/time overlap checks; Scheduled/Completed/Cancelled and derived readiness/end. Existing meeting access is captain/organizer-oriented. |
| Feedback | name/email, message, rating, createdAt | Name/email validation, rating 1–5, message 10–1500 characters. This is platform feedback, not an invented field-review relation. |
| Messages | String ID, senderId/recipientId, text, read, createdAt | Active account, authorized contact relationship, 1–2000 characters, unread/read handling. Stored outside the main document. |
| Settings | title/description/contact/city, commissionRate, listingFee | Shared platform settings; dashboard validates configured amounts, but raw updateSettings lacks authorization/schema enforcement. |

Current policy deliberately prevents players from cancelling bookings, leaving games or withdrawing tournament entries. Owner booking history is read-only in the UI; administrator/organizer management remains available. These restrictions were tested and were not treated as defects or changed during the audit.

There is no standalone frontend notifications collection. Existing unread messages, pending registrations, team requests and challenge requests supply the supported attention states. Field `rating` is a scalar sample value; it is not falsely presented as an aggregate of a newly invented reviews table.

## 3. Demo dataset and safe operation

### 3.1 How to use it

Run the existing static demo server from the project root:

```powershell
node scripts/demo-server.cjs
```

Open **http://127.0.0.1:5501/Pages/Demo/catalogue.html** and select **Initialize empty demo**. It is the same project and application code, served on the existing isolated preview origin—not another independent application.

No sample data is installed on ordinary application origins. Existing data on port 5501 also is not overwritten. If that origin contains an old preview or other data, initialization refuses. Export it or use a fresh InPrivate/isolated browser profile for a clean sample environment; no automatic clearing is provided.

All seeded accounts use the explicitly public demo password **`KicksDemo2026!`**, hashed in the same format that the existing login verifies. Use the actual Login page; there is no automatic sign-in or session-impersonation selector.

| Example account | Email | Role/state |
|---|---|---|
| Sample Administrator | `sample100@kicks.example.test` | Active admin |
| Sample Rami Nimer | `sample101@kicks.example.test` | Active owner; 3 pitches |
| Sample Lina Wadi | `sample102@kicks.example.test` | Active owner; 3 pitches |
| Sample Omar Rimal | `sample103@kicks.example.test` | Active owner; 2 pitches |
| Sample Yazan Nimer | `sample200@kicks.example.test` | Active captain |
| Sample Laith Nimer | `sample201@kicks.example.test` | Active non-captain roster member |
| Sample Kareem Free Agent | `sample260@kicks.example.test` | Active unaffiliated player |
| Sample approval requests | `sample270@kicks.example.test`, `sample271@kicks.example.test` | Pending player / owner |

Names, contacts, prices, ratings, activity and payment results are fictional. Email uses the reserved `.test` namespace; telephone fields are empty. Existing local field photos and supported image indices are reused. Every seeded store record has the already-supported `demoBatch` marker, and names/descriptions plus a demo-only page indicator identify sample activity. Ownership-proof placeholders are synthetic test material, not real licenses.

### 3.2 Counts and coverage

| Section | Added records / states |
|---|---|
| Users | 58: 1 admin, 3 active owners, 49 squad players, 3 free agents, 2 Pending requests. 56 Active, 2 Pending. |
| Fields | 8 across Amman, Zarqa, Irbid, Balqa/Salt, Jerash, Madaba and Aqaba; 5v5/6v6/7v7; sample hourly prices 22–38 JOD; valid owners, approximate city coordinates, amenities and local photos. |
| Teams | 8, with 49 unique current members, real captain references, recruitment slots and supported positions. |
| Team requests | 2: pending free-agent join and pending non-captain leave request. |
| Bookings | 18: 5 Confirmed, 2 Pending, 7 Completed, 4 Cancelled; includes linked future/past challenge bookings. |
| Open games | 8: 6 upcoming, 2 historical at initialization; includes a full game and a free game. |
| Game entries | 48: 47 Joined and 1 Left/refunded; correct joined counters. |
| Tournaments | 4: open registration, full future competition, current in-progress draw and completed historical bracket. |
| Tournament entries | 16: 15 Registered and 1 Withdrawn/refunded, all linked to real sample squads and frozen player rosters. |
| Brackets | Existing embedded model only: registration-ID slots, derived knockout pairings, partial progression and completed champion. No invented score/standings rows. |
| Challenges | 6, covering Open, Agreed, Booked, Cancelled and derived Completed/Expired, with 2 related requests. |
| Meetings | 5: 2 Scheduled, 2 Completed, 1 Cancelled; all linked to existing cups/organizers and scheduled before cup kickoff. |
| Payments | 87 simulated ledger rows: 81 Paid (demo), 6 Refunded (demo); listing fees, bookings, game entries and team entries. |
| Messages | 6 authorized sample conversations, including unread messages. |
| Feedback | 4 fictional platform feedback records with supported ratings/messages. |

Dates are generated relative to the Amman calendar when explicitly initialized. Reloading does not shift dates or regenerate activities. A pristine reset can regenerate the fixture with current relative dates.

### 3.3 Safety guarantees and limits

- Reuses `full-demo.js`, the existing preview origin and the existing store/message keys. `js/demo-catalogue.js` is a fixture builder/validator, not another storage or domain system.
- Merely loading any page performs no demo initialization, reseed, automatic login or reset.
- Initialization refuses any existing catalogue, legacy marker or non-empty message store.
- Repeated initialization returns Already initialized without writing or duplicating rows, including after the user edits the fixture.
- Reset is deliberately conservative: it is allowed only if both stored documents exactly match the installation snapshot. Any new booking, profile edit, field edit, read-state change, feedback or other mutation blocks reset. **Reset does not provide a destructive shortcut after experimenting.** Export the sandbox and start a fresh isolated profile instead.
- Uses Web Locks when available to serialize demo operations and rechecks the storage snapshot after asynchronous fixture construction. Simulated quota failure restored the previous keys in tests.
- `localStorage` is not a multi-key transaction engine. The initializer attempts rollback and reports an incomplete rollback if storage also rejects recovery. Web Locks on the initializer do not repair concurrency in unrelated business methods. Use an isolated, otherwise idle demo environment; production requires transactional persistence.
- No real user browser profile was opened by tests. All browser fixtures were created in disposable contexts. The ordinary-origin sentinel remained byte-for-byte unchanged after all preview operations.
- Following explicit approval, KICKS-012 disabled the automatic `kicks-demo-v1` cleanup. Loading its compatibility script now performs no reads or writes. Legacy samples and their linked history remain intact; no new automatic archival policy was introduced.

## 4. Integrity and application verification

The fixture validator returned **valid: true, zero errors**. It checks:

- Unique IDs, unique account emails and supported roles/states.
- Valid field owners, supported pitch formats/prices and Jordan-area coordinates.
- Valid player/field booking references, real calendar dates, supported hourly slots and booking states.
- Non-overlapping active/completed field reservations **across bookings, games and tournament windows**, not just booking rows.
- Valid organizers, durations, capacity/count reconciliation, and no duplicate player/game or team/cup entries.
- Unique current team membership, valid captains, roster references and matching tournament formats.
- Registration snapshots, valid bracket slots, supported winner provenance and references.
- Valid challenge/request/booking/meeting/message relations, briefing timing, payment linkage and split arithmetic.
- Ledger coverage for paid/refunded entries and no duplicate payment row for a fixture record.

The **fixture** satisfies these invariants. This does not mean `KicksStore` enforces all of them on later mutations; the reproduced defects demonstrate that it does not.

Browser verification used actual PBKDF2 demo login, not fake authentication. Homepage cards, field/game/team/challenge/cup listings, full-game join disabling, owner meetings/messages, admin feedback, participant-private brackets and captain history rendered from the same store.

At initialization, the admin dashboard was independently reconciled to **8 fields, 18 bookings, 12 competitions and 137.00 JD of simulated platform revenue**. Revenue was computed by summing the active administrator's Paid (demo) commissions, excluding refunded ledger rows. Owner 101 correctly showed 3 owned fields. No dashboard numbers were hardcoded into the UI.

Populated public pages were checked at 390 and 1440 pixels, with no document-level horizontal overflow or JavaScript page errors. Screenshots were visually reviewed. This is targeted QA, not an exhaustive assistive-technology, device or security certification.

## 5. Confirmed issues and resolution status

Severity reflects production impact. Client-tampering reproductions are explicitly identified; they are not presented as normal UI clicks. The existing UI guards often work while the underlying store accepts invalid operations.

### KICKS-001 — Critical — Client-controlled mutation and privilege boundary

- **Affected:** `js/data-store.js:130` `save()`, `updateSettings()`; `js/account.js` current-session lookup. Related architecture: localStorage/sessionStorage are fully client-controlled.
- **Reproduce:** run `node tests/audit-business-logic-reproductions.cjs`. With no actor, `save('users', {role:'admin',status:'Active',...})`, `updateSettings({commissionRate:99})` and a field owner reassignment all succeed. Numeric session identity also is not a signed server credential.
- **Expected:** trusted identity, role and ownership are established and enforced outside client-controlled state.
- **Actual:** the guest store API can create an Active administrator record, edit settings and reassign fields. Public UI guards are not an authoritative security boundary.
- **Root cause:** generic mutations lack an actor policy, and no server authority exists.
- **Recommended fix:** obtain approval for a backend/authentication architecture; enforce authenticated identity and role/ownership server-side. Frontend checks can provide defense in depth but cannot make browser-only authorization production-secure.
- **Status:** unresolved; no backend or major authorization rewrite performed.

### KICKS-002 — High — Generic CRUD bypasses integrity and transitions

- **Affected:** `js/data-store.js:130` `save()`; dashboard validation is separate in `js/dashboard.js` `validate()` / `saveRecord()`.
- **Reproduce:** the evidence suite saves a Confirmed booking with nonexistent player/field IDs, `not-a-date`, `99:99` and a negative price. It also inserts two Confirmed bookings for the same field/hour and restores an unpaid Cancelled record to Confirmed.
- **Expected:** every mutation path enforces schema, references, slot uniqueness, authoritative amounts and allowed transitions.
- **Actual:** those generic saves succeed. Some UI routes validate them; the shared generic API does not.
- **Root cause:** invariants live partly in form handlers and specialized methods rather than a single authoritative mutation boundary.
- **Recommended fix:** centralized entity/transition validation and restricted commands; database constraints/transactions for production. Preserve intentional player-cancellation policy until separately approved.
- **Status:** unresolved.

### KICKS-003 — High — Booking trusts a caller-supplied player ID

- **Affected:** `js/data-store.js:347` `book(userId, ...)` and `js/data-store.js:391` `join(userId, ...)`.
- **Reproduce:** signed-in player 200 calls `book(201,1001,'2100-01-01','16:00', {method:'Visa demo',amount:28})` in an isolated fixture.
- **Expected:** a public player action belongs to the authenticated player; administrative delegation must be an explicit authorized command.
- **Actual:** a Confirmed booking is created for player 201. The same test also creates a paid game membership for player 261 while actor 200 is current.
- **Root cause:** the method checks that the supplied user exists/is Active but does not bind it to the current actor.
- **Recommended fix:** derive identity from trusted session context; separate any supported admin-on-behalf action with explicit permissions.
- **Status:** unresolved.

### KICKS-004 - High - Venue occupancy ignores games/tournaments - Resolved

- **Affected:** `js/data-store.js:347` `book()`; `js/field-details.js` availability calculation; homepage availability adapter has the same booking-only model.
- **Reproduce:** create a published game on field 1001 from 18:00 to 20:00, then book that field at 19:00 on the same date.
- **Expected:** a pitch already reserved for an event cannot be sold for an overlapping private booking.
- **Actual:** the 19:00–20:00 paid demo booking is Confirmed alongside the game.
- **Root cause:** booking collision checks inspect only Pending/Confirmed booking rows and exact hourly equality, not event occupancy intervals.
- **Recommended fix:** one occupancy model covering field bookings, games and tournaments, with interval overlap checks and transactional reservation. Decide event-to-booking ownership links before implementing.
- **Status:** resolved in the second approved fix, 2026-11-05. `KicksStore.book()` now rejects overlaps with scheduled games/tournaments before recording a payment. `save()` applies the reverse check when an event is created, moved, extended or reactivated, and checks new/rescheduled/reactivated active bookings against events. Existing bookings/records are not rewritten on load.
- **Rules:** compares half-open intervals `[start,end)` in Amman time; bookings remain one hour at 10:00-22:00, events use their existing `durationMinutes`. Pending and Confirmed bookings reserve time; cancelled/history-only bookings do not. Cancelled/Archived events and legacy events without a valid duration do not reserve time. Deleted events cease blocking slots. Adjacent intervals and different fields remain allowed, including across midnight/month/year boundaries.
- **Availability UI:** field details and homepage time search call the shared read-only `KicksStore.isFieldSlotAvailable()` occupancy query, retaining their existing future-date/today rules. No new reservation/status or cancellation UI was introduced.
- **Preservation:** existing overlapping records remain intact. Unchanged-schedule metadata edits and cancellations are allowed so old data is not trapped behind a new validation rule. Changing a reservation's time/field/duration or activating it must pass the new check. Failed checks do not write records or ledger entries. No CSS, authentication, checkout or demo dataset changed.
- **Before-fix evidence:** `tests/field-event-conflicts-regression.cjs` was written and run against the original application; 14 assertions failed because overlaps were accepted. The original red results are `.local/kicks-004-fix/before-test.json`.
- **After-fix evidence:** 30 focused cases now pass, covering both directions for games and tournaments, generic booking saves, rescheduling, duration/field changes, Pending holds, cancellation/reactivation, partial-hour events, adjacency, overnight boundaries, legacy numeric-string field references, preservation and rejected-write/payment invariants. `tests/field-event-conflicts-browser.cjs` verifies the actual owner forms, field slot radios, shared homepage search and cancellation/refund behavior with zero page errors.
- **Root cause fixed:** the booking path previously checked only exact-hour booking rows, and event saves had no booking occupancy check. Both now use the same interval comparison. This does not introduce transactional locking or solve KICKS-008.
- **Remaining scope:** direct storage tampering, concurrent cross-tab writes and backend authorization remain limitations. Event-versus-event scheduling policy is outside this specific fix. Existing legacy conflicts require separate review; none were auto-cancelled or moved.

### KICKS-005 — Medium — Impossible calendar dates normalize into valid dates

- **Affected:** `js/data-store.js:286` `isFuture()` and `book()`.
- **Reproduce:** book `2100-02-30` at `17:00` through the store API.
- **Expected:** reject the nonexistent date without saving anything.
- **Actual:** the impossible date string is saved because JavaScript Date normalizes it during future-time comparison.
- **Root cause:** no strict date-component/round-trip validation in the domain method. Native date inputs normally protect the UI, but not raw calls or imported records.
- **Recommended fix:** strict ISO calendar validation before Amman-time conversion, plus boundary tests for invalid dates/months/leap years.
- **Status:** unresolved.

### KICKS-006 — High — Deletion leaves ledger and meeting orphans

- **Affected:** `js/data-store.js:201` `remove()`.
- **Reproduce:** delete a sample game with paid memberships; its entries are deleted while refunded payment rows retain their now-missing membership IDs. Delete cup 3001 as creator 101; its meetings become Cancelled but still reference the deleted cup.
- **Expected:** preserve audit history with valid references, or apply a fully specified archival/deletion policy.
- **Actual:** payment and meeting references point to nonexistent records.
- **Root cause:** event/entry hard deletion is combined with retained ledger/meeting records.
- **Recommended fix:** archive/tombstone referenced events and entries, or retain explicit immutable ledger snapshots under a documented model; enforce foreign-key policy when the backend is introduced.
- **Status:** unresolved. No deletion policy was silently rewritten.

### KICKS-007 - High - Team transaction lacks captain ownership checks - RESOLVED

- **Original reproduction:** free agent 260 called `updateTeams(view => view.teams[0].name = 'Tampered by non-captain')`; the unrelated player's rename persisted.
- **Root cause:** structural roster/name checks did not authorize the complete proposed team diff. Generic `save/remove` on teams and requests bypassed the directory, and callback identity fields could be spoofed. UI checks alone were insufficient.
- **Affected/resolved functions:** `js/data-store.js` `save`, `remove`, `teamActor`, `authorizeTeamDraft`, `updateTeams`, `teamLeave`; `js/teams.js` `isCaptain`.
- **Policy:** the stored Active player associated with the current session may create a self-captained squad or submit/cancel their own requests. Only the original captain may edit their squad, remove non-captains or review requests. Adding a member requires that player's prior pending join request and an atomic acceptance. Departures retain captain approval. Owner/admin accounts have no team-management override in the existing rules; their unrelated workflows remain intact. Team deletion and captain transfer have no supported workflow and are rejected.
- **Implementation:** authorize the entire detached proposed diff before any persistence; protect team/request identities, closed requests and user projections; reject raw team/request CRUD, forged actor fields, cross-team edits, unsolicited roster additions and unauthorized status transitions. Derived cancellations and leave approvals happen atomically. Recheck actor/catalogue before writing; reject retained-reference mutation.
- **Evidence:** new regression was executed before implementation: 8 passed, 25 failed (including unauthorized rename). After implementation all 33 pass. Rejected calls assert exact stored bytes and write counts unchanged. Original-role browser forms confirm legitimate creation, captain edits/removal, join acceptance and approved leave; unauthorized UI/API attempts leave storage unchanged.
- **Status:** resolved as frontend integrity hardening only. Browser session/storage remain user-controlled; no server authorization or production security claim.

### KICKS-008 - High - Concurrent writes can erase a successful booking - RESOLVED for cooperating frontend tabs

- **Affected:** `js/data-store.js` `loadFromBrowser`, `persist`, public mutation exports and startup migrations; related write callers, messages and demo initialization/reset.
- **Original reproduction:** deterministic independent-context interleaving let two same-slot bookings return Confirmed with the same ID while only one booking/payment survived. New desired-behavior tests also failed for independent bookings and unrelated feedback writes (three failures, one sequential control passed).
- **Root cause:** loading, validating and replacing a whole localStorage document was not one coordinated operation. Individual get/set calls and a revision recheck cannot close the check/write gap.
- **Resolution:** one exclusive `kicks-storage-v2` Web Lock precedes the latest read and encloses validation, mutation and persistence. Public writes return promises; UI success follows awaited persistence. Unsupported/rejected lock acquisition fails closed. Messages, demo writes/rollback and legacy backfills cooperate using the same lock. Queued stale record replacements reject; dashboard editors pass their original snapshot explicitly.
- **Race classification:** independent tabs/realms can race. Ordinary callbacks in one realm cannot interrupt the existing synchronous internal mutators; stale input after async UI work is separately handled by an explicit original-record baseline for long-lived editors. The async outer boundary serializes cooperating writes from both cases.
- **Evidence:** 13 new VM concurrency/failure cases pass; eight real separate-tab browser workflow checks pass, including paid bookings, teams, unrelated updates, messages, unsupported UI, lock rejection and quota recovery. Existing booking/team/payment/tournament regression suites pass. See the fourth checkpoint below for the complete API/caller map and initial failures.
- **Limits:** this does not coordinate old tabs, direct storage writes, different origins/profiles/devices or external SQL. All tabs must reload the new scripts. No production-grade security or authoritative inventory claim.

### KICKS-009 — Medium — Open field page retains a stale price

- **Affected:** `js/field-details.js:3` captured fields/field reference and summary/checkout rendering; similar snapshot patterns exist in catalogue modules.
- **Reproduce:** open sample field 1001 at 28 JD; in another tab update it to 39 JD. After storage propagation, the store returns 39 while the open details page still displays 28.
- **Expected:** refresh displayed price/availability or invalidate the quote and request confirmation of the new amount.
- **Actual:** stale 28 JD remains on screen. The specialized booking method does reject stale supplied amounts, so this is not evidence of an incorrect successful charge.
- **Root cause:** the page holds a startup clone and does not re-fetch the field on relevant catalogue changes.
- **Recommended fix:** a consistent catalogue subscription/quote refresh strategy across pages, preserving drafts while invalidating stale selections.
- **Status:** unresolved; reproduced in `tests/demo-population-browser.cjs`.

### KICKS-010 — Medium — Completed tournaments disappear for non-captains

- **Affected:** `js/dashboard.js:83` `getVisibleRecords()` with `js/data-store.js:304` `activityStatus()`.
- **Reproduce:** log in as sample roster member 201; view Player dashboard → My tournaments. `tournamentAccess(3004).view` is true, but the completed Cedar Champions Cup entry is missing. Captain 200 retains it.
- **Expected:** registered roster members retain their authorized historical tournament link after expiry, as described by the existing integration documentation.
- **Actual:** non-captain history omits the completed entry, although direct private-bracket access still works and the record remains stored.
- **Root cause:** entries are projected to Completed before the roster-member visibility condition, which requires `status === 'Registered'`; the captain separately matches `userId`.
- **Recommended fix:** separate access/membership eligibility from lifecycle display status; test captain and non-captain historical views.
- **Status:** unresolved; browser reproduction retained.

### KICKS-011 — Low — Static navigation test reports a template expression as a file

- **Affected:** `tests/navigation-regression.cjs`, top-level regex scan of HTML.
- **Reproduce:** `node tests/navigation-regression.cjs`.
- **Expected:** check actual local HTML/resource URLs and runtime shared navigation.
- **Actual:** persistent failure on `Pages/Demo/catalogue.html -> ${url}`. The scanner treats a JavaScript template expression inside an inline script as a literal file path.
- **Root cause:** regex scanning is not aware of script/template context. Its static navbar assumptions also predate the shared runtime component.
- **Recommended fix:** DOM-aware static reference checking plus existing runtime navigation assertions. Do not delete the actual guide links to satisfy this regex.
- **Classification:** confirmed test defect, **not** a confirmed broken application link. Runtime shared-navbar checks across all 19 pages pass.
- **Status:** unresolved; deliberately retained in test results.

### KICKS-012 - High - Automatic legacy cleanup deletes untagged linked history - Resolved

- **Affected before fix:** `js/demo-data.js`, former `cleanup()` and its recursive linked-record selection.
- **Reproduce:** load a document with a retained real account, a legacy-tagged field, and an untagged Confirmed booking/payment owned by that account against the field. Run the existing retirement script.
- **Expected:** retain user-created financial/booking history or require explicit, backed-up migration approval.
- **Actual:** the real account remains, but its untagged linked booking/payment are removed automatically.
- **Root cause:** recursive provenance inference from relationships treats every linked record as disposable; no per-record ownership/confirmation is required.
- **Recommended fix:** stop destructive automatic cascades; archive legacy venues, preserve linked history and provide explicit migration preview/backup. Approval is required before changing this inherited behavior.
- **Status:** resolved in the first approved fix, 2026-11-05. The compatibility entry point intentionally performs no storage access. All legacy and current sample records, user records, references, rosters, counters, settings, messages and session identity remain unchanged. Script references on 17 pages use `?v=preserve-legacy-3` to avoid retaining the cached destructive implementation.
- **Test before fix:** `node tests/legacy-cleanup-preservation-regression.cjs` failed against the old implementation, demonstrating deleted linked history, changed rosters/messages and rewritten migration metadata. Exit/output are retained in `.local/kicks-012-fix/before-test.json`.
- **Tests after fix:** the preservation test, updated retirement test and original minimal audit reproduction all pass with retention expectations. Catalogue, store, accounts, payments and explicit demo-dataset regression suites pass. `tests/legacy-cleanup-browser.cjs` passes eight real-page navigations across ports 4173/5501 plus reload, checking exact stored bytes, zero storage mutations, retained session, valid references and no JavaScript errors. The existing populated-demo browser suite also passes.
- **Design/data preservation:** no CSS, layout, authentication or other domain method changed. HTML edits only cache-bust this script. Backups and hash inventory are in `.local/kicks-012-fix/`.
- **Scope limit:** this prevents future deletion by this script; it cannot reconstruct data already deleted before the fix. Recovery would require a known prior export/backup. No automatic cleanup/archive or restoration was added, and existing legacy samples may remain visible. Independent historical catalogue-retirement behavior in `data-store.js` is unchanged and still passes its non-deletion tests.

### SEED-001 — High — Previous preview initialization overwrote existing data — Resolved in authorized seed work

- **Affected prior implementation:** `js/full-demo.js`, version-mismatch `seed()` path.
- **Reproduction:** execute the backed-up original script with an existing sentinel account and older preview marker in isolated memory. The sentinel account is replaced by the old fixture.
- **Expected:** explicit initialization and no overwrite of existing account/booking data.
- **Actual before change:** automatic full replacement and automatic session selection.
- **Root cause:** version mismatch was treated as permission to replace the whole origin's store.
- **Implemented fix:** explicit initializer, occupied-origin refusal, idempotence, guarded pristine reset, real login and safe failure handling described above.
- **Evidence:** `.local/data-audit/old-seed-reproduction.json` and `tests/demo-dataset-regression.cjs`.

## 6. Security and architectural limits

These are production blockers or unsupported capabilities, not speculative claims about a nonexistent backend:

1. **No authoritative authentication/authorization.** A user controlling the browser can read/alter catalogue records, role/status and numeric session identity. Password hashing improves password representation but cannot create a trust boundary in that same client.
2. **Payments are intentionally simulated.** `js/checkout.js` explicitly displays Local simulation / no real payment, collects no card details, and returns a client object such as `{method:'Visa demo',amount:...}`. The store records demo ledger statuses; it cannot verify a charge, provider webhook, settlement or refund. This is not a payment gateway defect—it is an absent production integration requiring separate approval. Do not treat the fixture's Paid (demo) rows as real money.
3. **No shared transactional booking service.** Cooperating current-version same-origin tabs now serialize writes with Web Locks; old/uncooperative writers can still race, and other devices do not share localStorage. There is no server-side inventory, unique reservation constraint, idempotency key or durable payment reconciliation.
4. **Privacy is UI-local.** Private brackets/messages are filtered in application methods, but all browser-stored records are accessible to code/users controlling that browser. Server-side record filtering is required for actual multi-user privacy.
5. **Local persistence has quota, clearing and migration risks.** There is no automatic database backup, durable shared audit trail or multi-key transaction for catalogue/messages/seed metadata. Export is explicit; the audit did not wipe or repair a real profile.
6. **External integrations remain separate.** Maps/geolocation and Jitsi-style meeting functionality are existing integrations. No real calls, camera/microphone sessions, email delivery, payment processing or live SQL connectivity were certified by this audit.
7. **Unsupported frontend features were not fabricated.** No full league table/score-entry engine, standalone notification service, real per-field review aggregate, password recovery/email approval delivery or cross-device session management was added.
8. **Development hosting is not deployment hardening.** Do not expose the complete workspace/backups/administration tooling as a production static root. TLS, request limits, security headers and operational recovery need a separate deployment assessment.

## 7. Test results and evidence

Tests used disposable VM storage or new isolated Edge contexts. Existing user profiles were not used. Raw logs, fixtures, screenshots and evidence are under `.local/data-audit/`.

### 7.1 Existing suites

| Suite | Final result |
|---|---|
| `accounts-regression.cjs` | Pass |
| `store-regression.cjs` | Pass |
| `payments-regression.cjs` | Pass |
| `activity-lifecycle-regression.cjs` | Pass; KICKS-004 moved its booking to a separate test pitch so the lifecycle fixture no longer double-books its timed game. |
| `catalogue-regression.cjs` | Pass |
| `teams-regression.cjs` | Pass |
| `challenges-regression.cjs` | Pass |
| `bracket-leave-regression.cjs` | Pass |
| `messages-regression.cjs` | Pass |
| `discovery-regression.cjs` | Pass |
| `nearby-catalogue-regression.cjs` | Pass |
| `place-resolver-regression.cjs` | Pass |
| `demo-retirement-regression.cjs` | Baseline passed its former deletion contract; after KICKS-012, updated retention assertions pass. |
| `database-schema-check.cjs` | Pass; documentation/schema structure only, not a live SQL connection. |
| `navigation-regression.cjs` | **Fail**, persistent KICKS-011 template-expression false path. |
| `browser-regression.cjs` | Pass on isolated rerun; initial run reported KicksStore unavailable. |
| `bracket-leave-browser.cjs` | Pass on isolated rerun; initial run timed out waiting for roster tab. |
| `premium-shell-browser.cjs` | Pass on isolated rerun; initial run missed the expected header hook. |
| `database-browser.cjs` | Pass |
| `dialogs-flow-browser.cjs` | Pass |
| `features-browser-regression.cjs` | Pass |
| `layout-browser-regression.cjs` | Pass |
| `home-floodlights-browser.cjs` | Pass; KICKS-004 moved its test game to 20:00, away from its independent 18:00 booking fixture. Original search/assertion intent preserved. |
| `meetings-browser-regression.cjs` | Pass |
| `premium-shell-interactions.cjs` | Pass |

Initial browser failures are retained in `browser-results.json`; successful focused reruns are recorded separately in `browser-reruns.json`. Their initial failures were not consistently reproduced, so no application bug or unverified root cause is assigned to them. Initial test server startup/parallel timing is a hypothesis, not a confirmed diagnosis.

### 7.2 Added focused tests

| Suite | Result / meaning |
|---|---|
| `demo-dataset-regression.cjs` | Pass: relationships, counts, collision-free fixture, explicit initialization, normal-origin no-op, no overwrite, idempotence, guarded reset, quota rollback, Amman month boundaries. |
| `demo-population-browser.cjs` | Pass: actual sample login, listings/details, full-game disable, dashboards/ledger reconciliation, messages/meetings/brackets, reset refusal, normal-origin preservation and mobile/desktop screenshots. Also asserts/reports the current KICKS-009/010 defects. |
| `audit-business-logic-reproductions.cjs` | Baseline characterized eight defects. After KICKS-004, KICKS-007 and KICKS-008, asserts overlap/permission rejection and coordinated booking outcomes; still reproduces five other unresolved store defects. |
| `audit-legacy-cleanup-reproduction.cjs` | Baseline reproduced deletion. After the approved fix, asserts that the same real account, legacy field, untagged booking and payment remain intact; pass. |
| `legacy-cleanup-preservation-regression.cjs` | Added before the fix: failed against destructive cleanup, now passes exact-byte retention, idempotence, malformed/blocked storage, metadata, roster/counter/message/session preservation. |
| `legacy-cleanup-browser.cjs` | Pass: eight normal/demo real-page routes plus reload, no storage mutations, unchanged bytes/session, refreshed script references and no page errors. |

The new browser harness initially targeted a nonexistent standalone `#messages` view; it was corrected to the existing combined Meetings & messages view. It also initially clicked a card behind an already-open deep-link modal; the test was corrected to close/reopen it. Neither harness mistake was reported as a product defect. Team deep-link opening subsequently passed.

Existing passing coverage includes signup/login approval, role UI guards, owner publishing/editing/photo upload, price-change rejection, duplicate join/capacity checks, booking conflicts between bookings, simulated checkout cancellation/confirmation, frozen tournament rosters, captain leave approval, bracket byes/progression, meetings access/timing, feedback validation, reduced motion, responsive navigation and accessibility checks. Passing UI workflows do not cancel the lower-level flaws reproduced above.

## 8. Prioritized roadmap

| Priority | Work | Approval boundary |
|---|---|---|
| P0 | **KICKS-012 resolved:** automatic deletion disabled, red/green and browser retention tests passed. Future archival/recovery policy is separate. | Approved fix completed; no storage reset or automatic archival. |
| P0 | Establish server identity, role/ownership enforcement and private data access (KICKS-001/003/007). | Backend addition requires separate explicit approval; frontend hardening alone is insufficient. |
| P0 | Decide and implement real payment-provider verification, trusted amounts, idempotency and reconciliation. | Separate approved integration; no provider or paid service added in this audit. |
| P1 | Centralize schema/reference/status validation; replace unrestricted mutation paths (KICKS-002/005). | Business logic changes require approval. |
| P1 | **KICKS-004 booking/event interval checks resolved**. Cooperating same-origin write coordination (KICKS-008) is now resolved; cross-device authoritative transactions remain outstanding. | Scheduling-only fix completed; no backend/locking change. |
| P1 | Preserve ledger and meeting history through archival/FK-safe deletion (KICKS-006). | Agree retention/refund policy first. |
| P2 | Refresh stale quotes/availability across pages; restore authorized completed-team history (KICKS-009/010). | Focused frontend/domain fixes after approval. |
| P3 | Repair static navigation test parsing; harden flaky test readiness and preserve runtime coverage (KICKS-011). | Test maintenance; do not mask genuine failures. |

## 9. Recommended next steps and change boundaries

1. Review and approve the data-retention, authorization, occupancy, deletion and payment policies before code changes.
2. First fix non-destructive legacy migration and add tests proving that genuine linked history remains intact.
3. Add failing desired-behavior tests for the confirmed defects, replacing the audit characterization expectations only as each approved fix lands.
4. Harden the existing domain interface and UI synchronization without changing the premium design.
5. Separately approve a backend/API/database implementation and migration plan. Map the existing frontend entities to the documented SQL schema, using server sessions, transactional constraints and audited payment state transitions.
6. Re-run the full suite, then assess deployment/security, recovery and real integration behavior in staging before calling the platform production-ready.

### Files modified or added during the original audit

- Modified: `js/full-demo.js` and `Pages/Demo/catalogue.html` only among pre-existing application files.
- Added: `js/demo-catalogue.js`, the four focused test files listed above, and this report.
- Backup: `.local/data-audit/before.zip`; original hash inventory: `baseline.json`; preservation summary: `preservation.json`.
- Existing normal-site HTML, premium CSS, navigation, themes, authentication, store/business logic, dashboards, booking/payment code, legacy cleanup and pre-existing tests were not rewritten.
- No files were deleted; no commit/reset/checkout was performed; no real browser catalogue or database was seeded; no backend, OpenDesign Cloud call or paid service was added.

### First approved fix checkpoint - KICKS-012 only

Changed for this checkpoint: `js/demo-data.js`; the cleanup script query version in `index.html` and 16 inner pages; `tests/demo-retirement-regression.cjs`; `tests/audit-legacy-cleanup-reproduction.cjs`; this report and `docs/integration.md`. Added `tests/legacy-cleanup-preservation-regression.cjs` and `tests/legacy-cleanup-browser.cjs`.

Backup: `.local/kicks-012-fix/before.zip`. Before/after test evidence, browser results and preservation hashes are saved alongside it. Tests use isolated data only; no existing user profile was reset, overwritten, seeded or restored.

**Stop point:** KICKS-012 is fixed and tested. No other confirmed High/Medium issue was changed during this checkpoint. Client-side fixes do not provide production-grade security; authentication authority, race protection, other permission gaps and real payment processing limitations remain. The user requested results before proceeding, so implementation stops here for review.


### Second approved fix checkpoint - KICKS-004 only

**Request:** prevent collisions between field reservations and scheduled games/tournaments in both directions, preserving existing data, statuses, payments and design.

**Changed application files:**

- `js/data-store.js`: shared interval/occupancy helpers; reject new or changed booking/event collisions before persistence; exported read-only slot query.
- `js/field-details.js`: use the shared slot query while keeping existing hourly/date/today rules.
- `js/opendesign-home.js`: use the same query for dated/time-filtered field search.
- Existing HTML page edits only update the query version of those three scripts to `field-occupancy-1`; no layout/style changes. The earlier `preserve-legacy-3` cleanup version remains intact.

**Tests:**

- New `tests/field-event-conflicts-regression.cjs`: red before app changes; now 30 cases pass. All rejected operations preserve the exact stored catalogue and payment ledger.
- New `tests/field-event-conflicts-browser.cjs`: real game/cup creation and rescheduling forms, rejected draft preservation, field radios, partial-hour occupancy, homepage search, cancellation and existing refund behavior; pass with no page errors.
- Existing store, accounts, payments, activity lifecycle, catalogue, teams, challenges, bracket, demo dataset, demo retirement, legacy preservation and audit characterization suites pass (13 targeted unit/regression suites including the new scheduling suite).
- Existing `browser-regression.cjs`, `home-floodlights-browser.cjs`, `features-browser-regression.cjs`, `dialogs-flow-browser.cjs` and `demo-population-browser.cjs` pass. The homepage suite also checks reduced motion, animation fallback, account navigation, accessibility and responsive layouts.
- Initially, lifecycle/homepage fixture creation was correctly rejected because those tests put a booking on their own scheduled game's pitch/hour. Only those fixture collisions were removed: separate lifecycle pitch; homepage game at 20:00. Their original business assertions were retained.
- One features-suite attempt had a transient local test-server connection refusal; the rerun passed. The new browser harness initially had an ambiguous Close/Cancel locator; it was narrowed to the existing first Close control. Neither was classified as an application defect.

**Evidence/backups:** `.local/kicks-004-fix/before.zip`, `before-test.json`, `domain-test.json`, `unit-results.json`, `browser-report.json` and `result.json`. Tests use disposable browser/VM data; no real profile was opened or reset. The seeded dataset and all CSS/authentication/payment modules are unchanged.

**Boundaries:** no backend, database, framework, storage reset, automatic schedule repair, data deletion or concurrency/security claim was introduced. Existing corrupt/missing-duration records are not repaired. The checks use the current browser document and therefore cannot guarantee cross-tab/cross-device atomic reservations or resist direct client tampering. Major permission, mutation-validation, orphan-history and concurrency defects remain separate issues.

**Stop point:** KICKS-004 is fixed and tested. KICKS-012 remains fixed. No other High/Medium issue was implemented in this checkpoint; work stops here for review before the next issue.

### Third approved fix checkpoint - KICKS-007 only

**Changed application files:** `js/data-store.js` and `js/teams.js`. `index.html` and all 18 existing HTML files under `Pages/` only refresh the store script query version (and the teams script where present) to `team-permissions-1`; markup, CSS and design are unchanged.

**Added tests:** `tests/team-authorization-regression.cjs` (33 cases) and `tests/team-authorization-browser.cjs` (7 browser workflow checks; no page errors).

**Updated tests:** fixture setup only in `tests/teams-regression.cjs`, `tests/bracket-leave-regression.cjs`, `tests/challenges-regression.cjs`, `tests/accounts-regression.cjs`, `tests/activity-lifecycle-regression.cjs`, and `tests/payments-regression.cjs`. Legacy multi-member tournament fixtures are loaded directly into test-local storage instead of using the now-forbidden public bypass; original workflow assertions remain. `tests/audit-business-logic-reproductions.cjs` now expects unauthorized rename rejection instead of reproducing success. Documentation changed: this report and `docs/integration.md`.

**Regression results:** 12 targeted suites pass: team authorization, teams, bracket/leave/tournaments, challenges, accounts, payments, activity lifecycle, store, field/event conflicts (30 cases), legacy preservation, audit reproductions and demo dataset. Original dialog-flow and bracket/leave browser suites pass. Populated demo browser checks pass, including actual authentication, dashboards, brackets and responsive layouts; the previously documented KICKS-009/010 remain reproducible and were not changed.

**Safety/evidence:** backup `.local/kicks-007-fix/before.zip`; original hashes in `baseline.json`; red results `before-test.json`; green results `unit-results.json`; dedicated browser evidence `browser-report.json`. All tests use disposable VM/Edge contexts. No real profile was reset, seeded or rewritten. Existing records and frozen tournament rosters are retained; unrelated collections are asserted unchanged in the new browser suite.

**Limits and stop point:** KICKS-012 cleanup and KICKS-004 occupancy rules remain unchanged. Team-specific checks do not fix raw non-team mutation bypasses (KICKS-001/002/003), browser identity tampering, or cross-tab lost updates (KICKS-008). The snapshot recheck is not an atomic database transaction. Client code/storage can be altered by the browser owner. No backend, database connection, payment provider, framework or paid service was added. Stop after this issue; no other High/Medium fixes applied.

**Final browser verification:** `browser-regression.cjs` and `legacy-cleanup-browser.cjs` pass. The first `field-event-conflicts-browser.cjs` run passed all scheduling workflows but failed the final console assertion with four undefined `fieldImage` errors; the isolated rerun passed with no page errors. This intermittent failure has no confirmed root cause and no unrelated application fix was applied. Logs: `existing-browser.log`, `retention-browser.log`, `occupancy-browser.log`, `occupancy-browser-rerun.log` under `.local/kicks-007-fix/`.

**Preservation verification:** 19 HTML files differ only in store/teams cache versions after newline normalization. CSS and original cleanup, availability UI, authentication, checkout and demo files match pre-fix hashes. Existing store logic preceding the team methods matches the backup after excluding only the two team/request CRUD gates; KICKS-004 interval checks remain identical. Summary: `.local/kicks-007-fix/result.json`.

### KICKS-008 investigation checkpoint - historical, superseded by fourth checkpoint

No application implementation was changed at this checkpoint. The user explicitly required stopping before a safe fix that changes synchronous public API behavior.

**Inspected:** `js/data-store.js` `loadFromBrowser`, `persist`, generic mutations, booking/join/payment transactions, challenge/bracket/team transactions and settings updates. These build a cloned whole-catalogue snapshot and synchronously replace `kicks-data-v2`. KICKS-007's snapshot recheck reduces stale writes but cannot close the subsequent check/write window. KICKS-012, KICKS-004 and KICKS-007 are untouched.

**New desired-behavior regression:** `tests/concurrent-store-regression.cjs`; uses the existing audit fixture and disposable independent VM contexts sharing an in-memory storage map. A deterministic interleave immediately before the first store's `setItem` lets the second store finish its write. Three cases fail: conflicting bookings both report success; independent bookings/payment rows lose a successful write; unrelated feedback writes lose a successful record. Sequential calls in one context pass. Evidence: `.local/kicks-008-investigation/red-results.json`. This is a controlled independent-context reproduction, not a claim of observed real-profile browser-tab timing.

**Race classification:** multiple tabs/independent JavaScript realms can concurrently execute the read/check/write sequence. Current individual store mutators are synchronous, so ordinary async callbacks in one realm do not interleave inside a mutator. Async UI work can introduce stale input snapshots, but a distinct same-tab async lost-transaction failure was not established here. A process-local Promise queue would not coordinate tabs.

**Why no partial fix:** localStorage provides no compare-and-swap or transaction across get/set. Revision rechecks have a check/write gap; verification afterward can discover loss only after overwriting a successful record. Storage events/BroadcastChannel and check/set lease keys alone do not establish exclusive ownership. Arbitrary retries can duplicate payments or side effects. A synchronous spin/wait would block the UI without safely granting asynchronous Web Locks.

**Recommended option, requiring caller orchestration changes:** an asynchronous transaction entry point acquiring one exclusive Web Lock for all catalogue writers; only after acquisition reload, validate, mutate and persist using synchronous internal logic. Await the result before showing success. Keep pure synchronous reads and internal business logic, but update every write entry point and caller, initialization/migrations and explicit demo/reset tools to cooperate. Fail closed with a clear unsupported/busy error when a secure-context Web Locks API is unavailable; no unsafe lease fallback. Availability must be feature-detected rather than assumed for file URLs, insecure deployments, embedded/older browsers or disabled capabilities. Already-open older writer tabs must be closed/reloaded before rollout, since they do not cooperate with the lock.

**Alternative:** an asynchronously acquired single-writer tab lease using Web Locks, keeping synchronous mutations only while a tab holds exclusive ownership. Other tabs become read-only/retry explicitly, and startup/navigation/freeze lifecycle need careful handling. This preserves method signatures but changes normal multi-tab functionality, so it also needs a product/API decision. A best-effort revision-only patch is not an equivalent safe option.

**Remaining limitations:** cooperative same-storage-bucket locking does not protect against devtools/direct storage writes, old code, browser data clearing or other devices, and provides no production-grade authority or real payment guarantees. No backend/database/framework, migration/reset or new payment system was introduced.

**Standards:** [WHATWG Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html) advises assuming no cross-agent locking. [W3C Web Locks](https://www.w3.org/TR/web-locks/) specifies asynchronous lock acquisition and Promise-returning requests even with a synchronous callback.

**Validation:** eight existing suites pass: field/event conflicts (30 cases), team authorization (33 cases), legacy preservation, accounts, payments, teams, bracket/leave/tournaments and store. Logs: `.local/kicks-008-investigation/preservation-tests.json`. Browser suites were not rerun at this investigation-only checkpoint; no application behavior changed. Backup of existing store/report: `.local/kicks-008-investigation/before.zip`.

**Stop point:** KICKS-008 is not fixed. Only this report and the new intentionally failing regression were changed. Request approval for the async coordination boundary before implementation; do not claim safe synchronous cross-tab persistence.

### Fourth approved fix checkpoint - KICKS-008 only

The prior investigation stop was superseded by explicit approval of an asynchronous transaction boundary. Before app edits, the complete write map was saved to `.local/kicks-008-fix/write-map.md`; the red test/evidence from the investigation remains `.local/kicks-008-investigation/red-results.json` (3 failed, 1 passed). Backup: `.local/kicks-008-fix/before.zip`; hash inventory: `baseline.json`.

#### Public API changes

| API | Contract after this checkpoint |
|---|---|
| `KicksStore.save`, `remove`, `book`, `join`, `leave`, `teamLeave`, `updateTeams`, `challengeAction`, `submitFeedback`, `updateSettings` | Return promises. Await completion and catch rejection before success UI/navigation. Existing synchronous internal validation/business rules are retained under the lock. |
| `KicksStore.save(name, record, payment, expectedRecord)` | Optional fourth original-record snapshot for long-lived editing. Reject if stored record changed; dashboard editors pass `old`. Without an explicit baseline, queued replacements use the cached version at invocation; arbitrary externally retained inputs cannot be recognized after intervening reads. Use an explicit baseline or a transaction for such callers. |
| `KicksStore.tournamentBracket(id, action, values)` | Omitted/`read` action remains synchronous. Mutation actions return promises; bracket buttons await them. |
| `KicksStore.transaction(callback)` | New promise-returning boundary. Callback receives a synchronous, scoped facade; latest read occurs after lock acquisition. Catalogue writes are staged and committed once; callback error, forbidden async callback or storage failure discards them. Escaped facade calls reject after closure. Do not call exported async mutators or await work inside this callback; use the supplied facade. |
| `KicksStore.coordinate(task)` | New low-level promise-returning Web Lock boundary for message operations. It holds the same lock until task completion, including a returned promise. It is cooperative coordination, not an authorization API. Do not nest lock acquisitions. |
| `KicksStore.ready` | New promise for any required startup legacy retirement/backfill; resolves `null` on completion or an error message on rejection/failure, with no unhandled startup rejection. Empty/modern stores do not trigger initialization writes. |
| `KicksAuth.setAccountActive` | Now returns a promise; confirmation UI awaits it. `register` was already async; unique-email recheck/insertion now uses one scoped transaction after hashing. |
| `KicksMeetings.save`, `close` | Return transaction promises. Read/permission/overlap validation plus save execute inside the lock; UI awaits completion. |
| `KicksMessages.send`, `markRead` | Return promises. Latest message array is read and replaced within the shared lock. Submission retains draft on error; background read-mark rejection is handled. |
| `KicksDemo.initialize`, `reset` | Already async; now acquire the shared lock instead of a separate demo lock. Removed unsafe no-lock fallback. Existing explicit initialization, reset refusal and rollback policies remain. |

All other read-only APIs, including `list`, `find`, settings reads, availability, tournament access/roster and challenge validation remain synchronous. Theme preference and per-tab session identity writes are separate keys and cannot overwrite catalogue/messages; they remain unchanged.

#### Migrated application callers / exact source files

| File | Migration |
|---|---|
| `js/data-store.js` | Exclusive locking, strict read failure handling, guarded persistence, async mutation exports, startup migration coordination, stale-record rejection and scoped atomic transaction facade. |
| `js/account.js` | Registration transaction; awaited account activation save. |
| `js/dashboard.js` | Await saveRecord, editor/profile/settings saves, confirmation/deletion/account activation; pass original edit snapshot. |
| `js/field-details.js` | Await paid booking before success state. KICKS-004 availability logic unchanged. |
| `js/open-games.js` | Await paid game entry. |
| `js/tournaments.js` | Await paid cup entry; read-only roster preview unchanged. |
| `js/teams.js` | Await create/edit/request/cancel/decision/removal/leave transactions and forwarding handlers. KICKS-007 store authorization remains identical. |
| `js/challenges.js` | Await post/reply/accept/decline/cancel and paid match booking. |
| `js/tournament-bracket.js` | Await bracket mutations before render/reload; read rendering unchanged. |
| `js/meetings.js` | Validate and save/close inside scoped catalogue transaction. |
| `js/meetings-ui.js` | Await save/close before closing modal/rendering success; retain validation errors. |
| `js/contact.js` | Await feedback save before showing email draft/reset/success. |
| `js/messages.js` | Shared lock around send/read updates; await send; handle background errors. |
| `js/full-demo.js` | Shared lock includes initialization/reset/rollback; unsupported locking explicitly rejects. |

`index.html` and the 18 HTML pages under `Pages/` refresh affected script query versions to `coordinated-writes-1`; no layout/theme redesign. The cleanup script remains `preserve-legacy-3`. Task-local audit manifests list all changed pages individually. Existing uncommitted work was retained. Concurrent format/comment-only changes observed in `js/auth.js`, `js/checkout.js` and `js/demo-flow.js` were not overwritten or attributed to this fix; AST comparison found their behavior unchanged.

#### Tests, failures and evidence

- `tests/concurrent-store-regression.cjs`: 13 cases pass. Competing/independent bookings and payment retention; unrelated writes; teams; queued and long-lived stale edits; lock-before-read/write assertions; unavailable/rejected locks; quota/read/corrupt-store failures; recovery; coordinated legacy startup; atomic callback rollback/closure.
- New `tests/concurrent-store-browser.cjs`: 8 checks pass in separate real Edge tabs sharing a disposable context. Includes genuine held-lock queuing, same-slot conflict, independent paid reservations, captain edits, unrelated collections/settings, stale replacement rejection, unsupported form retaining its draft, lock/quota rejection/recovery and concurrent messages. Zero page errors. Evidence: `browser-report.json`.
- New `tests/helpers/web-locks.cjs`: FIFO lock test double across VM contexts. Existing mutation tests now await results/rejections and retain their business assertions; startup migration test awaits `ready`. Read-only suites were kept unchanged where migration was unnecessary.
- Demo regression additionally verifies unsupported initialization writes nothing and initialization versus a queued catalogue write preserves both the fixture and later record.
- Final unit/regression run: **21 pass, 1 known failure** among 22 suites. `navigation-regression.cjs` still reports the previously confirmed KICKS-011 static template-expression false path; no unrelated fix applied. All booking, team, account, payment, bracket, challenge, activity, demo, legacy and storage suites pass. `audit-business-logic-reproductions.cjs` now asserts KICKS-008 rejection and still characterizes five outstanding store defects.
- Existing browser suites pass: business regression, team authorization, field/event conflicts, bracket/leave, dialogs flow, meetings, features, homepage, populated demo, legacy cleanup, premium shell, premium interactions, responsive auth/layout and database documentation. Logs are under `.local/kicks-008-fix/`.
- Initial migration runs retained failures for synchronous rejection assertions, immediate post-click state checks and old two-argument lock mocks. Harnesses were migrated to awaited assertions and a shared-lock completion barrier; no original assertions were removed. A navigation timeout occurred loading external page resources; its rerun passed. One dialogs run completed workflows but its final console assertion reported `KicksAuth is not defined`; a diagnostic isolated rerun passed. This intermittent console observation has no confirmed root cause and was not silently fixed as another issue. Earlier/final logs are retained.

#### Safety, support and remaining limitations

- One exclusive Web Lock covers the entire latest read/validation/write sequence for every application catalogue writer, all message mutations and demo reset/rollback. No backend, database, new runtime framework, unsafe lock lease or localStorage spin lock was added.
- Feature-detect `navigator.locks.request`; use HTTPS or trusted localhost. In unavailable/disabled/insecure environments, browsing remains possible but mutations explicitly reject. A queued request can wait while another cooperating tab holds the lock; no lock stealing is used. Closing its context releases its browser-owned lock. Browser storage quota/permission failures still reject and can be retried after recovery.
- **Rollout:** close/reload every previously open KICKS tab before editing. Already loaded old code and direct/devtools storage writes do not acquire the new lock and can still overwrite data. Cache versions update newly loaded pages; frontend code cannot impose a lock on older/uncooperative code.
- Different host/port origins, storage partitions, browser profiles and devices have separate records/locks. No shared backend inventory, durable cross-device transactions, production identity/authorization or payment-provider verification exists. Payments remain simulated. Cross-key demo rollback remains best effort after a quota/storage failure or process crash; lock coordination does not make multiple keys crash-atomic.
- KICKS-012 cleanup is byte-identical; KICKS-004 scheduling helper bodies and KICKS-007 authorization bodies match the pre-fix snapshot. Their tests pass. Existing data, IDs, history and demo fixtures were not reset or destructively migrated. Tests used only disposable data, not an existing user browser profile.
- Remaining issues KICKS-001/002/003/005/006/009/010 and test defect KICKS-011 remain outside this fix. Stop after KICKS-008.

#### Complete checkpoint file inventory

Application files are listed in the caller table above. HTML changes (script versions only):

- `Pages/About/about.html`
- `Pages/Auth/login.html`
- `Pages/Auth/register.html`
- `Pages/Challenges/challenges.html`
- `Pages/Contact/contact.html`
- `Pages/Dashboard/admin.html`
- `Pages/Dashboard/owner.html`
- `Pages/Dashboard/player.html`
- `Pages/Demo/catalogue.html`
- `Pages/Demo/demo.html`
- `Pages/Fields/field-details.html`
- `Pages/Fields/fields.html`
- `Pages/Meetings/meeting.html`
- `Pages/OpenGames/game-details.html`
- `Pages/OpenGames/open-games.html`
- `Pages/Teams/teams.html`
- `Pages/Tournaments/tournament-details.html`
- `Pages/Tournaments/tournaments.html`
- `index.html`

Updated test files (async contracts, coordinated mocks, preserved assertions and completion readiness):

- `tests/accounts-regression.cjs`
- `tests/activity-lifecycle-regression.cjs`
- `tests/audit-business-logic-reproductions.cjs`
- `tests/bracket-leave-browser.cjs`
- `tests/bracket-leave-regression.cjs`
- `tests/browser-regression.cjs`
- `tests/catalogue-regression.cjs`
- `tests/challenges-regression.cjs`
- `tests/concurrent-store-regression.cjs`
- `tests/demo-dataset-regression.cjs`
- `tests/demo-population-browser.cjs`
- `tests/dialogs-flow-browser.cjs`
- `tests/features-browser-regression.cjs`
- `tests/field-event-conflicts-browser.cjs`
- `tests/field-event-conflicts-regression.cjs`
- `tests/home-floodlights-browser.cjs`
- `tests/meetings-browser-regression.cjs`
- `tests/messages-regression.cjs`
- `tests/payments-regression.cjs`
- `tests/premium-shell-browser.cjs`
- `tests/store-regression.cjs`
- `tests/team-authorization-browser.cjs`
- `tests/team-authorization-regression.cjs`
- `tests/teams-regression.cjs`

Added: `tests/concurrent-store-browser.cjs`, `tests/helpers/web-locks.cjs`. Documentation: this report and `docs/integration.md`. Machine-readable inventory/result: `.local/kicks-008-fix/changes.json` and `result.json`. Final browser rollup: all 15 suites pass after documented harness migrations/reruns; the diagnostic dialogs log preserves the isolated success, and earlier failures remain available.


## Technical audit batch 1 ? KICKS-005 resolution (2026-11-05)

The new audit authorized safe fixes. KICKS-005 is resolved for booking/future-slot validation, availability queries and lifecycle interpretation: exact ISO calendar dates are round-tripped before interpreting an Amman kickoff. JavaScript date normalization no longer permits February 30 as a future reservation. Invalid legacy schedules return an unknown end time instead of being treated as valid events. No stored records are rewritten. Generic mutation validation remains separately unresolved under KICKS-002; generic save can still insert invalid records and must not be considered safe.

Failing reproduction was recorded before implementation in `.local/technical-audit/calendar-before.log` (Missing expected rejection). New `tests/calendar-integrity-regression.cjs` passes eight invalid dates with byte-identical storage and four valid boundaries, including leap-year February 29. `tests/technical-booking-browser.cjs` uses actual login forms, then verifies rejection without writes, two real tabs contending for one slot (one booking and one simulated payment), UI payment cancel/confirm and booking history. Five browser checks pass without page errors.

Changed runtime file: `js/data-store.js` only. New tests: calendar-integrity-regression and technical-booking-browser. Existing reproduction runner updated only for the now-resolved KICKS-005 assertion. Original file backup: `.local/technical-audit/data-store.before.js`. KICKS-012/004/007/008 regressions remain passing. See `kicks-technical-audit.md` and `kicks-technical-audit-checklist.md` for current scope and unresolved high-risk issues. Earlier completion statements and counts above are historical checkpoints, not evidence of present production readiness.

### Superseding technical-audit checkpoint � 2026-11-05

KICKS-001/002/003/006 and 009/010 have now received the central authorization, mutation/identity, linked-history and live-state corrections documented in `kicks-technical-audit.md`, with failing-before and passing-after regression evidence. KICKS-011 navigation scanner is corrected. Previously approved KICKS-012/004/007 remain covered by passing tests. No data was reset or destructively migrated.

**KICKS-008 is REOPENED.** The former completion statement describes a shorter test set. New repeated real-tab Edge and Chrome races prove acknowledged writes can still disappear despite Web Locks. Preserve `tests/concurrent-visibility-browser.cjs` as a failing regression and retain its traces. A raw snapshot guard catches observable intervening changes but does not establish cross-renderer visibility or atomic CAS. No arbitrary timing workaround is claimed successful. See the newest technical audit ledger/checklist for current results and exact remaining work; safe cleanup is deferred.
