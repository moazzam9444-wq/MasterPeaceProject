# KICKS visual upgrade - completion notes

## State recovered and work completed

The existing redesign was inspected rather than restarted. At resume, the shared editorial stylesheet, field/game/team/tournament cards and details, challenge and meeting surfaces, dashboard/profile/booking styles, homepage team showcase, and responsive/theme captures were already implemented. Those completed components were retained.

The remaining work was visual QA and delivery. Completed during the continuation:

- Fixed insufficient contrast in the new homepage empty-team message and its link.
- Kept the shared dark background at the approved original navy `#07111f`, including guide pages.
- Removed duplicate visible accessibility text from the new homepage squad links, retaining descriptive accessible names.
- Resolved a motion conflict: the legacy `.section-enter` animation's retained translate value was preventing hover elevation. The new stylesheet disables that legacy animation only on components already handled by the new reveal system. Existing scripts were not rewritten.
- Completed interaction checks, final screenshots, a local comparison gallery and this report.

## Visual source and design choices

The source remains the existing local OpenDesign football prototype:
`C:/Users/User/AppData/Roaming/Open Design/namespaces/release-stable-win/data/projects/kicks-10d8/football.html`
and its `football/` assets, already copied into `assets/opendesign-football/` by the earlier integration. The unrelated sneaker-store prototype was not used. No generation service, cloud call, paid dependency, new backend or framework was introduced.

The design uses the existing local condensed Barlow headings and Manrope body fonts, deep navy/charcoal surfaces, warm light backgrounds and restrained lime accents. It retains distinct layouts: photographic venue cards, matchday schedule strips, dark club identity headers, tournament prize strips and progression, and quieter workspace tables/panels. Existing names, IDs, prices, statuses, dates, member counts and statistics remain data-backed.

## Completed categories

| Category | Presentation changes |
|---|---|
| Fields and Field Details | Larger consistent photography, clear names/rating/metadata, price/action rows, more legible facts/amenities, premium booking rail and time-slot states. |
| Open Games and Game Details | Matchday schedule treatment, capacity/progress hierarchy, clear prices/actions, refined fact panels and playing-position controls. |
| Teams and Team Details | Club shield/identity strip, recruitment badges, roster cards, refined tabs, request surfaces and captain actions. |
| Tournaments and Tournament Details | Prize and entry hierarchy, photographic cover, registration rail, registered squad panels and themed bracket progression. |
| Challenges | Match identity, status, schedule, matchup and booking/request surfaces. |
| Meetings and messages | Consistent briefing cards, room panels, actions, conversation surfaces and composer. |
| Dashboards, bookings and profiles | Statistic panels, tables, monetary/date/status hierarchy, profile details and existing forms. Values and chart categories remain driven by the existing modules. |
| Homepage | Preserved the original editorial venue/game/tournament layout; added a read-only team showcase linking to existing team details. |
| Supporting pages | Refined existing About/Contact and discovery surfaces. Approved navbar, login, theme behavior and all action hooks are retained. |

## Files

Added application presentation files:

- `css/floodlights-editorial.css`: shared visual tokens, category-specific treatments, responsive rules, both themes, focus/hover/reduced-motion states and the final contrast/motion fixes.
- `js/visual-motion.js`: guarded local GSAP reveals and honest local-image fallbacks. Does not read or write KicksStore or storage. Existing page content remains visible without GSAP/IntersectionObserver.
- `js/editorial-home.js`: read-only team projection from the existing KicksStore. Escapes record text and encodes existing IDs; does not seed or mutate records.

Existing HTML files modified (shared presentation asset links; homepage also adds the team section):

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

The existing local GSAP asset is reused on the applicable inner pages. Existing JavaScript and CSS files remain byte-identical to the checkpoint inventory. KicksStore, authentication, booking/payment, roles/team permissions, concurrency and demo/storage scripts were not modified. No image/font files or existing functionality were deleted. Existing uncommitted work is retained.

Added tests:

- `tests/visual-editorial-browser.cjs`
- `tests/visual-editorial-interactions.cjs`

No existing regression assertions or application transaction APIs were changed for this visual task.

## Verification and screenshots

Final capture matrix: **23 views x 3 widths x 2 themes = 138 screenshots**, at 390, 820 and 1440px in light/dark mode. It includes listing/detail views, team roster modal, bracket, challenge detail, all three dashboards, meetings, profile, booking history, About, Contact and the homepage team showcase. The prior baseline contains **72 screenshots** at desktop/mobile widths. New views and tablet baselines are identified as unavailable in the gallery rather than inventing a before image.

- Final capture checks: no horizontal document overflow, broken visible images, page errors or catalogue-byte changes.
- Seven focused checks pass: real homepage club names/IDs and accessible links; hover/reveal/focus behavior; reduced motion; honest broken-image fallback; cross-page theme persistence and photo modal Escape; mobile roster keyboard interaction; exact catalogue preservation.
- Seven existing browser suites pass after reruns: dialogs flow, field/event conflicts, team authorization, bracket/leave, homepage Floodlights, concurrent store, and premium shell interactions. These cover the existing booking, team/captain, simulated payment, tournament, authentication/menu/theme and concurrency behavior affected by the presentation surface.
- The homepage suite also checks ten widths from 320 to 1920px, reduced motion, animation fallback, navigation, search and its existing axe accessibility scan. The initially detected contrast violation was fixed and the suite passes.
- Initial browser attempts on the old local server encountered connection refusals; final regressions used an isolated static server on `127.0.0.1:4181` serving the same workspace. An ephemeral runner changes only the test origin in memory; it does not change test assertions or production routes. One team test initially lost its JavaScript context during login navigation and passed on rerun. Logs retain those initial failures; no business fix was applied.
- Visual capture tests use reduced motion for stable stills. Normal-motion/hover and preference changes are tested separately. Captures block redundant remote Google font requests and use existing local font assets.

Open the comparison gallery: `.local/visual-editorial/review.html`.
Screenshots: `.local/visual-editorial/before/` and `.local/visual-editorial/final/`.
Evidence: `final/report.json`, `interactions.json`, `result.json`, `regression-final.json`, `resumed-tests.json` and individual logs in that same directory.

The screenshot/test fixture is fictional sample data built from the existing demo catalogue, in disposable Edge contexts. Existing user browser profiles were never opened, populated or reset. Each visual route asserts that the stored catalogue stays exactly unchanged.

## Preservation and remaining issues

Backup: `.local/visual-editorial/before.zip`; source hashes: `baseline.json`; resumed stylesheet backup: `resume-before.css`. Final hash comparison confirms all pre-existing application JavaScript and stylesheets match the checkpoint. This preserves KICKS-012, KICKS-004, KICKS-007 and KICKS-008 without altering their implementation.

No blocking visual issue remains from this pass, and no business-logic change is required to deliver these improvements. Unsupported statistics, fabricated participants/fixtures and new account/booking behavior were not added. Missing venue imagery uses a clearly identified illustration while retaining the actual record and links. Content availability and permission-gated sections still follow the existing application rules.

This was a design continuation; no new business logic audit or unrelated defect fix was started.
