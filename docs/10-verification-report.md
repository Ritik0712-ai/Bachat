# Bachat verification report

Date: 3 November 2026. Scope: implemented core website and local integration environment. This report does not certify production launch, live email, backup operations, accessibility compliance or commercial readiness.

## Automated evidence

| Check | Result | Boundary |
|---|---|---|
| TypeScript client/server/scripts | Passed | Strict compilation on local Node 24.17.0 |
| Production build | Passed | Compiled client, API and operational scripts |
| Domain tests | 30 passed | Exact paise parsing, rejected formats, calendar validity, bounded ranges and integer budget thresholds |
| API integration tests | 21 passed | Real isolated MongoDB replica set; account lifecycle, ownership, versions, receipts, budgets, large history, deletion races and rollback |
| Client HTTP boundary tests | 3 passed | HTML gateway failures, malformed successful responses and preservation of the same submission key on explicit retry |
| GitHub Actions | Green on verified source checkpoints | Node 24 workflow runs install, typecheck, tests, build and production dependency audit; inspect latest workflow for current HEAD |
| Production dependency audit | 0 reported vulnerabilities | npm audit --omit=dev --audit-level=high at verification time; not a permanent security guarantee |
| Local migration | Passed | Named indexes and MongoDB validators applied to the local database |
| Render Blueprint structure | Passed | Current public Render JSON schema; Render CLI/platform validation and deployment not performed |

The complete automated suite has **54 tests**. The large-history case inserts 10,000 actual records across six months, checks exact income/expense/net totals under 20 simultaneous dashboard requests, and deletes the owned history with a recovery tombstone. Local verification bursts measured approximately **120 ms p95** (see `.data/load-burst.json` for the latest local measurement). This short in-process/local-database integration burst does not satisfy or replace the PRD's five-minute production load, network, cold-start or availability checks.

The cap-race test separately manipulates the owner count to the 9,999 boundary to exercise atomic admission; it is not presented as a second independently populated 10,000-row history. Injected purge failure verifies rollback of deleted rows and the control tombstone. Password reset/change and consumed-token rejection are API-tested. No actual user financial data is used.

## Browser and visual evidence

Reviewed the compiled React client through the in-app browser with a synthetic local account and six months of sample transactions. Screenshots in `docs/screenshots/` contain only synthetic records.

- Welcome/sign-in layouts and successful synthetic account sign-in.
- Dashboard in current-month and six-month windows; category ring, monthly bars and exact HTML table alternatives.
- Expense creation through the UI (INR 17.35), immediate persisted totals/budget update, subsequent edit to INR 18.35, and detail confirmation.
- Unsaved-change dialog prevents cancellation; Keep editing retains input and allows an explicit save.
- Desktop transaction history and labeled edit/delete entry points.
- Monthly budget edit from INR 35,000 to INR 30,000; resulting Near limit state, INR 26,718.85 spent and INR 3,281.15 remaining.
- Mobile filter dialog; income-only selection gives zero filtered expenses/no-expense chart while the budget retains full-month spending.
- Native date-input regression reproduced and corrected: visible From date now reaches the Apply action; the URL and totals confirm June-November selection.
- Desktop 1440x900 and mobile 390x844 viewport checks; no page-level horizontal overflow in inspected views.
- Settings has one main landmark, a working skip-link target and no unlabeled visible input/select/textarea controls in the inspected DOM.

During iterative rebuilds, an already-open client referenced an old deleted dynamic chunk; the error boundary's reload recovered the latest build. Development hot-reload noise was separated from the subsequent compiled-client checks. A real deployment must preserve assets or retain a clear reload recovery path for clients open during a release.

Keyboard controls, semantic labels, native dialog focus handling, chart tables, reduced-motion CSS and responsive layouts are implemented. Full screen-reader review, Safari/Android device testing, 200% zoom/reflow acceptance, comprehensive WCAG audit, frontend lab performance and every screen/error-state combination have not been completed. Do not describe the product as accessibility-certified or fully production-accepted.

## Hosting and commercial boundary

The app is running locally with persistent MongoDB files and captured development email. Render access and the intended workspace were verified; no public Bachat service was created. Subsequent Atlas setup resolved the organization AI-access restriction and provisioned the dedicated Bachat project/free bachat cluster in AWS Singapore. The current development IP is allowlisted. No database user exists yet, and no Atlas migration or application request has been verified. See [Atlas setup status](11-atlas-setup.md).

Also outstanding: real Resend API key/verified sender and inbox-delivery checks, operator privacy contact, production secrets/network rules, scheduled maintenance/monitoring, provider-backed backups, a timed restore drill and live release smoke. The restore-scrub utility exists but no provider restore has been certified. Deployment target is Node 24.22.2, selected from the official supported Node 24 release index; local verification used 24.17.0 and CI follows Node 24.

Monetization is a documented proposal. No real subscription checkout, billing webhooks, entitlement enforcement, merchant/tax/refund configuration or revenue is claimed. No paid infrastructure was purchased.

## Source control

Changes are committed frequently and pushed to `Ritik0712-ai/Bachat` on main. Author/committer identity is Ritik Agarwal <ritikagarwal2468@gmail.com>. No Co-Authored-By trailers are used. The original six planning documents remain preserved; implementation decisions, runbooks and this report are separate additions.
