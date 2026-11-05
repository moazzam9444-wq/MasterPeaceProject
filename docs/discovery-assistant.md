# KICKS discovery assistant

The current assistant is a deterministic, browser-local search helper. It does not call an AI service, require a key, transmit coordinates, or incur inference/API fees. It understands supported Arabic/English keywords for category, Jordanian city, budget, format/player count, ISO date, today/tomorrow/weekday, and an explicit after-time. It is not a general language model. The interface shows extracted filters and always searches the current KicksStore catalogue.

## Future backend seam

KicksDiscovery.setProvider({ async interpret(text) { /* return structured filters */ } }) replaces the local interpreter. Allowed output: { kind: 'fields' | 'games' | 'tournaments', city: string, maxPrice: number, format: '5v5' | '6v6' | '7v7', date: 'YYYY-MM-DD', after: 'HH:mm' }. Unknown fields and invalid values are discarded. Listings, prices and result links are produced by the catalogue engine, never the provider. A future backend should validate filters, enforce authorization, and query its authoritative catalogue and booking availability. Do not expose a service secret in browser JavaScript.

To avoid paid APIs, keep the local interpreter or connect an independently hosted model whose license permits the intended use. A local model does not require a third-party per-request inference payment; hardware, electricity and public hosting are separate costs. No backend or model server is implemented by this change.

## Nearby discovery

The home Near me button opens the discovery dialog and requests device location only after the user clicks. Geolocation requires permission and a secure context (HTTPS or trusted localhost). Denial, timeout and unavailable location have visible city-search fallbacks. Coordinates stay in page memory and can be cleared.

Field owners/admins choose the city and enter the area; no manual coordinates are required. The bundled Jordan populated-place gazetteer resolves area names offline, scoped to the selected governorate. Duplicate records at identical coordinates are collapsed. Unrecognized or ambiguous area names fall back to the city center with an explicit City estimate label. Unknown cities remain unranked. Old precise coordinates remain usable until the listing city/area changes.

Nearby searches default to a 15 km straight-line radius and sort closest first. The interface identifies approximate area/city distances with a ~ prefix and precision label; this is not an exact pitch location or driving distance. All listings from the same unresolved city can share the same estimate. The owner's current device location is not used as the pitch location. Games and tournaments inherit their field location and must be future events with capacity remaining.

### Place data attribution

Jordan populated places: GeoNames, downloaded 2026-11-02 from https://download.geonames.org/export/dump/JO.zip. Licensed under Creative Commons Attribution 4.0: https://creativecommons.org/licenses/by/4.0/. The derivative bundled js/jordan-places.js selects populated place records and retains names, alternate names, geographic coordinates, governorate code, feature code and population. Data is provided as-is; completeness and accuracy are not guaranteed. See https://download.geonames.org/export/dump/readme.txt. No runtime location-lookup network service is used.

## Checks

node tests/discovery-regression.cjs
node tests/accounts-regression.cjs
node tests/messages-regression.cjs

node tests/place-resolver-regression.cjs

## Compact chat and inline nearby controls

The floating KICKS Assistant launcher opens a small nonmodal conversation panel. Requests and replies remain in page memory, and recognized filters carry over between follow-up messages. The helper returns up to three catalogue links per reply; it is still a local rule-based helper, not an AI model. No filters, nearby tabs or full-page results are shown in the chat.

Near me is a separate inline control next to search on each of the fields, open games and tournaments listing pages. It requests location on click and filters/reorders the existing cards within 15 km, including the existing counts and field pagination. Other search filters remain in effect. Show all or a catalogue reset clears nearby mode. The sort selector is disabled while distance ordering is active.

node tests/nearby-catalogue-regression.cjs
