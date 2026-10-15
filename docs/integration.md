# KICKS frontend accounts and booking flow

This version uses HTML, CSS and JavaScript only, as requested. Accounts, field listings and reservations are stored in this browser under `kicks-data-v2`; the current sign-in uses sessionStorage. This does not provide server-enforced authentication, authorization, cross-device accounts, shared availability, payments or email recovery. Do not deploy it as a shared booking service without a backend.

## Data and identity

- `js/admin-account.js`: one pre-provisioned administrator, with a salted password hash. There is no public administrator signup.
- `js/data-store.js`: starter fields/events added once, with initially empty registrations, record operations, booking conflicts and event capacity.
- `js/account.js`: player/owner registration, credential matching, session lookup, role checks, account navigation and logout. Passwords are hashed with Web Crypto and are not stored as plaintext.
- `js/auth.js`: form validation, role animation and post-login routing. A regular player goes to Home; owner/admin go to their workspace. A login started from a booking can return to that page.
- `js/dashboard.js`: the signed-in account's scoped data and profile editor, including a local profile photo.
- `js/dashboard-overview.js`: statistics from actual saved browser records.

The starter catalogue is provisioned once without replacing existing records. New owners can publish their own fields and events. Public booking, match and team forms now save entries belonging to the signed-in player. A player can manage those entries in their dashboard. Duplicate hourly bookings, full events and duplicate active entries are rejected.

## Administrator access

The administrator was provisioned outside registration. Its initial access details were saved privately outside the website folder.

`node scripts/create-admin.cjs` only provisions if `js/admin-account.js` is absent. For a fresh installation, set `KICKS_ADMIN_ACCESS_FILE` to a private output path outside the served website directory before running it. Existing stored accounts are not overwritten by running the script. Keep plaintext credentials out of the served directory and source control.

## Verification

Run `node tests/accounts-regression.cjs` and `node tests/store-regression.cjs` from the project folder. Tests use separate in-memory storage and cover signup restrictions, credential verification, role routing, local persistence, booking conflicts, event joining and failed-storage rollback.

## Future backend

Replace local store/account methods with API calls and server-side sessions. Identity, role/ownership checks, authoritative prices, reservation conflicts and capacity must be enforced on the server. Use transactional database writes for bookings and registrations. The frontend guards alone can be bypassed by someone controlling the browser.
