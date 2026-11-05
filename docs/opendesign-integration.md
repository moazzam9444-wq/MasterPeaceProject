# Actual OpenDesign football integration

## Sources and preservation

Visual source: `C:/Users/User/AppData/Roaming/Open Design/namespaces/release-stable-win/data/projects/kicks-10d8/football.html` and its `football/` directory. The unrelated sneaker-store index was not used. No cloud generation or paid credits were used.

Application source: the existing KICKS working tree, including its uncommitted changes. Before replacing files, the existing homepage, shared inner-page CSS, homepage browser test, all inner HTML pages, and original application JavaScript were saved in `.local/opendesign-integration/before.zip`. SHA-256 baseline: `baseline.json` in the same directory.

All pre-existing application JavaScript is unchanged byte-for-byte. Existing authentication, booking, payments, storage, dashboards, teams, challenges, meetings and discovery continue to run. Browser tests use disposable contexts and isolated fixture storage, not the user's existing browser data.

## Files changed

- `index.html`: actual football source layout, images, typography, section structure, mobile menu and footer, with real store-backed containers, original application script loading, account hook, FAQ, search/reset and navigation.
- `assets/opendesign-football/`: copied source football directory. CSS, stock imagery, credits, WOFF2 fonts and vendor libraries are byte-for-byte copies. Its presentation `js/main.js` retains source motion but delegates search to the data-aware adapter; adds touch-safe scrolling and live reduced-motion cleanup, including text splitting and bracket strokes.
- `js/opendesign-home.js`: homepage-only adapter. Fields, real uploaded photos, games, tournament names, IDs, prices and capacities come from KicksStore. Uses existing Amman date/hour and booking-conflict behavior, public activity lifecycle, data change listeners, account routes and logout function. No sample catalogue is inserted.
- `css/opendesign-home.css`: compatibility styles for account controls, search/empty states, retained FAQ, themes and small-text contrast corrections.
- `css/floodlights-system.css`: inner-page presentation now uses actual source WOFF2 fonts, source navy/lime/paper palette, football imagery and button styling.
- All 18 HTML files under `Pages/`: shared stylesheet version updated; original page structures, forms and scripts retained. Includes Fields, OpenGames, Tournaments, Teams, Challenges, About, Contact, Auth, all three Dashboards, Meetings and the two existing Demo pages.
- `tests/home-floodlights-browser.cjs`: adapted to actual source markup/animation structure, retains real-store behavior checks, adds mobile account/logout assertions and inner-page screenshot/overflow checks.

The previous homepage styles/scripts remain on disk. No original files were deleted. Promotional stock photography is used in decorative campaign sections; published venue cards retain their actual stored imagery.

## Verification

Passed application regression suites: store, accounts, payments, catalogue, activity lifecycle, teams, challenges and discovery. Existing end-to-end browser suite passed field filters, empty/missing records, signup/login, dashboard role boundaries, owner publishing/photo upload/editing, cancelled and paid checkouts, games, tournaments, meetings, profiles/password changes, player joining/booking, linked deletion protection and admin settings persistence.

The responsive public/auth suite checks 24 layouts across mobile/tablet/desktop, mobile navigation, ownership proof upload and dark registration. The homepage suite checks real-store rendering, unchanged storage during search/reset, date validation, booked-slot exclusion, exact record links, account menus, mobile logout, widths 320–1920px, FAQ/discovery controls, axe WCAG A/AA, blocked animation fallback, all three story states, GSAP/Lenis activation, live reduced-motion cleanup, touch behavior, local references, images and browser errors. It also captures Fields, Teams, Challenges, Login and Admin at 390px and 1440px.

Screenshots and machine-readable browser report: `.local/opendesign-integration/qa/`. The fixture records visible in screenshots exist only in disposable test storage. Preservation results: `.local/opendesign-integration/preservation.json`.

The source prototype's UAE locations, AED prices, sample venue/game IDs, invented cup name and demo-data notices were removed from the integrated homepage. Source styling stays local; no paid service or external runtime resource is needed by the homepage. Existing inner-page Bootstrap/font CDN dependencies remain as in the original application.
