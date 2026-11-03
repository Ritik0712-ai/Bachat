# Personal Finance Tracker - Step-by-Step Implementation Plan

Version: 1.0 | Prepared: 3 November 2026 | Status: delivery plan, implementation not started by this pack

Read [PRD](01-product-requirements.md), [technical requirements](02-technical-requirements.md), [flows](03-app-flows.md), [UI brief](04-ui-ux-design-brief.md) and [schema](05-backend-schema.md) before writing application code. These documents define the V1 contract. The supplied PDF's two-week learning schedule is reference material; this plan includes security, recovery and verification work needed for a usable release.

## 1. Delivery strategy and estimate

Build one coherent vertical slice early: verified login -> add expense -> persisted history -> exact dashboard update. Then complete correction, budget and account-management flows before widening integration or polish. Phases are engineering checkpoints, not requests for repeated product approval.

Estimate: **18-25 focused engineering days for one experienced full-stack engineer**, followed by a seven-day pilot observation window. This is a planning estimate, not a delivery promise. Domain/email verification, provider access, procurement or unresolved launch configuration can add elapsed time. A two-week educational demo can be smaller, but must not be described as the fully verified product specified here.

Proposed role coverage: product owner resolves scope defaults; full-stack engineer implements; a reviewer checks security and financial correctness; pilot participants exercise usability. A solo builder may cover multiple roles but must retain the independent acceptance evidence. No assumption that a staffed team exists.

| Phase | Effort | Dependency | Completion evidence |
|---|---|---|---|
| 1 Setup and contract baseline | 2 days | This pack | Working local client/API/replica-set DB and CI skeleton |
| 2 Authentication | 3-4 days | 1 | Verified login/recovery/revocation journeys |
| 3 Database and domain APIs | 2-3 days | 1, auth owner model from 2 | Validated schema/indexes, transaction/budget API tests |
| 4 Core UI and navigation | 2-3 days | 1, DTOs from 2-3 | Responsive shell and state-complete forms |
| 5 Main features | 3-4 days | 2-4 | History, filters, charts, budgets, settings/deletion |
| 6 Integrations and operations | 1-2 days | 2-5 | Staging email/proxy/monitoring/backup setup |
| 7 Testing and acceptance | 3-4 days | 5-6 | Correctness, isolation, browser/accessibility/load/restore evidence |
| 8 Deployment | 1-2 days | 7 | Production smoke, rollback/restore runbooks |
| 9 Final polish and handoff | 1 day | 8 | Reviewed screenshot set, README and release record |

## 2. Phase 1 - Setup and contract baseline

1. Inspect existing repository/worktree and applicable AGENTS.md before altering files. Preserve existing user work. This folder currently contains a source brief and planning outputs; do not infer an existing deployed service from those files.
2. Record product defaults: responsive English web, INR, Asia/Kolkata, manual ledger, fixed categories, monthly total budget and one end-user permission class. If product owner changes these, update all affected docs before coding. No provider purchase is implied by the planning request.
3. Create client/server/shared TypeScript workspace; React/Vite/Tailwind, Express, validation, lint/format/typecheck and locked dependencies. Pin supported Node 24 patch and package versions in toolchain files.
4. Start local Mongo replica set; configure separate local/staging/prod DB names. Verify multi-document and cross-database transaction behavior. Add startup configuration validation and a redacted `.env.example`; ignore actual secret files.
5. Implement exact minor-unit parse/format functions, canonical date/month validation and shared error types before UI forms. Define OpenAPI 3.1 document using the TRD endpoint inventory; validate request/response fixtures against it.
6. Set up CI install/lint/typecheck/unit/build jobs; add API test DB and browser harness. Create deterministic fixture script with two owners and separate categories.

Deliverables: workspace boots, health endpoints respond, clean build, exact-money/date unit cases, OpenAPI baseline, CI green, environment setup README. Gate: no production secrets in client bundle/repository and transaction-capable DB verified.

Git commits, when implementation is authorized, must use `Ritik Agarwal <ritikagarwal2468@gmail.com>` and Ritik's own gh credentials. Check repository user.email before first commit; never add a Co-Authored-By trailer. Group implementation commits by working feature/checkpoint. This document-generation task does not initialize, commit or push a repository.

## 3. Phase 2 - Authentication

1. Implement users, sessions, account_tokens and rate_limits validators/indexes plus category seeding needed for registration. Add Mailer interface and local captured-email adapter; local captures are not proof of live delivery.
2. Implement signed double-submit CSRF, exact Origin checks, password hashing and generic register/recovery responses. Keep raw tokens/passwords out of logs and browser storage.
3. Build registration, check-email, explicit verification action, login, recovery and reset routes/screens S02-S07. Ensure fragment-token removal, single use and expiry.
4. Add JWT cookie + server session validation; idle/absolute expiry; current/all-session revocation and password change. Bootstrap guarded routes without private-content flash.
5. Add generic errors, throttling/cooldowns and safe returnTo validation. Verify login with wrong email/password gives equivalent response shape and no accidental account enumeration.
6. Implement S23 expiry and same-tab draft policy; clear prior-user cache before another account enters. Implement public S01/S20/S21 initial content with launch privacy configuration clearly pending verification in release records.

Deliverables: complete auth slice, session middleware, public/auth screens, integration tests for expiry/replay/reset/revocation and cross-user bootstrap behavior. Gate: no sensitive auth values in localStorage, URLs after capture or telemetry; verified account required for financial APIs.

## 4. Phase 3 - Database and domain API

1. Complete all nine collections across the two databases from the schema document; create named indexes using versioned scripts. Validate Long adapters and JSON safe-integer conversions end to end.
2. Implement owner-scoped repositories, immutable category read endpoint and strict transaction input/date/type validation.
3. Implement create/list/detail/edit/delete transactions, fixed pagination/sort and inclusive filters. Maintain transactionCount under owner lock and enforce the 10,000 cap.
4. Implement financial mutation receipt protocol for retry safety and version conflicts. Test duplicate-key races; do not deduplicate legitimate equal-value entries by similarity.
5. Implement dashboard snapshot aggregation: period income/expense/net, expense categories, zero-filled monthly bins, recent five, separately scoped full-month budget evaluation.
6. Implement budget evaluation/set/update/remove with unique owner/month, nullable unset state and version 0 creation.
7. Implement account purge and deletion tombstone transaction; maintenance scripts for unverified expiry, count reconciliation and orphan reporting. No operator financial browsing route.

Deliverables: full schema/index scripts, tested OpenAPI contracts, CRUD/aggregation/budget/purge services and deterministic fixtures. Gate: financial calculations exact, foreign-resource tests pass and failure injection leaves no partial write/purge.

## 5. Phase 4 - Core UI and navigation

1. Implement design tokens, typography, buttons, fields, dialogs, toasts, skeletons, error summary, tables/cards and app shell from UI brief.
2. Implement route inventory S01-S24, desktop sidebar/mobile bottom navigation, direct-route refresh and accessible page focus.
3. Implement reusable type/amount/category/date/note form with input retention, pending states and unsaved-change guard. Implement edit-version/conflict presentation.
4. Implement filter bar/mobile sheet with draft/apply/reset rules, normalized query parameters, pagination and safe return paths.
5. Wire TanStack Query keys/invalidation and Fetch error/CSRF handling. Keep financial mutations server-confirmed. Separate save failure from post-save refetch failure.
6. Implement transaction detail and delete confirmation, budget editor/remove dialog, settings/password/account-deletion forms and global error/expiry variants.

Deliverables: interactive state-complete core UI against API/staging fixtures, mobile and desktop screenshots, keyboard focus checks. Gate: no dead buttons, fake data in authenticated views, inaccessible close controls or unsupported features in navigation.

## 6. Phase 5 - Main features

1. Finish history, 25-row paging and all filter combinations. Ensure totals aggregate the entire filter result rather than current page. Keep context when returning from detail/edit/delete.
2. Build summary cards with recorded-data labels. Recharts donut and grouped bars must use server-returned amounts, zero-month bins and partial-month labels. Add equivalent HTML data tables and keyboard actions.
3. Build monthly budget states: unset/within/near/reached/over, true exceeded text and visually capped progress. Confirm income/category/date dashboard filters never narrow full-month budget spend.
4. Complete empty ledger, no filter matches, income-only/no-expense chart, no-budget and no-spending states; prohibit fabricated placeholder charts.
5. Test old/new month invalidation on edits, last-page deletion, saved-outside-filter messaging, same-origin tab notifications and focus refetch fallback.
6. Complete profile, password/session management, hard account deletion, help formulas and privacy flow. Implement offline banner and ambiguous mutation reconciliation.

Deliverables: all FR-01 through FR-11 working, S01-S24 implemented, vertical end-to-end demo using persisted data. Gate: a user can independently register, record, correct, analyze, budget, recover and delete without administrative intervention.

## 7. Phase 6 - Integrations and operational readiness

1. Configure staging Vercel/Render/Atlas with separate secrets/data and explicit same-origin proxy. Verify API rewrites precede SPA fallback and all private/auth responses bypass caching.
2. Configure transactional email provider, verified sender domain and link origin. Test verification and reset delivery to a real controlled mailbox; verify no raw token/financial data leaks in provider/log metadata. Provider API acceptance alone is not inbox delivery evidence.
3. Add redacted operational logs, readiness monitoring, error/latency alerts and optional allowlisted product events. Keep analytics disabled if deletion/retention cannot be enforced.
4. Configure daily encrypted app backups, seven-day retention and 30-day deletion-control retention. Prepare isolated restore target and prevent old control DB overwrite. Do not rely on undocumented free-tier guarantees.
5. Add daily unverified-expiry/consistency maintenance command to deployment scheduling; alert on script failures. No monthly reports or recurring financial job is introduced.
6. Set CSP/security headers, production cookie attributes, request/time/connection limits and least-privilege DB/provider credentials. Verify staging Origin allowlists cannot authorize production traffic.

Deliverables: live staging deployment, real-email evidence, secret/configuration inventory without secret values, monitoring rules, backup settings and draft runbooks. Gate: provider availability, region, pricing and backup capabilities documented as actually configured.

## 8. Phase 7 - Testing and acceptance

### 8.1 Golden financial fixture

Use synthetic test accounts only. Freeze server time at 3 November 2026 in Asia/Kolkata. Owner A records:

| Date | Type/category | Amount INR | amountMinor |
|---|---|---|---|
| 2026-11-01 | Income / Salary | 50,000.00 | 5,000,000 |
| 2026-11-02 | Expense / Groceries | 1,250.50 | 125,050 |
| 2026-11-03 | Expense / Food & dining | 250.00 | 25,000 |
| 2026-10-31 | Expense / Transport | 99.99 | 9,999 |

November totals: income 5,000,000; expense 150,050; net 4,849,950 minor units. Set November budget 1,000,000 minor units: remaining 849,950; status within; displayed usage 15.0%. Food filter returns expense 25,000 and income 0, while November budget still shows spent 150,050. October-November combined expense is 160,049.

Change food amount to INR 200: November expense 145,050, net 4,854,950. Move that food record to October: November expense 125,050; October expense 29,999. Delete groceries: November expense 0. Keep independent immutable baseline fixtures so tests do not depend on execution order. Owner B adds its own large values that must never affect A.

Additional isolated budget cases with INR 10,000 limit: expense INR 7,999.99 -> within; 8,000 -> near; 9,999.99 -> near; 10,000 -> reached; 10,000.01 -> over by 0.01. Income never changes spent. Missing budget returns null remaining/percent.

### 8.2 Test suites and evidence

| Suite | Required coverage | Evidence |
|---|---|---|
| Domain unit | Strict decimal parsing, amount limits, leap dates, local midnight, periods, integer budget thresholds | Machine-readable results |
| API integration | Schema/indexes, all endpoints, owner isolation, snapshot aggregates, strict queries, cap, delete races | Supertest + real replica-set run |
| Auth/security | Cookie flags, JWT/session expiry/revocation, origin/CSRF, token replay/TTL lag, rate limits, body injection | Automated cases plus header inspection |
| Client component | Form errors/retention, filter drafts, stale conflict review, dialog focus, no-budget/empty chart | Focused UI results |
| Browser | Six end-to-end paths from flow doc, direct links/back/forward, multi-tab, lost response/retry, account switch | Playwright traces/screenshots |
| Accessibility | Automated scan plus keyboard and screen-reader checks on core flows | Findings and resolution record |
| Responsive/browser | 1440x900 and 390x844; Chrome/Firefox desktop, iOS Safari/Android Chrome spot checks | Reviewed screenshot set and device/browser versions |
| Performance | 10k-row owner, 20 virtual users, five-minute warm run; frontend agreed lab profile | Latency/LCP/CLS report, cold-start note |
| Recovery | Backup restore to isolated target, current tombstones replay, session/token invalidation, failure injection | Timed restore drill with RPO/RTO |

Tests should verify meaningful behavior and financial/security boundaries; do not write brittle assertions mirroring private implementation functions or every CSS class. Release gate is zero open data-leak, data-loss, auth bypass, arithmetic, broken core-flow or serious accessibility defects. Lower-priority cosmetic findings need an explicit tracked decision.

### 8.3 Requirement traceability

| Requirement | Screens | Backend | Required acceptance |
|---|---|---|---|
| FR-01/02 secure accounts | S02-S07, S18, S23 | users/sessions/account_tokens/rate_limits | Verification, reset, expiry, revocation, CSRF |
| FR-03/04 transactions | S10-S13 | transactions/categories/receipts | Exact write, duplicate retry, edit conflict, confirmed delete |
| FR-05 history | S09/S11 | owner indexes and filter API | 25-row paging, stable sort, 366-day bound, isolation |
| FR-06 analysis | S08 | dashboard snapshot pipeline | Golden totals, zero months, partial bins, table equivalent |
| FR-07 budgets | S14-S16 | budgets + all-month expense aggregation | Unset/80%/100%/over and filter independence |
| FR-08 consistency | S08-S16 | receipt/version/owner lock | Old/new month edits, cross-tab, lost response |
| FR-09 usability | All | Client semantics | Mobile, keyboard, accessible feedback |
| FR-10 account control | S17-S19 | profile/password/purge/control DB | Atomic cascade, restore suppression, clean logout |
| FR-11 explanation | S20/S21 | Static content/configuration | Accurate formulas/provider/retention wording |
| FR-12 measurement | S08 and success events | Allowlisted event adapter | No financial/identity fields, retention/deletion |

Deliverables: acceptance report, passing CI, reviewed screenshots, performance report and successful restore drill. Gate: local/emulator success is labeled local; live provider and production checks require distinct evidence.

## 9. Phase 8 - Deployment

1. Prepare release tag/commit, validated environment inventory, compatible schema migration and rollback target. Confirm production email origin/domain and operator privacy contact/retention match deployed configuration.
2. Apply additive index/validator migrations to production; verify readiness without exposing customer data. Deploy API then client with version-compatible contracts and first-party API proxy.
3. Run synthetic production smoke: signup/verification, login, one income/expense, exact overview, budget, edit/delete, password recovery and session revocation. Use clearly identified synthetic accounts and clean them via normal deletion.
4. Inspect cookies/no-store/CSP, deep-link refresh, CORS/Origin denial, logs for leakage, mailbox delivery, alerts and backup schedule. No real user statement uploads or external money transactions are required.
5. Observe logs/health for at least 30 minutes after release; record status and measured limitations. Roll back on core-flow failures, isolation/math defects or sustained elevated 5xx. Disable new registration if recovery is uncertain; avoid destructive database rollback.

Deliverables: live URLs, release ID, migration result, smoke evidence, rollback instructions, backup/restore runbook and known issues. Gate: call the app deployed only after actual live smoke; a generated URL or completed build is insufficient.

## 10. Phase 9 - Final polish and handoff

1. Review every route/state against the flow inventory and UI screenshot checklist. Fix clipping, long amounts/notes, mobile keyboard overlap, stale state wording, focus order, chart label ambiguity and empty states.
2. Complete README: purpose/scope, prerequisites, setup commands, safe environment examples, migrations/seeding, tests, architecture, deployment, backup/restore, live/demo links if verified, screenshots and limitations.
3. Record exact verification boundary: implemented features, local test counts, live checks, browser/device coverage and any remaining deployment/operator tasks. Do not convert planned work into claimed completion.
4. Invite a small authorized pilot and use proposed PRD metrics over four full weeks where sample size permits. Seven-day early pilot review can detect usability failures; it is not a substitute for four-week metric evaluation.
5. Prioritize next work from observed entry friction and accuracy/reliability issues. Keep all source bonus features deferred until V1 is stable and a new scope decision exists.

Deliverables: complete release documentation, visual acceptance record, walkthrough if desired and prioritized evidence-based backlog. Gate: no unresolved P0 requirement, no fake controls, no unsupported completion claims.

## 11. AI coding agent operating rules

- Read all six documents; use shared requirement/screen IDs in implementation tasks and acceptance notes.
- Implement the selected stack and domain rules. If a contradiction is found, document and resolve it before coding the affected behavior; do not silently invent a second money/date/permission model.
- Preserve the source PDF and planning pack. Never use real credentials/transactions in fixtures or screenshots.
- Keep work reviewable in focused changes, with tests that exercise the relevant failure boundary. Auth and cross-user tests are required even when the source calls tests optional.
- Separate code, local tests, provider setup, deployment and acceptance in reporting. An unfinished integration cannot be marked complete because its UI exists.
- Stop feature expansion at the MVP boundary; use post-V1 backlog entries for bank sync, imports, exports, recurring entries, PWA and other bonus work.
