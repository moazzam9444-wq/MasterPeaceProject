# KICKS structural redesign — Phase 1–2 review

Scope: shared design foundation and Fields discovery/details only. Phase 3 onward—including Open Games, Teams, Tournaments and all dashboards—has not been started. Stop here for visual approval.

## Review artifacts

- [Interactive before/after gallery](../.local/kicks-structural-phase12/review.html): four page regions, five widths, two themes.
- [Component reference](../.local/kicks-structural-phase12/components.html).
- Archived original files: `.local/kicks-structural-phase12/before.zip`; original hashes: `baseline.json` in the same directory.
- Final screenshots: `baseline-final/` and `phase2-final/`, 40 images each. Ten additional system screenshots cover all viewport/theme combinations.
- Screenshots and workflows use the existing fictional demo fixture in disposable browser contexts. They do not reset the user's browser storage.

## Structural implementation

Phase 1 introduces an opt-in foundation: light/dark color tokens, local Barlow Condensed and Manrope fonts, typography, spacing, surfaces, buttons, form controls, badges, dialogs, tables, feedback, empty states and keyboard focus. Motion respects reduced-motion preferences. It is adopted only by the two Fields pages at this review gate.

Phase 2 replaces the Fields page composition with a cinematic split hero, overlapping search command bar, horizontal filter deck, full-width featured venue spread and smaller horizontal venue cards. Mobile uses an expandable filter deck and image-led stacked cards. Actual IDs, prices, names, locations, recorded amenities and availability flags remain data-driven. Unknown availability says “Check availability”; missing ratings are omitted.

Field Details now has an image-led venue identity, photo crop gallery, grouped facts and amenities, location information, and a separate reservation column. Booking comes before the long descriptive content in mobile source order. The desktop reservation sticks only when it fits the viewport. A mobile price summary links to the existing form. It does not submit a booking. Existing payment/confirmation dialogs and the local-payment simulation warning remain intact.

The existing contextual assistant is docked into page tools rather than floating over actions. Photo dialogs restore focus to their opener. The presentation adapter reads existing data, mirrors original displayed prices and images, and never persists records or computes booking charges.

## Presentation dependencies and preservation

Original element IDs and functional selectors remain, including `#mainNavbar`, `#searchForm`, `#fieldSearch`, `#filterForm`, `#filterToggle`, `#sortFields`, `#fieldGrid`, `#pagination`, `#fieldContent`, `#fieldPhoto`, `#enlargePhoto`, `#bookingForm`, `#bookingDate`, `#timeSlots`, `#selectedTime`, `#bookingTotal` and `#bookButton`. Original form names/options, dialog hooks and booking handlers are retained.

On these two pages only, obsolete Fields/editorial presentation stylesheet links were removed: `fields.css`, `field-details.css` where applicable, `creative.css`, `site-polish.css`, `floodlights-system.css`, `floodlights-editorial.css` and `theme.css`. Their files remain untouched for other pages. Shared navigation, footer, account, discovery and dialog dependencies remain. New layout ownership is explicit rather than another layer over the old layouts.

Hash comparison against the pre-task archive confirms that original store, authentication, booking, payment, team, transaction and other application JavaScript files are unchanged. All original CSS files and unrelated pages are unchanged. `js/fields.js` changes are restricted to its card presentation, availability wording and respecting reduced motion during scrolling; code outside those sections matches the archive after line-ending normalization. KICKS-012, KICKS-004, KICKS-007 and KICKS-008 are preserved.

## Changed files

Existing application files modified:

- `Pages/Fields/fields.html`
- `Pages/Fields/field-details.html`
- `js/fields.js`

New application files:

- `css/kicks-system.css`
- `css/kicks-fields.css`
- `js/venue-presentation.js`

New tests: `tests/structural-fields-visual.cjs` and `tests/structural-fields-workflows.cjs`. This document and local QA artifacts are also new.

## Verification evidence

- Visual matrix: 1440, 1024, 768, 390 and 320px; both themes; discovery hero/results and venue hero/booking. No detected horizontal document overflow, broken visible images or page exceptions. Visible images are decoded before capture. Rendered desktop, tablet and narrow-mobile screenshots were also manually reviewed.
- Seven focused workflow checks pass: data-backed discovery/filtering/sorting/pagination/empty states; record-preserving browsing; mobile filters/native validation/assistant; photo dialog/focus/mobile booking source order; original booking/payment cancellation and confirmation; sticky sizing/theme persistence/missing venue; reduced motion and honest image fallback.
- Booking confirmation creates exactly one linked booking and simulated payment through the original async flow. Cancelling creates neither. These tests use isolated storage.
- Eight axe scans: both pages, desktop/mobile, light/dark; zero reported violations. This is automated coverage, not a claim of exhaustive accessibility certification.
- Existing browser suites pass: `browser-regression`, `features-browser-regression`, `home-floodlights-browser`, and `field-event-conflicts-browser`. The conflict suite initially encountered `net::ERR_ABORTED` during navigation; its isolated rerun passed all six scheduling checks. Both logs are retained. Tests use an in-memory origin substitution to the local QA server; assertions and application logic are unchanged.
- Syntax checks pass for the modified/new application JavaScript.
- Evidence: `.local/kicks-structural-phase12/workflows.json`, `preservation.json`, capture `report.json` files and browser logs. The archived baseline server serves original snapshot markup read-only for comparison; it is a test fixture, not an application backend.

## Limitations and next review

Each field currently supplies one photo. Extra gallery tiles explicitly show crops of that same image; missing-image fallbacks are labelled illustrative. Authentic additional angles require actual supplied media and appropriate data support. No fake statistics, amenities, extra venue photography or analytics were introduced.

This work does not change business rules or provide additional server-side security. No backend, database, framework, paid dependency, destructive migration or localStorage reset was introduced. Browser regressions support functional preservation, but cannot prove every possible workflow.

Review the gallery before approving Phase 3. The rest of the website deliberately retains its existing presentation until its phase is approved.
