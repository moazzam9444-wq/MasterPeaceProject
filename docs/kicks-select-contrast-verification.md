# Native select contrast correction

## Cause and correction
The Hero's transparent search controls inherit pale text from the permanently dark stadium composition. js/theme.js correctly sets the root color-scheme to the chosen theme, but this also gave the native option popup a light background in light mode. Options inherited pale foreground text without their own background, producing the confirmed unreadable expanded menu.

The Hero now explicitly declares its own dark native color scheme. The shared premium shell supplies paired native option/optgroup colors via inherited theme tokens: light surface/dark text in light sections, navy/light text in dark sections. Local Hero tokens keep its popup dark in both themes. Dashboard editor fields deliberately retain their existing white surfaces; scoped tokens keep their menus and date/time pickers light with dark text even inside a dark workspace. Disabled options receive a contrasting muted color. Selected options use system Highlight/HighlightText; native hover/focus behavior remains under OS control. Forced-color mode uses Canvas/CanvasText/GrayText. No custom select, new dependency, DOM replacement or application event change was needed.

The Hero date input is explicitly dark as well. Its calendar indicator no longer inverts the already dark-scheme native icon, preventing a dark-on-dark icon. Other date inputs retain their existing theme styles and behavior.

## Files
- assets/opendesign-football/css/styles.css ? existing Hero control rules corrected in place.
- css/premium-shell.css ? shared native option palette and accessibility states.
- tests/select-contrast-browser.cjs ? expanded-menu, keyboard and filtering regression.
- docs/kicks-select-contrast-verification.md ? this record.

Backups: .local/select-contrast/styles.before.css and premium-shell.before.css. No HTML, application JavaScript, KicksStore, booking/filtering, schema, API, data or submission code was changed.

## Executed verification
- Edge and Chrome on Windows, actual native expanded menus. The test asserts select:open, moves the pointer away from the popup and captures screenshots, so ordinary option readability is verified without hover.
- Both Location and Kickoff Time: 1440px and 375px widths, both light/dark themes in both browsers: 16 expanded-menu captures.
- All location entries and all 10:00?22:00 entries visible/readable in the reviewed screenshots. Keyboard Home/ArrowDown/End selection works. Actual Amman/date/22:00 search returns the matching existing fixture records; Clear search restores filters.
- Website-wide Edge audit used ordinary fixture logins for Player/Owner/Admin: all 19 routes at two widths and both themes, plus 26 dashboard tabs and available create/manage forms. 224 select-control samples, 1,142 unselected option samples; lowest calculated foreground/background contrast 6.14:1. Four disabled control samples included. No JavaScript page errors. Native open management-menu screenshots retained.
- Registration uses role radio controls rather than a native select; no functionality was replaced.
- Firefox Playwright and WebKit binaries are unavailable in this environment. Firefox/Safari and physical iOS/Android picker behavior remain unverified. The implementation uses native color-scheme plus explicit option pairs rather than relying solely on browser-specific styling. OS hover/selected colors may differ by platform; no claim of pixel-identical menus is made.
- Existing homepage regression suite was run separately; see .local/select-contrast/home-regression/report.json for results.

## Evidence
.local/select-contrast/open-menus.json, site-audit.json and screenshots:
- before-location-open.png (pre-fix styles replayed from backup)
- msedge-1440-light-homeLocation-open.png
- chrome-1440-dark-homeTime-open.png
- msedge-375-light-homeTime-open.png
- owner/admin management-form-open captures

Native-option styling varies by OS/browser; preserved native semantics are deliberate. References: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/option and https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme .
