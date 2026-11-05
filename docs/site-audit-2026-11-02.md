# KICKS frontend audit — 2026-11-02

## Result

Nine logic/storage regression suites and four Microsoft Edge browser suites passed. Browser contexts were isolated and temporary; existing browser profiles and the user's catalogue were not modified. No database, backend, paid AI service or gaming lounge feature was added.

## Fixed

- Admin account review: the city input was HTML-required even though newly registered accounts have no city. This blocked the Save button before validation could show an explanation. City is now optional for user records; the actual proof-upload → pending → admin review → activation → owner login workflow passes in the browser.
- Owner verification: reactivation/approval of a publicly registered owner still requires the ownership document after a rejection or inactive state.
- Assistant: added Tafilah, Ma'an and Balqa/Salt aliases; aligned Salt searches with the actual Balqa catalogue value. Rejects asymmetric formats such as 5v6 instead of silently treating them as 5v5.
- Assistant: supports searching published field names and areas, without mistaking a city name for a specific field/area restriction.
- Assistant: supports starting over (بحث جديد / reset), removing a budget (بدون ميزانية / any budget), clearing city/time/category filters, and removes an old area restriction when the city changes. Effective dates, times and text filters appear in the reply.
- Messages: incoming refreshes preserve an unfinished draft, keyboard focus and cursor selection. Drafts are scoped to both sender and contact. A hidden browser tab does not automatically mark newly arrived messages as read.
- Browser tests: updated old assumptions about automatic signup, ownership proof, tournament duration and playing position; meeting tests now create their own fixture catalogue.
- Changed script URLs have fresh cache versions.

## Verified

- Registration pending state, ownership-document upload, admin proof access/approval and role-based login; deactivation retains records and blocks login.
- Fields search, filters, pagination, invalid price range and missing detail records.
- Nearby controls are mounted beside result counts on fields/games/tournaments pages, update the existing cards, display approximate distances and restore all cards with Show all.
- Arabic compact assistant returns actual catalogue links, preserves follow-up context and removes a budget correctly.
- A playing position is mandatory before game checkout and persists in the player's and owner's participant lists.
- Booking, demo payments, listing charges, cancelled checkout, price changes, capacity, event history and refunds.
- Player messaging is limited to the administrator and owners of fields they booked; replies appear at the other account.
- Owner field creation/editing, image upload/rejection, profile and password changes, tournament creation and meeting scheduling/editing/cancellation.
- Meeting provider failure, retry, muted defaults, leave and cancelled-room access. The live Jitsi external script returned HTTP 200. An actual multi-person audio/video call was not tested; interaction tests use a provider stub.
- 24 public/auth layouts across 390, 768 and 1440 pixel widths; no document-level horizontal overflow. Mobile navbar, owner upload and dark registration were checked. Screenshots inspected for desktop chat, mobile catalogue and dark mobile registration.
- Contact feedback saves locally and exposes the email-draft link, without sending any email.
- JavaScript syntax and public HTML local resource references: no errors/missing targets found.

## Remaining product limits and priorities

1. The assistant is a local rule-based search helper. It is not a connected generative AI model. A model-provider seam exists; broader conversation understanding requires that later integration.
2. Nearby distances based on place names are estimates from area/city reference points. They cannot establish an exact 15 km boundary around an individual pitch. Exact pitch coordinates would be needed for that guarantee.
3. Accounts, messages, documents, bookings and payments remain a local frontend simulation. Keep a backend with server-side authorization and booking-conflict enforcement as the next implementation phase when requested.
4. Before a presentation, prepare a coherent demonstration catalogue: fields with meaningful areas, future open games with available places, tournaments, and approved test roles. Do not replace the user's real catalogue with generated demos automatically.
5. Build the future gaming-lounge reservation flow around station/time availability first, then connect the 3D interaction to that same state.

## Reproduce

Run node tests/<name>-regression.cjs for accounts, store, payments, activity-lifecycle, catalogue, discovery, messages, nearby-catalogue, place-resolver.

Browser suites: browser-regression.cjs, meetings-browser-regression.cjs, features-browser-regression.cjs and layout-browser-regression.cjs. They expect an isolated static server at http://127.0.0.1:4173, Playwright via KICKS_PLAYWRIGHT_PATH, and Microsoft Edge. KICKS_QA_OUTPUT optionally selects a screenshot folder. Playwright was provisioned in the system temp directory for this audit; no repository package dependency was added.
