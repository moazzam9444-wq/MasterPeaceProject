# KICKS frontend accounts and booking flow

This version uses HTML, CSS and JavaScript only, as requested. Accounts, field listings and reservations are stored in this browser under `kicks-data-v2`; the current sign-in uses sessionStorage. This does not provide server-enforced authentication, authorization, cross-device accounts, shared availability, payments or email recovery. Do not deploy it as a shared booking service without a backend.

## Data and identity

- `js/admin-account.js`: one pre-provisioned administrator, with a salted password hash. There is no public administrator signup.
- `js/data-store.js`: an empty initial catalogue, retirement of legacy demo venues, registrations, record operations, booking conflicts and event capacity.
- `js/account.js`: player/owner registration, credential matching, session lookup, role checks, account navigation and logout. Passwords are hashed with Web Crypto and are not stored as plaintext.
- `js/auth.js`: form validation, role animation and post-login routing. A regular player goes to Home; owner/admin go to their workspace. A login started from a booking can return to that page.
- `js/dashboard.js`: the signed-in account's scoped data and profile editor, including a local profile photo.
- `js/dashboard-overview.js`: statistics from actual saved browser records.

The catalogue starts empty. Admins and owners add their own venues and activities. Legacy built-in venues are retired from listings while linked booking and payment history is preserved. Public booking, match and team forms save entries belonging to the signed-in player. Players can view their entries and history but cannot cancel bookings, leave matches or withdraw teams. Organiser/admin record management remains available. Duplicate hourly bookings, full events and duplicate active entries are rejected.

Game and tournament organisers specify `durationMinutes`; the end is calculated from kickoff in Amman time. Public pages retain upcoming and ongoing activities until that exact end, then hide them, including on already-open pages. Older activities without a duration stay in their management dashboard as `Set duration` and are not public until their organiser supplies a duration. One-hour bookings display `Completed` after their end. Ended events and entries remain in role-scoped history, with payments unchanged; expiry never deletes records or creates refunds. Owners have a read-only bookings history for their own fields.

## Administrator access

The administrator was provisioned outside registration. Its initial access details were saved privately outside the website folder.

`node scripts/create-admin.cjs` only provisions if `js/admin-account.js` is absent. For a fresh installation, set `KICKS_ADMIN_ACCESS_FILE` to a private output path outside the served website directory before running it. Existing stored accounts are not overwritten by running the script. Keep plaintext credentials out of the served directory and source control.

## Verification

Run `node tests/accounts-regression.cjs` and `node tests/store-regression.cjs` from the project folder. Tests use separate in-memory storage and cover signup restrictions, credential verification, role routing, local persistence, booking conflicts, event joining and failed-storage rollback.

## Future backend

Replace local store/account methods with API calls and server-side sessions. Identity, role/ownership checks, authoritative prices, reservation conflicts and capacity must be enforced on the server. Use transactional database writes for bookings and registrations. The frontend guards alone can be bypassed by someone controlling the browser.

## Teams and tournament registration

`Pages/Teams/teams.html` is the integrated team directory. It uses existing KicksAuth players and the same kicks-data-v2 store. Existing records migrate with empty teams and teamRequests arrays; no sample accounts or teams are imported. Public browsing is available without sign-in. Creation, join requests and membership changes require an active player. A player belongs to one squad; its creator is captain. Captains edit their team, review requests and remove members. Members request departure and remain in the squad until the captain approves. Leave requests appear alongside join requests in the captain’s Requests tab; rejection keeps the roster unchanged, and members can cancel pending requests. The captain cannot leave their own squad. Creating/joining a squad cancels the player's other pending requests.

Tournament entry now selects a captain-owned team rather than free text. Its format must match the venue format, and its active roster must meet the required 5/6/7-player minimum. Registration snapshots the roster and links the team ID. Later roster edits do not change that tournament's saved participants. Existing legacy registrations remain readable. New entries use the tournament page; dashboard entry creation redirects there. Existing registration status/refund management stays available. Referenced players cannot be deleted while on a roster.

All of this follows the project's existing browser-local architecture. It does not add a shared backend or server authentication. Run node tests/teams-regression.cjs for the new persistence and registration rules.

## Challenge Me: team-to-team friendly matches

`Pages/Challenges/challenges.html` uses the existing account/store/checkout system. No sample accounts, teams or matches are seeded. Only active player captains with a complete active squad may post or request challenges. The poster sets city, date, hourly kickoff (10:00–22:00 Amman), format (from the team), and a cost agreement. Matches are one hour, matching the existing pitch booking model.

The posting captain accepts a rival; this changes Open to Agreed without creating a reservation. Conflicting agreed/booked team matches are rejected. Other open postings/requests for either team at the same kickoff close when an opponent is accepted. The posting captain then selects an available field matching city and format and completes the existing checkout. A single atomic store write saves the booking, payment ledger and challenge booking ID; a stale price or slot cannot partially confirm the match. The booking stores both team IDs, team names and captain IDs. Both captains can see it in booking history, with the posting captain identified as the booker. Team pages, match details, venue details, booking history and captain messaging link to one another.

States: Open, Agreed, Booked, Completed (derived after the booking end), Expired (unbooked kickoff passed), Cancelled. Captains can cancel before booking. Once booked, existing organiser/admin cancellation/refund controls apply; a cancelled/deleted booking makes its challenge cancelled. Booked date/time, venue and player cannot be silently reassigned. Agreed/booked/completed rival captains can message each other via Meetings & messages. Cost splitting is an agreement between captains: the posting captain pays the whole pitch price at demo checkout. The app does not process split transfers or collect card data.

Storage remains browser-local, like the rest of this frontend; no server or database is introduced. `node tests/challenges-regression.cjs` covers the new business rules; messaging regression also covers rival-captain eligibility.


## Tournament draw and manual progression

Tournament cards and the organiser dashboard link to tournament details and a responsive single-elimination bracket. The bracket uses actual Registered entries (including legacy entries), not the editable team count. Drafts refresh with the registered field; shuffle randomises first-round pairings. Non-power-of-two fields receive automatic byes. Starting locks the draw and registrations. Only active administrators can create new tournaments. Administrators can manage all tournament brackets and records. Legacy owner-created tournaments retain their original organiser access. Older tournaments inherit their existing field organiser as creator; the identity is preserved when tournament details or field ownership change. Owners retain access to details after public activity expiry.

Drag a team into its match’s winner slot or its connected next-round place; the arrow button offers the same action for touch and keyboard. A team can only advance from its own resolved pairing. Correcting an earlier winner clears all later results along that path. The champion is derived from the final. Results persist in the tournament record under the existing local-browser architecture. This bracket is single elimination; it does not calculate group-stage standings.

Checks: `node tests/bracket-leave-regression.cjs` and `node tests/bracket-leave-browser.cjs` (Playwright/Edge; isolated browser context).


## Shared dialog flow

`js/dialogs.js` and `css/dialogs.css` are loaded across all pages. Use `KicksDialogs.open(dialog)` for native modal dialogs. Opening a secondary form, confirmation or checkout temporarily closes the parent without running its final-close cleanup; the parent returns when the child closes, retaining its draft, focus and scroll. Only one modal is open at a time. Navigation and cross-tab catalogue updates dismiss the flow. Form submissions update suspended detail contents before resuming. Backdrop dismissal requires a pointer press outside; padding clicks stay inside the dialog. Long forms scroll within the viewport and keep their heading accessible; mobile forms use a single column.

Regression: `node tests/dialogs-flow-browser.cjs` covers team edit/join/remove, a paid tournament entry, the complete challenge request/accept/booking flow, captain messaging, player/owner booking history, checkout cancellation and draft retention, and 320/390-pixel modal layouts in an isolated browser context.


Tournament progress and registered rosters are private in the application UI: the creator and active players on a Registered entry can view them. Participation uses the saved tournament roster (legacy entries without a roster fall back to team membership); captains also qualify through their own registration. Outsiders, guests and unrelated owners cannot read the bracket through the bracket action method; administrators have management access. Participants have a tournament detail link in My tournaments, including after public listing expiry. Participant access never grants editing. Browser-local storage remains readable to someone controlling that browser; server-side data filtering and authorization are required for real privacy in a hosted multi-user service.


## Retired demo catalogue

KICKS-012 resolution (2026-11-05): `js/demo-data.js` is now a compatibility entry point with no storage access. Automatic removal of legacy samples, linked bookings/payments, roster members, messages and sessions is disabled. Existing data stays intact; no automatic reset or archival is performed. The separate, explicit sample initializer in `js/full-demo.js` is restricted to the existing isolated preview origin, refuses occupied stores and permits reset only for an unchanged fixture. Run `node tests/legacy-cleanup-preservation-regression.cjs`, `node tests/demo-retirement-regression.cjs` and `node tests/audit-legacy-cleanup-reproduction.cjs` for retention checks; `node tests/legacy-cleanup-browser.cjs` verifies real-page navigation without storage mutation.

## SQL Server database v2

The local SQL Server database Kicks was replaced on 2026-11-04 with the current 26-table schema (207 columns, 58 foreign keys). The previous database was backed up and verified before replacement. The former source package is archived in .local/archive/sql-package-legacy-20261104. The authoritative schema and generated documentation live in docs/database/ (exactly database.html, database.css, database.js and database-data.js). Open docs/database/database.html for diagrams, dictionaries, generated SQL and database-vs-API rules. Deployment/verification records are in .local/database-v2/README.md.

The website still uses its existing browser store. This database replacement does not introduce a backend connection, migrate demo accounts or claim server-enforced participant privacy; those integration responsibilities are documented explicitly.


## Booking and event occupancy - KICKS-004

New or rescheduled Pending/Confirmed field reservations are checked against scheduled games and tournaments, and event creation/rescheduling/duration/field changes are checked against existing Pending/Confirmed reservations. Time comparisons use Amman half-open intervals: one-hour bookings and each event's existing duration. Adjacent boundaries are allowed; cancellation releases occupancy. Legacy events without duration remain unpublished and do not hold slots. Field details and homepage search share `KicksStore.isFieldSlotAvailable()` while retaining their existing date/hour rules.

No existing schedules are migrated, deleted or automatically repaired. Unchanged-schedule metadata edits remain possible for legacy conflicts. Rejected attempts do not persist or alter payments. These browser-local checks do not solve concurrent writes or provide server-enforced security; event-versus-event scheduling remains outside this fix.

Regression: `node tests/field-event-conflicts-regression.cjs` (30 cases) and `node tests/field-event-conflicts-browser.cjs` (original forms and availability controls). See the KICKS-004 resolution in `docs/kicks-data-and-logic-audit.md` for evidence and limitations.


## Team authorization - KICKS-007

Team/request writes use `KicksStore.updateTeams()` or `teamLeave()`; generic `save/remove` for `teams` and `teamRequests` are rejected. The store resolves the current session against stored Active player identity and authorizes the entire detached transaction. Caller role, user ID and callback projections cannot grant captain rights. Only the original captain edits their squad or reviews requests; roster additions require prior pending consent, departures require captain approval, and a free agent creates only their own sole-founder squad. Players may cancel their own pending requests. Existing rules grant owners/admins no team-edit override. Deletion/captain transfer remain unsupported.

No automatic migration or reset occurs. Unauthorized calls persist nothing; memberships, history and other collections stay intact. This is browser-local integrity validation, not server authorization or a solution to concurrent writes. Tests: `node tests/team-authorization-regression.cjs` and `node tests/team-authorization-browser.cjs`; resolution/evidence in `docs/kicks-data-and-logic-audit.md`.


## Coordinated asynchronous writes - KICKS-008

All catalogue mutation methods now return promises: `save`, `remove`, `book`, `join`, `leave`, `teamLeave`, `updateTeams`, `challengeAction`, `submitFeedback`, `updateSettings`, and non-read `tournamentBracket` actions. Await them inside error handling before reporting success. Read APIs and `tournamentBracket(id)` remain synchronous. `KicksAuth.setAccountActive`, `KicksMeetings.save/close`, and `KicksMessages.send/markRead` also return promises.

One exclusive Web Lock named `kicks-storage-v2` is acquired before reading current storage. The lock includes validation and persistence. Messages, startup backfills and explicit demo initialization/reset/rollback use this same name. Browsers without Web Locks reject mutations with a clear error; there is no unsafe synchronous fallback. Serve over HTTPS or localhost and reload every old tab before editing.

For atomic compound catalogue logic, use `await KicksStore.transaction(tx => { /* synchronous reads/validation and tx.save/etc */ })`; use the supplied synchronous facade, never await or acquire a nested lock inside it. It stages catalogue writes and commits once on success. For long-lived record editors, pass the original record as `await KicksStore.save(collection, editedRecord, payment, originalRecord)` so changed records are rejected rather than overwritten. `KicksStore.ready` resolves null after required startup migration or a descriptive error if it fails. `coordinate(task)` is the shared low-level lock boundary for message operations, not an authentication mechanism.

Cooperative browser locking does not protect against old/uncooperative scripts, direct storage edits, process crashes across multiple keys, other devices or client-controlled identity. Payments remain simulated. Full API/caller/test evidence is in the fourth checkpoint of `docs/kicks-data-and-logic-audit.md`. New tests: `node tests/concurrent-store-regression.cjs` and `node tests/concurrent-store-browser.cjs`.

## Platform tournament revenue policy
New tournament registration payments allocate 100% of the entry fee to platform/admin revenue (commission equals amount; ownerNet is zero). Existing ledger rows are preserved unchanged. Field booking and open-game revenue remain on their existing split. Venue booking costs and tournament expenses are separate; entry-fee revenue is not a computed net-profit figure. Demo payments remain simulations.

## QA follow-up — 5 November 2026

Catalogue writes now use an IndexedDB snapshot/revision handoff under the existing Web Lock; localStorage remains the synchronous mirror. Await mutations before success, reload older tabs, and do not implement new direct mirror writers. Browser-local storage remains independent per origin/profile. Counts derive from active participation records, and team schedules reject overlapping tournaments/agreed challenges. Administrator dashboard actions support registration withdrawal/refund before draw lock and whole-tournament cancellation/refund with retained history. See `docs/qa-fixes-2026-11-05.md` for protocol details, policies, evidence and remaining product suggestions. The retired hero halftone script must not be restored or reintroduced as an HTML dependency.

The subsequent recheck also coordinates message-array snapshots through IndexedDB using internal `KicksStore.updateMessages(syncCallback)`. Keep message mutations behind `KicksMessages.send/markRead`; await completion before success. Game/tournament listings and details refresh from data events and cancel stale checkouts through `KicksCheckout.cancel()`. Both agreed captains can contact the booked venue owner. See `docs/qa-recheck-2026-11-05.md` and `tests/live-activity-messages-browser.cjs` for evidence and limitations.
