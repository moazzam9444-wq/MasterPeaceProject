# KICKS — secondary-page reconstruction

Implemented directly in the existing project. The approved homepage is protected. The previously completed Fields discovery/detail reconstruction is retained; this task extends that design foundation throughout the remaining application.

## Review

[Before/after comparison gallery](../.local/secondary-reconstruction/review.html) · [Earlier Fields transformation](../.local/kicks-structural-phase12/review.html)

The gallery compares the archived original presentation with the current application at 1440, 1024, 768, 390 and 320px, in both themes. Screenshots use the existing fictional demo catalogue in disposable browser contexts. They do not represent real user activity or alter the user's browser profile.

## Structural changes by phase

1. **Fields:** kept the completed cinematic discovery hero, horizontal filters, featured venue spread, smaller venue cards and responsive reservation interface. Reverified the existing booking/payment flow instead of replacing completed work.
2. **Community:** games now use fixture rows with a dedicated kickoff rail, match identity, occupancy and actions. Team cards have a crest/identity rail and scouting information sheet. Tournaments use an edition/date rail, photographic competition poster and entry-information desk. Challenges use matchup rows. Meetings use schedule-led information layouts. Game/tournament detail pages have photographic title treatments and mobile anchors to their existing registration controls. Club/challenge dialogs have new mastheads; challenge summaries sit in the briefing workspace. Actual names, IDs, statuses, rosters, dates, fees and supported metadata remain supplied by the original renderers.
3. **Player:** a photographic personal touchline feature, original record-based KPIs, upcoming bookings and game/tournament participation in a new activity composition. Narrow screens turn personal tables into labelled activity lists.
4. **Owner:** a wide venue-operations masthead, an operational KPI strip and field-management desk beside existing activity analytics. Booking history becomes a transaction desk with a separate search/identity rail. Management forms, meetings and account sections share the new workspace surfaces.
5. **Admin:** a compact control masthead, dense platform indicators and a two-column oversight composition for existing charts, attention items and accounts. Existing management tables remain operational tables, with accessible scroll regions on narrow screens. No unsupported analytics, approvals or permissions were invented.
6. **Account/support:** authentication is recomposed as a membership desk with a cinematic story opposite the form, stacked naturally on mobile. Profiles use a separate identity column and grouped account details; editing has a dedicated image/identity column. About, Contact and the existing Arabic demo pages adopt editorial layouts. Payment dialogs receive scoped transaction styling; processing behavior and simulation disclosures remain unchanged.

The workspace navigation preserves every hash route. It adds a mobile workspace menu, active-state treatment, account identity and a current-section breadcrumb. Player, owner and admin overviews have different compositions, while navigation primitives remain consistent.

## Implementation and DOM contracts

`js/secondary-presentation.js` is a guarded presentation adapter. It moves existing DOM nodes into new semantic groups rather than recreating forms or action buttons. Existing direct listeners, delegated handlers, IDs, form names and data attributes remain attached. It observes subsequent original renders, composes each new subtree once, and settles without repeated DOM changes. It does not call mutation APIs or persist anything.

`css/kicks-secondary.css` owns secondary-page compositions and component palettes. The existing opt-in `kicks-system.css` supplies typography and tokens. Superseded `floodlights-editorial`, `floodlights-system`, `theme`, `site-polish` and dashboard `sidebar` presentation stylesheet links were removed from adopted pages where applicable. Their original files are preserved. Functional scripts—including theme, navigation, account, dialogs and all business modules—remain intact.

Animation uses the already available local GSAP for new feature entrances, existing card reveals, and scoped CSS for hover/image zoom, menus, dialogs and dashboard transitions. **No new animation library or dependency was installed.** Reduced motion disables these transitions. No Lenis or scroll-jacking was introduced on secondary pages. The homepage loads no new dependency.

## Changed files

Existing HTML modified:

- `Pages/OpenGames/open-games.html`, `Pages/OpenGames/game-details.html`
- `Pages/Teams/teams.html`
- `Pages/Tournaments/tournaments.html`, `Pages/Tournaments/tournament-details.html`
- `Pages/Challenges/challenges.html`, `Pages/Meetings/meeting.html`
- `Pages/Dashboard/player.html`, `Pages/Dashboard/owner.html`, `Pages/Dashboard/admin.html`
- `Pages/Auth/login.html`, `Pages/Auth/register.html`
- `Pages/About/about.html`, `Pages/Contact/contact.html`
- `Pages/Demo/demo.html`, `Pages/Demo/catalogue.html`

New files: `css/kicks-secondary.css`, `js/secondary-presentation.js`, `tests/secondary-reconstruction-browser.cjs`, this document and local review artifacts.

Backups and preservation evidence: `.local/secondary-reconstruction/before.zip`, `baseline.json`, `archive/` and `preservation.json`. No files were deleted. Original uncommitted source content was used as the baseline.

## Verification

- **Responsive rendering:** 22 views × five widths × two themes = 220 current view captures. The core delivery captures 20 views; the two booking-history views and refined game/tournament details have additional dedicated capture reports. No detected document overflow, broken visible images, page exceptions or catalogue writes during browsing. The same 220 baseline views were captured from a read-only archived static server.
- **Dashboard navigation:** all 26 existing hash tabs open: six player, eight owner, twelve admin. Mobile menu activation/dismissal, role-specific navigation, profile editor/cancel and live booking search pass. Original dataset bytes remain unchanged by these presentation interactions.
- **Accessibility:** 48 automated scans across community pages, dashboards, login and detail views, desktop/mobile and both themes, with zero reported violations in the final scoped results. Modal scans use the active dialog because obscured inert background content can otherwise produce contrast false positives. Initial failures exposed genuine legacy contrast and hidden-label problems; these were corrected in presentation styles/accessible labels. These scans are not an exhaustive accessibility certification.
- **Unit regressions:** accounts, store, teams, team authorization, payments, field/event conflicts, concurrent store, bracket leave, challenges, messages and destructive-cleanup preservation pass.
- **Browser regressions:** general application, features, field/event conflicts, team authorization, meetings, bracket leave, dialogs, homepage and structural Fields workflows pass. The features suite was rerun after detail/control refinements and passed again. Concurrent-store browser coverage initially failed on the immediate team-name assertion; isolated reruns on both current and archived sources passed, including booking/payment coordination, stale-write rejection, unsupported Web Locks, storage-failure recovery and messages. The initial failure is retained rather than erased.
- **Known test limitation:** the existing static `navigation-regression.cjs` scanner treats the inline template `href="${url}"` in the demo catalogue as a filesystem path. It fails identically against the archived original HTML. That parser was not changed during this design task. Runtime navigation and all dashboard hash routes are covered separately.
- JavaScript syntax checks pass. Original element IDs, form names and executable inline scripts are preserved. Hash evidence confirms **all original application JavaScript and all original CSS files are unchanged**, including KicksStore, Web Locks, authentication, payments and the completed business fixes.

Initial overflow in authentication/Contact and a transient browser `ERR_NETWORK_IO_SUSPENDED` capture interruption are retained in earlier logs. Corrected viewport captures and final checks pass. Test harness corrections include explicitly applying the existing theme API during same-document hash navigation; this did not change application theme logic.

## Homepage protection

`index.html`, its scripts and all original shared styles are byte-identical to the pre-task snapshot. New styles/scripts are linked only from secondary pages and guarded by `kx-secondary`. Homepage browser regressions pass, and dependency checks confirm it loads none of the new secondary assets.

Before/after homepage screenshots cover light/dark desktop/mobile. Composition and text match. High-resolution JPEG downsampling can differ between browser captures, so raw PNG byte equality is not asserted. Pixel comparison outside image rectangles and their one-pixel raster edges, together with original source hashes and unchanged image references, is retained in `home-protection.json`. Raw screenshots remain available for review.

## Evidence and limitations

All artifacts are under `.local/secondary-reconstruction/`: `delivery/`, `delivery-updated/`, `ledger/`, their `report.json` files, corresponding baseline folders, `workflows/report.json`, `accessibility-verified.json`, `browser-regressions.json`, individual logs and source-preservation evidence. Dashboard tab screenshots are also retained.

Manual rendered review covered the fixture desk, club directory, competition cards, detail hero, narrow booking controls, role overviews, authentication and transaction ledger. Screenshot review supplements automated checks; passing tests alone is not the visual acceptance criterion.

The current field model provides one image per venue. Existing Fields gallery tiles remain explicitly labelled crops; no fictional venue angles or statistics were added. Operational tables/brackets intentionally scroll inside labelled regions when their real data cannot fit a narrow screen. Video/provider availability and real payment processing were not added or changed. Payment simulation remains clearly identified.

This work introduces no backend, database, framework, paid service, storage migration or data reset. Client-side security and concurrency limitations remain those of the existing architecture; presentation changes make no new security guarantees.
