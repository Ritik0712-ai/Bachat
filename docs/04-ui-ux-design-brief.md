# Personal Finance Tracker - UI/UX Design Brief

Version: 1.0 | Prepared: 3 November 2026 | Status: proposed visual system

Use with [screen behaviors](03-app-flows.md), [financial rules](01-product-requirements.md) and [implementation plan](06-implementation-plan.md). This is a build brief, not an existing Figma file or tested user-research result.

## 1. Product character and design direction

Create a calm, precise financial workspace. The interface should feel like a well-organized personal record book: clear headings, restrained color, readable numbers, generous spacing and direct actions. The dashboard should answer three questions in order: What have I recorded? Where did expenses go? How does this compare with my monthly limit?

Use a light background, white surfaces and deep teal primary actions. Avoid neon gradients, oversized marketing artwork inside the app, glass effects, decorative 3D objects, dashboard clutter and unearned claims about improving wealth. Use words such as Recorded income and Net cash flow; do not imply connection to a bank.

Working title: Personal Finance Tracker. Use a simple wallet/ledger line icon if needed; do not invent a brand, bank affiliation or logo acquisition requirement. Welcome-page illustrations must be clearly decorative and must not resemble real account data.

## 2. Color tokens

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F8FAFC` | App background |
| `surface` | `#FFFFFF` | Cards, forms, menus |
| `text-primary` | `#0F172A` | Headings, financial values |
| `text-secondary` | `#475569` | Descriptions and secondary labels |
| `border` | `#CBD5E1` | Input/table/card boundaries |
| `primary` | `#0F766E` | Main action, selected navigation, focus accent |
| `primary-hover` | `#115E59` | Hover/pressed primary |
| `primary-soft` | `#F0FDFA` | Selected background, paired with dark teal text |
| `income` | `#166534` | Income text and semantic badge |
| `income-soft` | `#F0FDF4` | Income badge background |
| `expense` | `#B91C1C` | Expense text; never sole indicator of type |
| `expense-soft` | `#FEF2F2` | Expense badge background |
| `warning` | `#92400E` | Near-limit text |
| `warning-soft` | `#FFFBEB` | Near-limit background |
| `danger` | `#B91C1C` | Destructive actions/errors |
| `focus` | `#1D4ED8` | 2 px focus ring plus 2 px white offset |

Use dark text on light fills. Muted text must remain readable; do not lower opacity on essential monetary values. Disabled controls use `#E2E8F0` fill and `#64748B` text plus a clear disabled state; they do not convey required information alone. Validate actual pairings in implementation rather than treating token choice as proof of accessibility.

Category chart palette by fixed expense seed order: `#0F766E`, `#1D4ED8`, `#7C3AED`, `#B45309`, `#BE185D`, `#0369A1`, `#4D7C0F`, `#A21CAF`, `#334155`, `#78716C`. Store stable `colorKey` identifiers, not arbitrary user colors. Chart fills are accompanied by text labels, keyed markers and a data table. Adjacent slices use a 2 px white separator. Do not draw small white text inside slices.

Monthly trends: income deep teal `#0F766E`, expense slate-blue `#475569`; textual legend and values distinguish them. Red is reserved for expense labels and exceeded/error status rather than painting the entire chart red.

## 3. Typography and number formatting

Self-host Inter with system sans-serif fallback, avoiding a third-party font request on private pages. Use one family and regular/medium/semibold weights. Set financial values to tabular lining figures (`font-variant-numeric: tabular-nums`).

| Style | Desktop | Mobile | Weight |
|---|---|---|---|
| Page H1 | 28 px / 36 px | 24 / 32 | 600 |
| Section H2 | 20 / 28 | 18 / 26 | 600 |
| Stat value | 30 / 38 | 26 / 34 | 600 |
| Body/input | 16 / 24 | 16 / 24 | 400 |
| Table body | 14 / 22 | 16 / 24 card layout | 400 |
| Field label/button | 14 / 20 | 14 / 20 | 500 |
| Helper/metadata | 13 / 20 | 13 / 20 | 400 |

Currency: Indian grouping and two decimal places throughout financial detail (`INR 1,23,456.78` or the rupee glyph where font support is verified). Do not mix compact abbreviations into core totals; allow value wrapping or smaller value size at extreme values. Chart axes may use `1k`/`1L` only with full-value tooltips and table equivalents. Add/expense form accepts the numeric amount without a minus sign; transaction type defines direction.

Date display: `03 Nov 2026`; month: `November 2026`; timestamps: local date/time with `IST`/Asia/Kolkata context in help or detail. API remains ISO. Do not rely on the device timezone for transaction date defaults.

## 4. Spacing, layout and surfaces

Use a 4 px spacing base with 8/12/16/24/32/48 px rhythm. Cards have 12 px radius, 1 px border, 20-24 px desktop padding and 16 px mobile padding. Buttons/inputs have 8 px radius. Keep shadows subtle and restricted to floating menus/dialogs; ordinary cards use borders.

Desktop >=1024 px: 232 px fixed sidebar, top header 72 px, content padding 32 px, max content width 1280 px centered within remaining area. Use a 12-column grid with 24 px gaps. Tablet 768-1023 px: compact 200 px navigation rail or collapsible sidebar, 24 px content padding, 16 px gaps; do not hide navigation behind an unexplained icon. Mobile <768 px: one column, 16 px page gutters, 16 px gaps, fixed bottom navigation with safe-area padding and 80 px minimum bottom content clearance.

Smallest supported width: 360 px; verify at 390 px. No page-level horizontal scrolling. Desktop transaction table becomes mobile cards below 768 px; the accessible chart data table may scroll within a labeled region when necessary, never the full page. Forms max width 640 px; auth forms max width 420 px.

## 5. Dashboard composition

```text
Desktop content area
---------------------------------------------------------------
Overview / greeting                         [Add transaction]
[Date range] [Type] [Category] [Apply] [Reset]
---------------------------------------------------------------
[Recorded income]   [Recorded expenses]   [Net cash flow]
---------------------------------------------------------------
[Budget: explicit month, spent/limit, remaining, status, Manage]
---------------------------------------------------------------
[Spending by category: 5 columns] [Monthly trends: 7 columns]
[Chart | Data table]               [Chart | Data table]
---------------------------------------------------------------
Recent transactions                              [View all]
Date | Category | Note | Type | Amount
---------------------------------------------------------------
```

Mobile order is identical: heading/add, filter summary, three summary cards stacked, budget card, category chart, monthly chart, recent cards. Do not shrink the three financial values into illegible side-by-side tiles. Budget belongs above charts because its action is time-sensitive, but it has a clear full-month scope disclaimer.

Donut: 240 px desktop/220 px mobile plot height, expense total in center, legend below with category, amount and percentage. Zero-expense selection shows an honest empty panel with no fabricated slices. Ten categories fit as a vertical legend; do not merge into an unexplained "Other" bucket.

Bar chart: 280 px desktop/240 px mobile, zero baseline, labeled month ticks. For >6 bins on mobile, provide a horizontally scrollable **chart region** with minimum 56 px/bin and explicit scroll affordance; the corresponding table must expose all bins without hover. Zero bins stay visible in the data table. Partial months have `*` with a visible explanation. No 3D, dual axis or smoothed projection.

## 6. Component specifications

| Component | Visual/behavior requirements |
|---|---|
| Primary button | Teal fill/white label; min height 44 px; leading icon optional; one dominant action per form |
| Secondary button | White fill, slate border/text; same height; visible focus/hover |
| Destructive button | Red fill/white label only in final confirmation; initial row action is text/icon with accessible label |
| Input | 44-48 px height, visible label, helper below, error text below; 16 px text on mobile |
| Amount input | Static rupee prefix outside editable string; right-aligned numeric input; no number-spinner controls |
| Select/type control | Accessible native select or tested combobox; segmented type group supports arrow keys and labels |
| Date/month picker | Native or accessible custom input with text fallback; display allowed limits and invalid-range message |
| Transaction row | 56 px min height; whole-row view plus independently focusable View/Edit/Delete; signed amount right-aligned |
| Type badge | Income/Expense text, soft background, stable width; no unexplained arrow-only meaning |
| Summary card | Label, exact value, period descriptor; no invented comparison percentage |
| Budget progress | Label spent/limit, text status and remaining; capped fill with true over-limit text |
| Dialog | 480 px max width; title/description; Cancel then destructive action; focus trap, Escape, focus restore |
| Toast | Bottom-right desktop, above bottom navigation mobile; live region; six seconds, dismiss button |
| Error banner | Icon/title/action; red for failed action, warning for stale confirmed data; request reference optional |
| Empty panel | One sentence, one relevant CTA; no cartoon overpowering financial UI |
| Skeleton | Same geometry as loaded view; reduced motion support; never fake numeric data |
| Pagination | Previous, Page N of M, Next, count; min touch target 44 px |

For focusable row actions, icon-only desktop delete may be used only with `aria-label="Delete [category] transaction on [date]"` and tooltip; mobile uses visible text. Tooltip never contains essential information unavailable elsewhere.

Password visibility toggles use explicit accessible Show/Hide labels. Verification/reset tokens are never shown in input fields. Confirmation dialogs show the actual target amount/date; account deletion adds current password and typed DELETE.

## 7. Interaction and content principles

- Prioritize a quick but deliberate add flow: Expense default, today default, category required, optional note. Avoid requiring merchant/payment details the schema does not support.
- Confirm persisted results. Saving indicators may appear immediately; totals change only after server success. Show a separate stale-summary warning if refresh fails afterward.
- Every financial value needs a clear scope. Period totals follow filters; budget explicitly covers its full month. Help repeats this distinction with an example.
- Avoid judgmental language: use Over limit, not Bad spending. Negative net cash flow is a fact, not an error.
- Do not clear form input after validation or network failure. Do not silently change a transaction's date/category to fit a filter.
- Every error should state what the user can do: Check amount, Retry, Load latest, Sign in or Reset filters. No raw server messages.
- Preserve context: back from a detail returns to the same history filters/page. Screen changes focus the heading. Multi-tab stale edits require explicit review.
- Make disclosure concise: "Based on transactions you recorded" near overview; "Not a bank balance" in net cash-flow help text.

Approved microcopy examples:

| Situation | Copy |
|---|---|
| First use | No transactions yet. Add one to start your record. |
| Filtered empty | No transactions match these filters. |
| Missing expenses | No expenses in this selection. |
| No budget | No budget set for November 2026. |
| Over budget | INR 500.00 over your November limit. |
| Save success | Transaction added. |
| Save ambiguous | Save could not be confirmed. Retry to check the same submission. |
| Refresh failure after save | Saved. Summary could not refresh. |
| Version conflict | This record changed in another tab. Review the latest version. |
| Session expiry | Your session ended. Sign in to continue. |
| Delete record | Delete this transaction? This cannot be undone. |

## 8. Accessibility and responsive acceptance

Target [WCAG 2.2 AA](https://www.w3.org/WAI/WCAG22/quickref/). Use landmarks, skip-to-content, semantic headings, real labels, error summaries, programmatic associations and visible focus. Body text contrast >=4.5:1; large text >=3:1; meaningful control boundaries and focus indicators >=3:1 where applicable. Product touch target target is 44x44 px even where the standard's minimum permits less.

Keyboard-only users must reach filter sheets, chart alternatives, pagination, type selector, dialog actions and account menu. Focus returns to the invoking control after a dialog; after deleting it moves to the list heading or next meaningful control. Respect prefers-reduced-motion; transitions <=150 ms and no animated counting of monetary totals. Do not make auto-refetch steal focus or announce every value separately.

At 200% zoom, all flows remain usable and text wraps. At a 320 CSS px reflow test, content remains operable even though the normal design target begins at 360 px; use compact stacking rather than clipping. Test iOS Safari date/decimal keyboards and Android Chrome; hover is never required.

Acceptance screenshots: S08 populated, S08 empty, S09 25 rows/cards, S10 field errors, S12 conflict, S14 over limit, S19 deletion and S23 expiry at 1440x900 and 390x844. Include long names, long category labels, 280-character note, max amount, negative net flow, no budget and >6 trend months. Automated checks supplement manual keyboard/screen-reader review.

## 9. Visual references and handoff assets

Use references as patterns, not templates to copy:

- [W3C WAI form tutorials](https://www.w3.org/WAI/tutorials/forms/): explicit labels, grouping and feedback. Apply to auth and transaction forms.
- [GOV.UK Design System](https://design-system.service.gov.uk/): restrained typography, clear error summaries and destructive confirmation hierarchy. Use interaction principles, not government branding.
- [Recharts examples](https://recharts.github.io/en-US/examples/): donut and grouped-bar implementation reference; add the accessibility/table behavior specified here rather than assuming defaults are sufficient.

Original layout direction is the wireframe in section 5 and tokens in this document. No reference implies partnership or verified suitability for every component. A designer/build agent should produce shell/components, empty/loading/error variants and the acceptance screenshot set; an external design file is optional and not required to interpret the contract.

## 10. Design completion gate

Every route in the flow document must use the same tokens, amounts, field labels and state language. No unsupported feature appears in navigation. Review desktop and mobile screenshots side by side; verify all values against the same known fixture and inspect every dialog, footer, filter state and chart alternative. Visual polish cannot override ownership, exact financial values or recovery behavior.
