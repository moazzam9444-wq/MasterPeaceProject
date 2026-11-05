# Under the Floodlights design transfer

The existing design was found locally in `index.html`, `css/home-floodlights.css`, `js/home-floodlights.js`, and `assets/floodlights/`. Its original implementation record is `docs/home-floodlights-verification.md`. The homepage already connects to the original KicksStore, account functions, and detail routes, so it was preserved unchanged.

`css/floodlights-system.css` extends the local fonts, navy/lime/paper palette, navigation, buttons, cards, footer, authentication, and dashboard presentation to all 18 HTML pages under Pages. Page layouts, DOM identifiers, forms, scripts, event handlers, records, and business logic are retained. No files were deleted, no catalogue was seeded, and no generation service was used.

Before editing, existing HTML, CSS, and JavaScript were saved in `.local/floodlights-transfer/before.zip` with SHA-256 hashes in `baseline.json`. Comparison confirms that every pre-existing JavaScript and CSS file and the homepage remain byte-for-byte unchanged. Existing HTML edits only add the shared stylesheet link.

Validation: store, account, payment, catalogue, homepage browser, and public/auth layout suites pass. The homepage suite covers live-store rendering/search, booking conflicts, account/detail navigation, mobile controls, accessibility, animation fallbacks, reduced motion, and widths 320–1920px. Layout checks cover 24 public/auth layouts, mobile navigation, ownership upload, and dark registration. Browser fixtures use isolated storage, not the user's browser profile.
