# Bachat implementation decisions

The user authorized implementation on 3 November 2026 and named the GitHub repository Bachat. The six original documents remain the base contract.

## Design plan

Preserve the brief's slate canvas #F8FAFC, white surfaces #FFFFFF, slate text #0F172A/#475569 and teal #0F766E. Use self-hosted Inter, tabular financial figures, a compact teal navigation rail and a larger overview with asymmetric chart widths. Make the financial summary one composed area rather than three unrelated decorative tiles. The dashboard's memorable element is a clear full-month budget strip, paired with a category ring and restrained grouped bars. All charts have tables. Forms prioritize one deliberate action.

The layout remains left-aligned, with a 232px sidebar on desktop, responsive single-column content and mobile bottom navigation. Public pages use a larger original product preview, with synthetic data labeled as such. No invented customers, testimonials, bank connections or paid-service claims.

## Monetization boundary

Build the complete manual-ledger core first. A future paid tier can sell advanced reporting and planning, but pricing, payment provider, entitlements and tax/refund terms require a separate explicit launch decision. Do not render a payment or upgrade action that cannot fulfill its promise. See the monetization strategy delivered with the application.

## Runtime

Node 24 is the deployment target. Local checks may run on the installed supported Node 22.23 runtime; record this in verification. The development API can start a local MongoDB replica set with persistent files. This is a real MongoDB database for local use, not Atlas verification. Production requires an explicitly configured Atlas URI, secrets, sender and privacy contact.
