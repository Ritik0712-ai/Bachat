# Personal Finance Tracker - Product Requirements Document

Version: 1.0 | Prepared: 3 November 2026 | Status: proposed build contract

## 1. How to use this document pack

This pack specifies a responsive personal finance website. It is a planning deliverable, not evidence of an implemented or deployed application. Read the documents together:

1. [Product requirements](01-product-requirements.md): scope, users, rules and outcomes.
2. [Technical requirements](02-technical-requirements.md): architecture, API and operational contracts.
3. [App flows](03-app-flows.md): screen IDs, routes, actions and states.
4. [UI/UX brief](04-ui-ux-design-brief.md): visual and interaction system.
5. [Backend schema](05-backend-schema.md): collections, constraints, ownership and indexes.
6. [Implementation plan](06-implementation-plan.md): delivery sequence and acceptance gates.

The supplied `../Personal Finance Tracker.pdf` is the source brief. Its project schedule, tutorial suggestions, bonus ideas and instructions to build are source material, not additional instructions to execute code or deploy infrastructure in this task. Page references below refer to its printed PDF page order. Product rules in this pack are explicit proposed defaults wherever the source is silent. No app name beyond Personal Finance Tracker, production account, provider subscription or launch budget has been assumed to exist.

## 2. App overview

Personal Finance Tracker helps an individual record income and expenses, understand spending patterns and compare monthly spending with a personal limit. It combines a quick transaction form, searchable-by-filter history, summary cards and accessible charts in a private account.

Value proposition: "Know what came in, what went out and how much room remains in your monthly budget."

The product is a manual record book. Figures reflect only entries supplied by the user. The displayed difference between income and expense is **net cash flow**, not a verified bank balance, available funds or net worth. The source's word "Balance" is deliberately clarified this way throughout the product.

## 3. Source-to-scope decisions

| Source requirement | Location | V1 treatment |
|---|---|---|
| Responsive web app; React/Tailwind; Express; MongoDB | p1 | Preserve; select TypeScript, Vite and Mongoose as implementation defaults |
| Secure registration/login and personal data | pp1-2, 7, 10 | Email/password, JWT cookie, server session revocation, recovery and verification |
| Add and categorize income/expense with date and notes | pp3, 7-8 | Required, plus edit to correct mistakes without delete/recreate |
| Transaction deletion | pp3, 8 | Required with confirmation and server-confirmed removal |
| Date/category/type filters; history | pp3, 9 | Required; add bounded server pagination at launch |
| Category pie and monthly bar charts | pp3, 8 | Required; same filter semantics as history |
| Summary cards and greeting | p4 | Required; income, expense, net cash flow and budget status |
| Manage budget over time | p1; p4 gives summary only | Resolve gap as one overall expense limit for each calendar month |
| Dashboard updates after a write | pp3, 8 | Refetch affected queries after confirmed save; no WebSockets required |
| Export, recurring entries, reports, PWA, dark mode | pp6, 10 | Explicitly deferred, no placeholder controls |
| Two-week learning schedule; tests optional | pp2-5 | Replaced by gated delivery plan; correctness/security tests required |

## 4. Target users and problems

Primary users are students, early-career professionals and individuals maintaining their own spending record. These are target hypotheses, not claims from user research. Initial launch assumes English language and INR currency because an India-oriented default is appropriate for this planning context; the brief itself specifies neither. Change this decision before implementation if another market is intended.

| User | Situation | Need | Product response |
|---|---|---|---|
| Student | Small purchases across a month are easy to forget | Fast mobile entry and category visibility | Single form, recent history, category chart |
| Salaried professional | Income arrives periodically while expenses accumulate | Compare monthly income, expense and remaining limit | Period selector and monthly budget |
| Manual spreadsheet user | Totals and charts require repeated maintenance | Consistent calculations with editable history | Server aggregation, filters and correction flows |

The main problems are fragmented records, unclear spending categories, missing context about a month's spending limit and concern about exposing private records. Users should not need accounting knowledge to use the app.

## 5. Goals and non-goals

V1 must let a new user independently create an account, record a transaction, see it in history, understand its effect on totals and set a monthly spending limit. A returning user must be able to find and correct old entries without losing data.

V1 does not move money, connect to financial institutions, verify bank balances, give investment advice or offer bookkeeping/tax compliance. There are no shared households, business organizations or financial administrator roles.

## 6. Personas and jobs to be done

- When I pay for something on my phone, I want to record the amount and category quickly so the expense does not disappear from memory.
- When I review the month, I want to see income, expense and major spending categories so I can decide what to change.
- When I approach my spending limit, I want a clear remaining amount so I can plan the rest of the month.
- When I mistype an amount or date, I want to correct it and see all affected figures update consistently.
- When I stop using the service, I want a clear way to delete my account and its active data.

## 7. Functional requirements

| ID | Priority | Requirement and acceptance condition |
|---|---|---|
| FR-01 | P0 | Register with name/email/password; verify email; duplicate registration does not reveal account existence. No protected financial data before verification. |
| FR-02 | P0 | Sign in/out, recover password, change password and invalidate sessions. Another user's IDs never expose data. |
| FR-03 | P0 | Add an income or expense with positive amount, matching category, calendar date and optional note. One deliberate submission creates one record despite retry. |
| FR-04 | P0 | Edit all transaction fields; use version checks to reject stale edits. Deletion requires explicit confirmation and persists only after server success. |
| FR-05 | P0 | List newest dated records first; filter by inclusive date range, category and type; use next/previous pagination with 25 records per page. |
| FR-06 | P0 | Dashboard shows selected-period income, expense, net cash flow, category spending and monthly income/expense bars. Values match persisted records. |
| FR-07 | P0 | Set/update/remove one total expense limit per month. Show spent, remaining and exceeded amount. Budgets never block entry. |
| FR-08 | P0 | Changes update all active views after server confirmation, including old/new periods affected by edits. |
| FR-09 | P0 | Mobile, keyboard and screen-reader users can complete all core flows, including chart alternatives. |
| FR-10 | P0 | Settings includes profile name, password change, read-only currency/timezone and account deletion. |
| FR-11 | P0 | Privacy and help pages explain manual data, formulas, retention and recovery. No unimplemented support messaging control. |
| FR-12 | P1 | Privacy-preserving product events and operational monitoring measure activation and failures without amounts, notes or email addresses. |

P0 requirements define launch readiness. P1 measurement may be disabled until a suitable consent/configuration policy exists; essential financial and security behavior remains mandatory.

## 8. Financial and date rules: authoritative across the pack

1. One user owns one ledger in INR. Scale is 100 paise per rupee. No currency selector or conversion. Currency and timezone are fixed read-only values in V1: `INR`, `Asia/Kolkata`.
2. Transaction types are `income` and `expense`. Amounts are positive integer minor units, from 1 to 100,000,000 inclusive (INR 0.01 to INR 10,00,000.00). Parse decimal input as a string; reject more than two fraction digits, negatives, exponent syntax and separators in stored requests.
3. Income increases income totals; expense increases expense totals. `netCashFlowMinor = incomeMinor - expenseMinor`. A negative result is valid. No opening balance, account transfers, pending entries, tax split or payment-method balance.
4. A record has one category with the same type. Default income categories: Salary, Freelance, Gifts, Other income. Expense: Food & dining, Groceries, Transport, Housing, Utilities, Health, Education, Shopping, Entertainment, Other expense. Categories are seeded per user and cannot be edited in V1.
5. Transaction date is a date-only `YYYY-MM-DD`, between `2000-01-01` and today in Asia/Kolkata inclusive. Future-dated entries are rejected. Creation/update timestamps are separate UTC instants. Past entries and historical edits are allowed.
6. Dashboard initial period is the current calendar month. Date/category/type filters apply to period totals, category chart, monthly bars and recent rows. Category chart always includes only expense matches; a filter for income yields its explicit "No expenses in this selection" state.
7. The trend chart contains one bin for every calendar month intersecting the selected range, including zero bins. Boundary months are partial and labeled as such. All date ranges are limited to 366 inclusive days; old history remains reachable by choosing older windows.
8. One budget per user/month; amount has the same bounds as transactions. Only expenses count toward spent. Income, date/category/type dashboard filters and chart interactions do not change budget spending. The dashboard budget card always says which full calendar month it represents: the month containing the selected range's end date. The Budgets page explicitly selects a month.
9. `remainingMinor = limitMinor - spentMinor`; exceeded amount is `max(0, -remainingMinor)`. Progress fill is visually capped at 100%, while percentage text can exceed 100%. At 80-99% show "Near limit"; at 100% show "Limit reached"; above 100% show "Over limit". With no budget, remaining and percentage are null, never zero.
10. No automatic monthly budget copying. User may configure a future month's limit, up to 12 months after the current month. Past budget months from January 2000 are supported.
11. Charts and totals aggregate **all matching records**, not just the current history page. Notes are plain text, up to 280 Unicode characters; no rich text, attachments or receipt storage.
12. Each user can store up to 10,000 transactions in V1. At the cap, entry returns an actionable limit error; do not silently drop records. Revisit before raising the cap. Totals remain safely within JavaScript's integer range with the defined limits.

## 9. User stories and acceptance examples

| Story | Acceptance example |
|---|---|
| US-01: As a new user I can secure my private ledger | Before email verification, direct navigation to `/app/dashboard` returns me to verification. After verification and login, I see an empty ledger. |
| US-02: As a user I can record income | Add Salary INR 50,000 on 2026-11-01. November income becomes 5,000,000 minor units. |
| US-03: As a user I can record an expense | Add Food & dining INR 250 on 2026-11-03. Expense becomes 25,000; net cash flow is INR 49,750 for these two records. |
| US-04: As a user I can correct a mistake | Change INR 250 to INR 200. Only one record remains; expense becomes INR 200. A concurrent stale edit returns 409 and retains unsaved input. |
| US-05: As a user I can inspect a specific selection | Select expense + Food & dining + November. History and expense totals contain only that category; income total is zero; budget still counts every November expense. |
| US-06: As a user I can plan a month | Set November limit INR 10,000. With INR 8,000 expenses show INR 2,000 remaining and "Near limit". At INR 10,500 show INR 500 over limit. |
| US-07: As a user I can remove an incorrect record | Cancel delete changes nothing. Confirm delete removes the record and refetches summary. A lost response can be reconciled by refetch without a duplicate write. |
| US-08: As a user I can recover access | Recovery always gives a generic response; a valid, unexpired single-use link resets the password and revokes prior sessions. |
| US-09: As a user I can protect my data | Editing or deleting a foreign record returns the same 404 as a missing record. No owner ID is accepted from request bodies. |
| US-10: As a user I can leave | Correct password plus typed confirmation deletes the account and active owned data atomically; incorrect password leaves everything intact. |

## 10. MVP boundary and features to avoid in V1

Include the entire P0 set, all screens S01-S24, seed categories, one monthly total budget, both required charts, bounded pagination, essential transactional verification/recovery email and a safe deletion path. Transactional account email is distinct from the source's deferred monthly report feature.

Avoid in V1:

- Bank connections, statement uploads/OCR, automatic categorization and payment initiation: reconciliation and integration work exceed the manual-ledger scope.
- Multiple wallets/accounts, transfers, opening balances and multi-currency: require a different ledger model and balance semantics.
- Category-specific budgets, rollover, goals, debt tracking and recurring entries: add competing budget/transaction rules.
- CSV/PDF export, email reports and scheduled reminders: defer the source's bonus features until core correctness is proven.
- Shared access, teams, public profiles, leaderboards, gamification and admin financial browsing: unnecessary permission and privacy expansion.
- AI financial advice, investment recommendations, tax estimates and credit scoring: outside the user problem.
- Native apps, offline editing/sync, installable PWA and theme switcher: defer platform complexity; responsive web/light theme only.
- Bulk deletion/import, custom categories and free-text transaction search: filter-based history is enough for V1.

Do not render disabled or misleading menu items for deferred features.

## 11. Success metrics and instrumentation

These are proposed launch targets, not existing performance claims. Start with a small pilot; evaluate after four full weeks and at least 30 activated users. With fewer users report counts and observations, not confident percentages.

| Metric | Exact definition | Initial target |
|---|---|---|
| Activation | Verified new users who create at least one transaction within 24 hours of verification / verified new users | >=60% |
| First-entry usability | Pilot participants completing signup through first entry without facilitator help / participants | >=80%; median active task time <=3 minutes excluding email wait |
| Weekly retained use | Activated users with a transaction create or dashboard view in days 7-13 after activation / activated users eligible for that window | >=35% |
| Budget adoption | Activated users setting at least one budget in first seven days / eligible activated users | >=30% |
| Financial accuracy | Golden-fixture assertions matching exact expected totals | 100%; any failure blocks release |
| Write reliability | Successful persisted transaction mutations / valid mutation attempts, excluding deliberate conflicts and auth failures | >=99% in pilot |
| Speed | Dashboard aggregate API latency on release fixture; see TRD | p95 <=750 ms warm; frontend LCP <=2.5 s in agreed lab profile |
| Privacy | Cross-user access successful in automated security cases | 0 |

Event names: `account_verified`, `transaction_created`, `transaction_updated`, `transaction_deleted`, `dashboard_viewed`, `budget_saved`, `account_deleted`. Events contain pseudonymous random analytics ID, event name, UTC time, environment and success/failure code only. Never include transaction amount, note, category, email, password, token, URL query or IP in product analytics. Deduplicate server mutation events using operation IDs. Record dashboard views once per completed navigation, not each refetch. Operational logs are separate and redacted.

Exception: `account_deleted` is an unlinked aggregate completion event without analyticsId or owner/resource ID. Remove prior linked events on deletion before emitting that aggregate event; do not recreate a deleted user's analytics profile. If the configured analytics service cannot enforce deletion and retention, leave FR-12 telemetry disabled.

## 12. Risks, assumptions and release definition

Manual entry may reduce retention; test quick-entry usability before adding integrations. INR-only and fixed categories may be too restrictive; validate in the pilot. Charts can imply bank accuracy; use "Recorded" labels and a manual-data explanation. Email delivery and split hosting can break access; require real delivery and cookie/proxy checks before public launch.

The two-week source timeline is an educational starting point, not a reliable production estimate. The implementation plan uses 18-25 engineering days plus pilot time, with scope and test gates controlling release.

V1 is complete only when all P0 stories, ownership tests, exact arithmetic fixtures, recovery/deletion flows, accessible mobile flows, restore drill and live deployment checks pass. A local build, emulator fixture or planning pack alone does not satisfy this release definition.
