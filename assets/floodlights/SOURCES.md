# Under the Floodlights — local dependencies

No paid service or runtime CDN is required by this landing page. These browser builds are pinned and served locally.

| Asset | Version / source | Terms |
| --- | --- | --- |
| GSAP core, ScrollTrigger, SplitText | 3.13.0, `https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/` | GSAP Standard License: https://gsap.com/standard-license/ . Original license headers are retained in each browser build. |
| Lenis | 1.3.27, `https://cdn.jsdelivr.net/npm/lenis@1.3.27/dist/lenis.min.js` | MIT; notice in `vendor/LENIS-LICENSE.txt`. |
| Barlow Condensed 800 | Google Fonts, Barlow Condensed v13 | SIL Open Font License; notice in `fonts/BARLOW-OFL.txt`. |
| Manrope 400 and 700 | Google Fonts, Manrope v23 | SIL Open Font License; notice in `fonts/MANROPE-OFL.txt`. |

The landing page reuses the project's existing local photographs/illustrations. No new image generation was commissioned. Promotional scenes are fictional and are not represented as photographs of bookable venues:

- `../images/matchday-pitch.webp`, `matchday-team.webp`, `matchday-kickoff.webp`: see `../images/matchday-scenes-source.txt`.
- `../images/kicks-matchday-ai.webp`: see `../images/kicks-matchday-source.txt`.
- Actual field cards use the existing `KicksAuth.fieldImage()` adapter, with the existing optimized `field1-home.webp` through `field4-home.webp` when applicable. Uploaded field images remain unchanged.

No sample fields, matches, teams, or tournaments are inserted into the user's catalogue. Browser verification uses disposable, isolated test records.
