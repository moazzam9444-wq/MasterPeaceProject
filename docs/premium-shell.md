# Premium football navigation, authentication and themes

Implemented in the existing KICKS project using the actual OpenDesign football identity and local assets. No cloud generation or paid service was used.

## Changed files

- `js/navigation.js` (new): reusable header across all 19 existing pages. Standard route list, folder-aware active indicators, mobile menu, focus trap, Escape handling, sticky scroll state, existing `#mainNavbar`/`#navbarAccount` hooks and account refresh. Dashboard side navigation is retained and shares the navy/lime identity. Existing additional navigation destinations are retained when present.
- `css/premium-shell.css` (new): local football typography, glass navy header, lime login button, underline and hover effects, animated mobile menu, sun/moon control, responsive auth split screen and readable theme variables.
- `js/theme.js`: retains the existing `kicks-theme` key and synchronous theme selection before paint. Adds animated SVG sun/moon control, safe storage handling, system preference fallback, cross-tab synchronization and an optional `KicksTheme` presentation API.
- `index.html` and all 18 existing HTML pages under `Pages/`: load the shared component/styles; existing authentication, data and page scripts remain connected. The two existing guide/demo pages also load the standard admin-account/store/account dependency chain for consistent signed-in navigation.
- `Pages/Auth/login.html` and `Pages/Auth/register.html`: stadium story panel, refined form presentation, local GSAP entrance enhancement. Login and registration form markup is byte-for-byte identical after newline normalization, including field names, IDs, validation attributes and password controls. Signup switching, ownership upload and authentication logic are retained.
- `js/opendesign-home.js`: removed its duplicate mobile account/menu adapter; the homepage now uses the original account dropdown through the shared header.
- `assets/opendesign-football/js/main.js`: removed duplicate homepage header/menu handlers; source GSAP/ScrollTrigger/SplitText/story motion remains. Lenis pauses while the shared mobile menu is open and resumes on close.
- `tests/home-floodlights-browser.cjs`: adjusted mobile account assertions to use the original shared dropdown/logout controls.
- `tests/premium-shell-browser.cjs` and `tests/premium-shell-interactions.cjs` (new): coverage for layout, theme and account integration.

## Preservation

Backup: `.local/premium-shell/before.zip`, with baseline SHA-256 hashes in `baseline.json`. The archive contains the prior working copies, including uncommitted changes. Authentication (`auth.js`/`account.js`), booking, checkout, data-store, dashboard, catalogue, teams and challenge logic were not modified. No production records or browser profile data were changed. Test fixtures use disposable browser contexts.

Remember Me is intentionally absent: the existing authentication uses session storage and has no persistent-login feature. No misleading checkbox or new account/session behavior was introduced.

## Verification

Passed:

- Shared shell: all 19 pages at 320, 390, 768, 1024, 1280 and 1440 pixels; no horizontal overflow; exactly one header/theme control; visible theme control; mobile menu and Escape focus restoration.
- Logged-in/logged-out states, original account dropdown, player/owner/admin routes, and real mobile logout.
- Existing login validation, wrong-credential handling, password visibility, signup mode switching and owner controls.
- Theme persistence on navigation/reload and synchronization between tabs.
- Axe WCAG A/AA checks on Login/header at 390 and 1440 pixels in both themes.
- Nested account/mobile-menu Escape behavior, Lenis pause/resume, login GSAP enhancement and reduced-motion visibility, actual authentication disabled/busy state and error recovery.
- Existing homepage suite: catalogue/search/reset, booked-slot exclusion, correct record links, account behavior, ten viewport widths, FAQ/discovery, animation fallback, live reduced motion, touch scrolling and local resource checks.
- Existing public/auth layout suite: 24 layouts, mobile navigation, owner document upload, dark registration and feedback submission.
- Existing end-to-end browser suite: signup/login, role restrictions, owner publishing/editing/photo upload, paid game creation, tournament creation, meetings, profile/password changes, player joining/booking, payment cancellation/confirmation, linked deletion protection and admin settings.
- Store, account and payment unit regression suites; JavaScript syntax checks.

Screenshots and reports: `.local/premium-shell/qa/`. Homepage verification also retains its existing report location `.local/opendesign-integration/qa/`. Desktop/mobile visual review covered login in both themes and the shared navigation. No known failures remain in the tested flows.
