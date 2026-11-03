# Bachat monetization strategy

This is a commercial proposal, not an activated paid service. No subscription payments, paid entitlements or upgrade buttons are present in the current release. The core product must first prove repeat use and financial correctness.

## Positioning

An approachable, private manual finance companion for Indian students and early-career professionals. The distinct value is a clear monthly picture with minimal setup. Avoid selling bank synchronization, AI advice or verified balances that the product does not provide.

## Proposed business model

Keep the existing manual ledger, basic charts, correction, monthly limit and account privacy controls free during the pilot. Test a future Bachat Plus tier around deeper historical reports, saved review views, configurable planning and downloadable summaries. Each paid capability needs a new product/API/schema contract before implementation; the original V1 exclusions still describe the current release.

Pricing hypothesis to test: INR 129/month or INR 999/year, inclusive/exclusive tax presentation to be resolved before sale. These are original experiment values, not competitor benchmarks or validated willingness to pay. Do not advertise these prices as purchasable until fulfillment, checkout, cancellation and refund handling exist.

## Validation sequence

1. Run the complete product with a small authorized pilot and observe the PRD activation, retention, entry speed and budget usage targets.
2. Interview users who return weekly about what decision the app helps them make and which report or planning task they still do outside it.
3. Show a concrete prototype of the strongest missing paid capability, with a stated proposed price. Collect explicit interest; do not treat a casual compliment as purchase intent.
4. Implement one paid feature only after evidence supports it. Keep user access to existing records, corrections, security and deletion independent of payment state.
5. Add a payment provider in test mode first, with a separate billing collection, server-owned entitlements, signed webhook validation, idempotency, event replay, renewal failure, cancellation and refund tests. Never unlock features based solely on a browser checkout success callback.
6. Activate real payments after pricing, merchant identity, billing contact, tax display, terms, cancellation/refund policy and live-provider checks are configured. A connected extension does not itself establish a merchant account.

## Economics and ethical limits

Measure paid conversion among weekly active users, retained paid accounts after two billing cycles, support effort per subscriber, infrastructure/email cost and refund rate. Estimate gross margin from actual costs before buying acquisition. Never sell transaction data, target advertisements from spending categories, create fake urgency or promise investment outcomes. Prefer predictable subscription value over engagement mechanics that encourage more financial activity.

The current repository is a foundation for this business, not proof of revenue, a live payment integration or product-market fit.
