# StudioFlow Mobile Audit Report
**Generated:** 2026-04-23
**Total Pages:** 82

## Summary
- Pages using shadcn: 18
- Pages using raw HTML: 33
- Pages mixed: 31
- Pages with responsive breakpoints: 38
- Pages desktop-only: 22
- Pages partial responsive: 12
- Redirects/placeholders (no UI): 10
- Pages needing mobile redesign: 34

## Shared Layouts

### Main Layout (src/app/layout.tsx)
- Sidebar: N/A — delegates to admin layout
- Mobile nav: No
- Container max-width: None (full viewport)
- Responsive breakpoints: None — wrapper only (theme provider, fonts, toaster)

### Admin Layout (src/app/admin/layout.tsx)
- Sidebar: Manual toggle only — NO automatic responsive collapse
- Mobile nav: No dedicated mobile nav — hamburger toggles sidebar collapse
- Sidebar widths: w-64 (expanded) → w-16 (collapsed), transition-all duration-300
- Container max-width: None
- Only responsive class: `hidden md:block` on profile user info
- **Critical issue:** Sidebar does not auto-collapse on mobile — stays expanded at w-64 on 390px screens

### Portal Layout
- No dedicated layout file — uses root layout only

### Leads Layout
- No dedicated layout file — uses root layout only

## shadcn Components Installed
alert-dialog, avatar, badge, bounce-button, button, button-group, button-with-badge, calendar, card, chart, checkbox, collapsible, collapsible-section, command, data-table, dialog, dropdown-menu, filter-bar, input, label, popover, select, separator, sheet, skeleton, sonner, stat-card, stats-row, stats-sidebar, status-badge, switch, table, tabs, textarea, theme-toggle

## Page-by-Page Audit

| # | Route | Lib | Responsive | Type | Lines | Mobile Issues |
|---|-------|-----|------------|------|-------|---------------|
| 1 | / | shadcn | responsive | auth | 38 | None |
| 2 | /login | shadcn | responsive | auth | 100 | None — max-w-md, w-full buttons |
| 3 | /scanner | mixed | responsive | form | 579 | grid-cols-2, grid-cols-3 need stacking |
| 4 | /ballot | mixed | responsive | form | 464 | grid-cols-2/3 no prefix, w-32 toggle buttons may overflow |
| 5 | /test-quote | raw | desktop-only | presentation | 131 | No responsive prefixes |
| 6 | /analytics | mixed | partial | dashboard | 221 | Tables need horizontal scroll |
| 7 | /leads | mixed | partial | list | 477 | Sidebar flex layout, nested grids |
| 8 | /leads/[id]/compose | mixed | responsive | form | 157 | None — max-w-3xl, single column |
| 9 | /leads/analytics | mixed | partial | dashboard | 328 | grid-cols-2 md:grid-cols-4 OK, table needs scroll |
| 10 | /portal/login | raw | responsive | auth | 130 | None — max-w-md centered |
| 11 | /portal/[slug] | raw | responsive | presentation | 303 | grid-cols-3 collage cramped at 390px |
| 12 | /client/new-quote | mixed | partial | form | 3170 | Massive form, grid-cols-1 sm:grid-cols-2, needs full mobile testing |
| 13 | /client/photo-order | raw | responsive | form | 878 | None — step-based, max-w-3xl |
| 14 | /client/video-order | raw | responsive | form | 584 | None — step-based, max-w-3xl |
| 15 | /client/photo-order-public | raw | responsive | form | 736 | None — multi-step, px-4 |
| 16 | /client/video-order-public | raw | responsive | form | 469 | None — step-based |
| 17 | /client/wedding-day-form | raw | partial | form | 1455 | Complex form, grid-cols-1 sm:grid-cols-2, needs mobile testing |
| 18 | /client/wedding-day-form/[coupleId] | raw | responsive | detail | 557 | None — max-w-3xl, responsive grids |
| 19 | /client/extras | mixed | partial | list | 196 | DataTable, grid-cols-2 md:grid-cols-4 |
| 20 | /client/extras/new | raw | responsive | form | 387 | None — max-w-3xl |
| 21 | /client/extras/[id] | raw | responsive | detail | 513 | None — max-w-3xl |
| 22 | /client/extras-quote | mixed | responsive | detail | 215 | None — max-w-md card |
| 23 | /admin | mixed | responsive | dashboard | 683 | None — uses sm:, lg: throughout |
| 24 | /admin/dashboard | shadcn | N/A | auth | 6 | Redirect only |
| 25 | /admin/couples | mixed | responsive | list | 667 | Sidebar hidden lg:block, grid-cols-2 lg:grid-cols-4 |
| 26 | /admin/couples/[id] | mixed | partial | detail | 440 | grid-cols-3 no responsive prefix |
| 27 | /admin/couples/[id]/upload-contract | mixed | responsive | form | 560 | None — grid-cols-1 md:grid-cols-2 |
| 28 | /admin/couples/[id]/upload-extras | mixed | responsive | form | 404 | None — grid-cols-1 responsive |
| 29 | /admin/finance | mixed | responsive | dashboard | 382 | None — grid-cols-1 sm:grid-cols-3 |
| 30 | /admin/finance/income | mixed | responsive | dashboard | 230 | None — grid-cols-1 sm:grid-cols-3 |
| 31 | /admin/finance/expenses | mixed | responsive | dashboard | 150 | None — grid-cols-1 sm:grid-cols-2 |
| 32 | /admin/finance/tax | mixed | responsive | form | 419 | None — responsive grids |
| 33 | /admin/finance/reconciliation | raw | desktop-only | form | 577 | No responsive prefixes, raw flexbox |
| 34 | /admin/documents | mixed | desktop-only | dashboard | 358 | grid-cols-4 no prefix, w-72 fixed sidebar |
| 35 | /admin/documents/photo-order/[id] | raw | desktop-only | presentation | 256 | grid-cols-2 no prefix, print layout |
| 36 | /admin/documents/video-order/[id] | raw | desktop-only | presentation | 204 | grid-cols-2 no prefix, print layout |
| 37 | /admin/documents/wedding-day-form/[id] | raw | desktop-only | presentation | 307 | Multiple grid-cols-2 no prefix, print layout |
| 38 | /admin/contracts/generate | mixed | partial | form | 437 | grid-cols-2 no prefix, max-w-2xl OK |
| 39 | /admin/contracts/[id]/view | raw | desktop-only | presentation | 413 | max-w-[8.5in] fixed, print layout |
| 40 | /admin/client-quotes | shadcn | N/A | auth | 5 | Redirect only |
| 41 | /admin/extras-quotes | mixed | partial | dashboard | 113 | grid-cols-2 max-w-md, minor |
| 42 | /admin/extras/[id]/view | raw | desktop-only | presentation | 195 | Fixed table layout, print-focused |
| 43 | /admin/albums/[id]/view | raw | desktop-only | presentation | 212 | flex gap-16, fixed width, print-focused |
| 44 | /admin/settings | shadcn | N/A | auth | 10 | Placeholder — under construction |
| 45 | /admin/production/photo | mixed | partial | dashboard | 1250 | grid-cols-4 no prefix, tables, sidebar hidden lg:block |
| 46 | /admin/production/video | mixed | partial | dashboard | 1357 | grid-cols-1 md:grid-cols-2 lg:grid-cols-3, tables, sidebar |
| 47 | /admin/production/report | raw | responsive | presentation | 973 | grid-cols-3/2 without mobile prefix, tables |
| 48 | /admin/production/archive | raw | responsive | dashboard | 597 | None — grid-cols-2 md:grid-cols-4 |
| 49 | /admin/production/archive/backup | raw | desktop-only | form | 402 | grid-cols-2 no prefix, modal forms |
| 50 | /admin/production/archive/drive/[driveNumber] | raw | responsive | list | 418 | None — grid-cols-1 md:grid-cols-4 |
| 51 | /admin/production/editing/new | shadcn | responsive | form | 651 | None — responsive grid |
| 52 | /admin/production/equipment | raw | responsive | presentation | 26 | Placeholder — maxWidth 600px |
| 53 | /admin/sales/frames | shadcn | responsive | list | 401 | grid-cols-2/3/6 no prefix, sidebar |
| 54 | /admin/sales/frames/new | raw | responsive | form | 267 | Fixed 560px width, position:fixed |
| 55 | /admin/sales/frames/new/[coupleId] | mixed | responsive | presentation | 1325 | Fixed 880px max-width, position:fixed overlay |
| 56 | /admin/sales/extras | shadcn | responsive | list | 651 | grid-cols-2/3/6 no prefix, sidebar |
| 57 | /admin/sales/extras/new | raw | responsive | form | 649 | Fixed 600px width, position:fixed |
| 58 | /admin/sales/quotes | shadcn | responsive | dashboard | 972 | grid-cols-2/3/6 no prefix, sidebar, table overflow |
| 59 | /admin/sales/revenue | raw | responsive | dashboard | 436 | grid-cols-2 lg:grid-cols-4, fixed width input |
| 60 | /admin/sales/report | raw | responsive | dashboard | 410 | grid-cols-2 lg:grid-cols-4, table overflow |
| 61 | /admin/sales/show-results | shadcn | responsive | dashboard | 455 | grid-cols-2, table overflow at 390px |
| 62 | /admin/orders | shadcn | responsive | list | 272 | Select components 160/120px fixed width |
| 63 | /admin/orders/[orderId]/view | raw | responsive | detail | 340 | grid-cols-3, table, max-w-3xl |
| 64 | /admin/team/members | mixed | desktop-only | list | 1020 | Fixed 2-col flex, modal max-w-640px, grid 1fr 1fr, table |
| 65 | /admin/team/schedule | shadcn | partial | dashboard | 847 | 8-column table, grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 |
| 66 | /admin/team/notes | mixed | responsive | form | 1000 | None — flex-wrap, sm: prefixes |
| 67 | /admin/team/payments | raw | desktop-only | presentation | 26 | Placeholder — maxWidth 600px |
| 68 | /admin/team/training | raw | desktop-only | presentation | 25 | Placeholder — maxWidth 600px |
| 69 | /admin/wedding-day/forms | shadcn | partial | list | 517 | 2-col flex with border-r, sidebar may not collapse |
| 70 | /admin/wedding-day/forms/[id]/print | shadcn | responsive | detail | 417 | None — max-w-[66%], print-aware |
| 71 | /admin/wedding-day/checklist | raw | desktop-only | presentation | 25 | Placeholder — maxWidth 600px |
| 72 | /admin/wedding-day/coordination | raw | desktop-only | presentation | 25 | Placeholder — maxWidth 600px |
| 73 | /admin/wedding-day/equipment | raw | desktop-only | presentation | 25 | Placeholder — maxWidth 600px |
| 74 | /admin/wedding-day/packing | raw | desktop-only | presentation | 25 | Placeholder — maxWidth 600px |
| 75 | /admin/wedding-day/crew-confirm | mixed | partial | form | 900+ | Large form, 2-col layouts, no clear mobile breakpoints |
| 76 | /admin/marketing/jeanmarcotte | shadcn | responsive | presentation | 10 | Placeholder — UnderConstruction component |
| 77 | /admin/marketing/sigs | shadcn | responsive | presentation | 10 | Placeholder — UnderConstruction component |
| 78 | /admin/marketing/sigs-seo | shadcn | partial | dashboard | 764 | grid-cols-2 md:grid-cols-4, tables with overflow-x-auto |
| 79 | /admin/portal/[coupleId] | shadcn | responsive | detail | 366 | grid-cols-3 collage no sm: prefix |
| 80 | /admin/client/new-quote | — | N/A | auth | 5 | Redirect only |
| 81 | /admin/client/communication | shadcn | responsive | presentation | 10 | Placeholder — UnderConstruction component |
| 82 | /admin/client/extras-sales | — | N/A | auth | 5 | Redirect only |

## Critical Mobile Issues (sorted by severity)

### BROKEN on mobile (overlapping/unreadable)

- **/admin layout (sidebar)** — Sidebar does not auto-collapse on mobile. At 390px, w-64 sidebar leaves ~134px for content. Critical blocker for ALL admin pages.
- **/admin/documents** — grid-cols-4 with no responsive prefix + w-72 fixed sidebar. Content will overflow and overlap.
- **/admin/team/members** — Hardcoded 2-column flex layout, modal at 640px, inline grid 1fr 1fr. Completely desktop-only.
- **/admin/contracts/[id]/view** — max-w-[8.5in] fixed print width, no responsive design.
- **/admin/documents/photo-order/[id]** — grid-cols-2 no prefix, print-focused fixed layout.
- **/admin/documents/video-order/[id]** — grid-cols-2 no prefix, table layout, print-focused.
- **/admin/documents/wedding-day-form/[id]** — Multiple grid-cols-2 no prefix, print layout.
- **/admin/extras/[id]/view** — Fixed table layout, print-focused, no breakpoints.
- **/admin/albums/[id]/view** — flex gap-16, fixed width, print-focused.
- **/admin/finance/reconciliation** — No responsive prefixes at all, raw flexbox.
- **/admin/production/archive/backup** — grid-cols-2 no prefix, modal forms, no breakpoints.
- **/admin/sales/frames/new/[coupleId]** — Fixed 880px max-width presentation overlay.

### USABLE but ugly

- **/admin/production/photo** — Sidebar hidden lg:block (good), but grid-cols-4 stat cards no prefix, tables overflow.
- **/admin/production/video** — Similar to photo, tables will need horizontal scroll.
- **/admin/production/report** — grid-cols-3/2 without mobile prefix, tables without responsive wrappers.
- **/admin/team/schedule** — 8-column table, grid-cols-3 sm:grid-cols-5 lg:grid-cols-7. Better than desktop-only but cramped.
- **/admin/couples/[id]** — grid-cols-3 section has no responsive prefix.
- **/admin/contracts/generate** — grid-cols-2 form fields no prefix.
- **/admin/sales/quotes** — grid-cols-2/3/6 no prefix in stat areas, sidebar, table overflow.
- **/admin/sales/frames** — grid-cols-2/3/6 no prefix, sidebar layout.
- **/admin/sales/extras** — Same grid issues as frames.
- **/admin/wedding-day/forms** — 2-col flex with border-r sidebar, may not collapse.
- **/admin/wedding-day/crew-confirm** — Large form with potential 2-col layouts, no clear mobile breakpoints.
- **/admin/marketing/sigs-seo** — grid-cols-2 md:grid-cols-4, tables partially handled.
- **/client/new-quote** — 3,170-line mega form, has sm: breakpoints but needs comprehensive mobile testing.
- **/client/wedding-day-form** — 1,455-line form, grid-cols-1 sm:grid-cols-2, needs mobile testing.
- **/admin/sales/frames/new** — Fixed 560px width.
- **/admin/sales/extras/new** — Fixed 600px width.
- **/admin/orders/[orderId]/view** — grid-cols-3 with table.
- **/portal/[slug]** — grid-cols-3 collage cramped at 390px.
- **/admin/portal/[coupleId]** — grid-cols-3 collage no sm: prefix.
- **/scanner** — grid-cols-2/3 need stacking on mobile.
- **/ballot** — grid-cols-2/3, w-32 toggle buttons may overflow.

### Works OK

- **/** — Responsive auth page
- **/login** — max-w-md, responsive
- **/portal/login** — max-w-md, centered
- **/client/photo-order** — Step-based, max-w-3xl
- **/client/video-order** — Step-based, max-w-3xl
- **/client/photo-order-public** — Multi-step, responsive
- **/client/video-order-public** — Step-based, responsive
- **/client/wedding-day-form/[coupleId]** — Responsive grids
- **/client/extras/new** — max-w-3xl form
- **/client/extras/[id]** — max-w-3xl detail
- **/client/extras-quote** — max-w-md card
- **/leads/[id]/compose** — max-w-3xl, single column
- **/admin** — Full responsive with sm:/lg: prefixes
- **/admin/couples** — Sidebar hidden lg:block, responsive grids
- **/admin/couples/[id]/upload-contract** — grid-cols-1 md:grid-cols-2
- **/admin/couples/[id]/upload-extras** — Responsive grid
- **/admin/finance** — grid-cols-1 sm:grid-cols-3
- **/admin/finance/income** — Responsive grids
- **/admin/finance/expenses** — Responsive grids
- **/admin/finance/tax** — Responsive grids
- **/admin/production/archive** — grid-cols-2 md:grid-cols-4
- **/admin/production/archive/drive/[driveNumber]** — grid-cols-1 md:grid-cols-4
- **/admin/production/editing/new** — Responsive shadcn form
- **/admin/sales/revenue** — grid-cols-2 lg:grid-cols-4
- **/admin/sales/report** — Responsive grids
- **/admin/sales/show-results** — Responsive grids
- **/admin/orders** — flex-wrap, responsive
- **/admin/team/notes** — flex-wrap, sm: prefixes
- **/admin/wedding-day/forms/[id]/print** — Print-aware responsive
- **/admin/marketing/jeanmarcotte** — Placeholder, responsive
- **/admin/marketing/sigs** — Placeholder, responsive
- **/admin/client/communication** — Placeholder, responsive

## shadcn Migration Needed
Pages still using raw HTML that should be migrated to shadcn before mobile work:

- **/admin/production/photo** (1,250 lines) — Entire page is raw HTML+Tailwind, tables, stat sidebar
- **/admin/production/video** (1,357 lines) — Entire page is raw HTML+Tailwind, tables, stat sidebar
- **/admin/production/report** (973 lines) — Raw HTML tables and grids
- **/admin/finance/reconciliation** (577 lines) — Raw flexbox, no responsive design
- **/admin/team/members** (1,020 lines) — Raw HTML tables, modals, 2-col layout
- **/admin/documents** (358 lines) — Mixed but grid/sidebar are raw
- **/admin/documents/photo-order/[id]** (256 lines) — Raw print layout
- **/admin/documents/video-order/[id]** (204 lines) — Raw print layout
- **/admin/documents/wedding-day-form/[id]** (307 lines) — Raw print layout
- **/admin/contracts/[id]/view** (413 lines) — Raw print layout
- **/admin/extras/[id]/view** (195 lines) — Raw table print layout
- **/admin/albums/[id]/view** (212 lines) — Raw print layout
- **/admin/production/archive/backup** (402 lines) — Raw HTML, no breakpoints
- **/admin/sales/frames/new** (267 lines) — Raw HTML, fixed widths
- **/admin/sales/extras/new** (649 lines) — Raw HTML, fixed widths
- **/client/new-quote** (3,170 lines) — Mixed but mostly raw, massive monolithic page
- **/client/wedding-day-form** (1,455 lines) — Raw HTML mega form
