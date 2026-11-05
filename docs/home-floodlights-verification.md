# KICKS — Under the Floodlights

Implemented locally on 2026-11-04 using HTML5, CSS3 and vanilla JavaScript. No OpenDesign run or paid generation service was used for this implementation.

## Changed files and preservation

- `index.html`: cinematic football landing page, usable location/date/time search, a three-scene story, asymmetric field highlights, open-game rows, tournament feature, booking steps and closing CTA.
- `css/home-floodlights.css`: new isolated homepage visual system, responsive layouts, saved-theme support and reduced-motion styling.
- `js/home-floodlights.js`: new homepage presentation adapter, mobile navigation, search, GSAP/ScrollTrigger/SplitText motion and desktop Lenis integration.
- `assets/floodlights/`: pinned browser libraries and local fonts with source/license notices. Existing campaign imagery is reused without changing the files.
- `tests/home-floodlights-browser.cjs`: new isolated browser checks.

Only `index.html` was changed among the 146 files present at the start of this implementation. SHA-256 comparison confirmed every other pre-existing file, including all uncommitted page, booking, account and data-store changes, stayed byte-for-byte unchanged. No reset, checkout, clean, commit or data reseeding was performed.

The current working copies and original diff are saved under `.local/floodlights-qa/` as `before-local-build.zip`, `before.patch`, and `baseline.json`. The homepage keeps the working copy's navigation routes, account integration, FAQ content and footer links. Existing homepage scripts/styles remain on disk; superseded motion files are no longer loaded by this page. `js/home-data.js` remains unchanged; the new homepage adapter reads the same store and public-activity lifecycle methods.

## Interactions and motion

- Search reads the existing published catalogue. Location/date/hour filters exclude confirmed or pending bookings and follow the existing field-details rules for today's availability and hourly slots. A time selection requires a date. The results state explicitly that the booking time must be confirmed on the field page.
- Search never makes a reservation or claims a confirmed booking. Card actions retain the existing field/game/tournament detail routes. No invented fields, prices, availability or platform statistics are shown when the catalogue is empty.
- GSAP 3.13.0 coordinates heading reveals, a short desktop pinned story, measured parallax and SVG bracket drawing. Lenis 1.3.27 uses the same GSAP ticker.
- Touch devices retain native scrolling and an unpinned story. Reduced-motion mode exposes every scene in natural flow. Changing reduced motion while the page is open cleans up pinning, text splitting and Lenis.
- Menus, forms and catalogue rendering work if animation libraries are blocked. Content is visible before motion enhancement. No runtime CDN, external font or paid API request is made by the homepage in the tested default state.

## Verification results

All of these checks passed in isolated Microsoft Edge browser sessions:

- Empty catalogue remains empty, with honest explanatory states.
- Real catalogue rendering, search, reset, date validation and exclusion of an already-booked hourly slot.
- Field-details navigation and existing account menu/dashboard links.
- Layout widths 320, 390, 600, 768, 900, 1024, 1199, 1200, 1440 and 1920 pixels: no document-level horizontal overflow.
- Mobile navigation, Escape/focus restoration, local assistant and native FAQ interaction.
- Axe WCAG 2 A/AA and 2.1 AA checks at 390 and 1440 pixels: no violations in the tested light-theme states. Automated checks do not replace a full assistive-technology audit.
- Blocked animation dependencies: content and search remain usable.
- All three pinned scenes reveal; live reduced-motion changes restore normal document flow.
- Touch-tablet emulation: no Lenis interception or pinned scene.
- No JavaScript page errors, failed local resources, unresolved homepage asset references or external homepage requests in the tested default state.
- JavaScript syntax checks.

Visual review covered desktop/mobile hero, field cards with decoded photographs, community/game section, tournament feature and closing CTA. Fixture screenshots are explicitly test data and were created in disposable browser storage; no real catalogue was modified. Raw checks and screenshots are under `.local/floodlights-qa/`.

A local, unthrottled headless load measured LCP at 272 ms and CLS at 0.00172. These are development-machine observations, not a Lighthouse score or a guarantee of field performance. Network, hardware, real uploaded images and catalogue size will affect deployed results.

The following existing suites passed after integration:

- `tests/store-regression.cjs`
- `tests/accounts-regression.cjs`
- `tests/activity-lifecycle-regression.cjs`
- `tests/payments-regression.cjs`
- `tests/catalogue-regression.cjs`
- `tests/discovery-regression.cjs`
- `tests/browser-regression.cjs`: owner publishing/editing, paid-game creation, tournament creation, meeting editing, authentication, player joining, field booking, demo payments and dashboard access.
- `tests/layout-browser-regression.cjs`: 24 existing public/auth layouts, mobile menu, owner upload and dark registration.

The existing `tests/navigation-regression.cjs` has a pre-existing failure: its static regex treats the `${url}` expression inside `Pages/Demo/catalogue.html` as a literal local path. The file and test were not changed. New homepage references and navigation were checked directly by the dedicated browser suite.

## Running locally

Serve the project with VS Code Live Server or the existing local static server. The development preview used `http://127.0.0.1:4173/index.html`.

Run the new browser suite with Node and Playwright installed, with Microsoft Edge available:

```powershell
$env:KICKS_PLAYWRIGHT_PATH = 'path/to/playwright'
$env:KICKS_TEST_URL = 'http://127.0.0.1:4173'
node tests/home-floodlights-browser.cjs
```

Backend authentication, persistent bookings and payment processing retain the project's existing frontend simulation. ASP.NET/SQL Server integration remains a future phase.
