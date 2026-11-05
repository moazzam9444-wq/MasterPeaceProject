# Challenge venue selection and split checkout

New challenges select an available venue, city, hourly kickoff and quoted total before posting. Requests display those terms. Availability and the price are rechecked when requesting/accepting; a proposal does not occupy a pitch. An outdated proposal must be cancelled and reposted, so a rival never silently accepts changed terms.

Acceptance creates one Pending booking with the two agreed captain IDs and two immutable shares. Its hold expires 15 minutes after acceptance or at kickoff, whichever is earlier. Both captains can independently simulate their own payment through the existing checkout. Checkout cancellation writes nothing. A duplicate/outsider/wrong-amount payment is rejected. The second successful share confirms the same booking, never creates another one.

Amounts use integer cents: an odd cent belongs to the posting team. The agreed total, owner and commission rate are frozen at acceptance. Two Held (demo) receipts become Paid (demo) only after both shares complete, so pending money is excluded from realized revenue. The sum of receipts/commissions equals the booking total/commission. Free pitches confirm without fake receipts. No real card data or money is involved.

Either agreed captain can cancel a Pending hold, releasing its slot and refunding held receipts. Confirmed matches retain the existing organiser/admin cancellation policy; cancellation refunds both receipts. Generic booking edits cannot bypass split checkout or change frozen terms/shares.

Expired holds are projected as Cancelled/refunded on reads, and the challenge as Expired, regardless of an open tab. The next successful coordinated write persists those projected states. Availability immediately ignores expired holds. No stored records are deleted. Legacy challenges retain their original full-payment booking path; new challenges always require a venue and half-each payment. Existing demo/user records were not reset or migrated into new agreements.

Verification: challenge-split-regression.cjs covers exact/odd halves, identity, stale and frozen quotes, competing bookings, storage rollback, duplicate payment races, free pitches, ledger accounting, cancellation and expiry. challenge-split-browser.cjs uses isolated storage and real login/form/checkout flows, including rival approval, cancelled checkout, two payments, owner/captain history and desktop/mobile layout. Existing regression scripts are also run.

This remains the existing browser-local frontend prototype. It does not supply cross-device accounts or real payments. The separately documented cross-renderer localStorage lost-write issue (KICKS-008) is not claimed fixed by this feature; use one tab for sequential role testing. A real deployment needs server-side payment confirmation and database transactions.
