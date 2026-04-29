# PAGES.md
**StudioFlow — Page & Route Inventory**
**Version:** 1.1
**Created:** April 25, 2026
**Last Verified:** April 25, 2026

---

## Route Summary

| Section | Route Prefix | Pages |
|---------|-------------|-------|
| Root / Auth | `/`, `/login` | 2 |
| Admin Dashboard | `/admin` | 2 |
| Couples | `/admin/couples` | 4 |
| Production | `/admin/production` | 7 |
| Sales | `/admin/sales` | 8 |
| Documents & Contracts | `/admin/documents`, `/admin/contracts`, `/admin/albums`, `/admin/extras` | 7 |
| Finance | `/admin/finance` | 5 |
| Wedding Day | `/admin/wedding-day` | 7 |
| Team | `/admin/team` | 5 |
| Reports | `/admin/reports` | 1 |
| Marketing & Settings | `/admin/marketing`, `/admin/settings` | 4 |
| Orders | `/admin/orders` | 2 |
| Portal (Admin + Client) | `/admin/portal`, `/portal` | 3 |
| Client Pages | `/admin/client`, `/admin/client-quotes`, `/admin/extras-quotes` | 5 |
| BridalFlow | `/leads` | 4 |
| Client-Facing Forms | `/client` | 9 |
| Crew Portal | `/crew` | 3 |
| Other | `/analytics`, `/ballot`, `/scanner`, `/test-quote` | 4 |
| Archives | `/admin/archives` | 2 |
| **Total** | | **85** |

---

## Route Map

### Root / Auth

| Route | Page |
|-------|------|
| `/` | Root landing / redirect |
| `/login` | Admin login |

### Admin Dashboard

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin` | Dashboard | couples, couple_milestones, couple_appointments, jobs, extras_orders, extras_installments | None (read-only) | None |
| `/admin/dashboard` | Dashboard (alternate route) | couples, couple_milestones | None | None |

### Couples

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/couples` | Couples List | couples, couple_milestones, couple_appointments | None (read-only display) | None |
| `/admin/couples/[id]` | Client Detail / Journey | couples, contracts, couple_milestones, jobs, video_jobs, payments, extras_orders, wedding_assignments, crew_call_sheets, wedding_day_forms | couple_milestones (manual checkboxes — SHOULD NOT EXIST per Rule #1) | Various milestone flips if manual |
| `/admin/couples/[id]/upload-contract` | Upload Contract | couples, contracts | contracts | None |
| `/admin/couples/[id]/upload-extras` | Upload Extras | couples, extras_orders | extras_orders | None |

#### `/admin/couples/[id]` — Couple Detail Page

##### MANDATORY INVOICE SECTIONS (NEVER REMOVE)

The couple detail page MUST always render these 3 invoice sections,
even if data is missing (show empty state):

| Q# | Invoice | Component | Data Source | Empty State |
|----|---------|-----------|-------------|-------------|
| Q10 | C1 Contract Package | ContractPackageCard | contracts (coverage / engagement / team / financials) + c1_line_items (joined to product_catalog) — single source for the Package Contents display | "No contract on file." / "Product details not yet mapped." |
| Q11 | C2 Frames & Albums | FramesAlbumsCard | extras_orders + c2_line_items (joined to product_catalog) | "No frames & albums sale recorded." / "No line items recorded." |
| Q09 | C3 Extras & Add-ons | ExtrasCard | client_extras + c3_line_items (joined to product_catalog) | "No extras or add-ons recorded." / "No line items recorded." |

CRITICAL: Q10 reads coverage/engagement/team/financials from `contracts`, but Package Contents
comes ONLY from `c1_line_items JOIN product_catalog` (the legacy `contracts` product manifest
columns — prints_*, video_*, web_*, post_production, *_album_* — are no longer rendered).
Q11 reads from `extras_orders`. Q09 reads from `client_extras`. NEVER swap these data sources.

These sections are NEVER conditionally hidden. If data is absent,
render the card with an empty state message.

Render order on the page: Q08 → Q09 → Q10 → Q11 → Q12 → Q13.

##### DATA CONTRACT (WO-982)

`src/app/admin/couples/[id]/page.tsx` is the SINGLE data loader for the couple
detail page. All formatting and invoice-existence checks flow DOWN through props
from a single computation; no component re-fetches or re-formats on its own.

- **`src/lib/coupleFormatters.ts`** — every component on the couple page imports
  formatters (`formatPackageType`, `formatHoursDisplay`, `formatTotalHoursOnly`,
  `formatCurrency`, `formatCoupleName`, `parseTime`, `calculateTotalHours`)
  from here. Components MUST NOT define their own currency / hours / package-type
  formatters.
- **`src/lib/couplePageData.ts`** — exports `buildInvoiceSummaries(contract,
  extrasOrder, clientExtras, coupleId, c3LineItems?)` returning a
  `CoupleInvoices` object with `c1`, `c2`, `c3` summaries (`exists`, `id`,
  `total`, `status`, `label`, `viewUrl`). Every component that needs to know
  whether C1/C2/C3 exists or what its headline total is reads from this object.
  C3 total includes both `client_extras.total` and `c3_line_items.total` so the
  ExtrasCard header is correct even when only line items have been entered.
- The Info Grid Coverage section uses `formatHoursDisplay` (long form, e.g.
  "10:30 – 22:30 (12 hrs)"). The C1 ContractPackageCard uses
  `formatTotalHoursOnly` (short form, e.g. "12 hours"). Both come from the same
  `contracts.start_time` / `contracts.end_time` fields — the page computes both
  strings and passes them down.

### Production

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/production/photo` | Photo Editing Dashboard | jobs, couples, product_catalog | jobs.status, jobs.photos_taken, jobs.edited_so_far, jobs.total_proofs | `flip_engagement_milestones` on status change |
| `/admin/production/video` | Video Editing Dashboard | video_jobs, couples | video_jobs.status, video_jobs segment checkboxes | None (no milestone triggers on video_jobs) |
| `/admin/production/editing/new` | Add Editing Job | couples, product_catalog, meeting_points | jobs (INSERT), client_orders (INSERT) | `on_wedding_job_created`, `trg_autofill_vendor`, `trg_auto_complete_couple_on_proofs` |
| `/admin/production/equipment` | Equipment Management | equipment-related tables | — | None |
| `/admin/production/report` | Production Report | jobs, video_jobs, couples | None (read-only) | None |
| `/admin/production/couples/[id]` | Couple Production Hub | couples, contracts, couple_milestones, jobs, video_jobs, job_checklist_items, communication_log | jobs.status, video_jobs.status + sections, communication_log (INSERT), job_checklist_items (CRUD) | All milestone triggers on status change |
| `/admin/production/archive` | Archive Dashboard | jobs (completed/picked_up), archive tables | None | None |
| `/admin/production/archive/backup` | Archive Backup | archive_drives, drive_contents | archive_drives | None |
| `/admin/production/archive/drive/[driveNumber]` | Drive Detail | drive_contents, archive_drives | None | None |

### Sales

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/sales/quotes` | Couple Quotes | client_quotes, ballots, sales_meetings | client_quotes.status | `on_quote_status_change` → `convert_quote_to_contract` |
| `/admin/sales/frames` | Frame & Album Sales | extras_orders, c2_line_items, extras_installments, couples | extras_orders, extras_installments | None |
| `/admin/sales/frames/new` | C2 Couple Picker | couples, extras_orders | None | None |
| `/admin/sales/frames/new/[coupleId]` | C2 Sales Presentation | couples, contracts, product_catalog, extras_orders | extras_orders (INSERT), c2_line_items (INSERT), extras_installments (INSERT) | None |
| `/admin/sales/extras` | Extras Sales | c3_line_items, couples | c3_line_items | None |
| `/admin/sales/extras/new` | New Extras Sale | couples, product_catalog | c3_line_items (INSERT) | None |
| `/admin/sales/revenue` | Revenue Dashboard | payments, contracts, extras_orders | None (read-only) | None |
| `/admin/sales/report` | Sales Report | extras_orders, contracts, couples, payments | None (read-only) | None |
| `/admin/sales/show-results` | Bridal Show Results | bridal_show_results, shows, ballots | None (read-only) | None |

### Documents & Contracts

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/documents` | Documents Hub | couples, contracts, extras_orders | None | None |
| `/admin/documents/photo-order/[id]` | Photo Order Document | photo_orders, couples | None (read-only, print) | None |
| `/admin/documents/video-order/[id]` | Video Order Document | video_orders, couples | None (read-only, print) | None |
| `/admin/documents/wedding-day-form/[id]` | Wedding Day Form Document | wedding_day_forms, couples | None (read-only, print) | None |
| `/admin/contracts/[id]/view` | C1 Contract View | contracts, couples | None (read-only, print) | None |
| `/admin/contracts/generate` | Contract Generator | couples, contracts | contracts (INSERT) | None |
| `/admin/albums/[id]/view` | C2 Retro View | extras_orders, couples | None (read-only, print) | None |
| `/admin/extras/[id]/view` | C3 Extras View | c3_line_items, product_catalog, couples | None (read-only, print) | None |

### Archives

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/archives` | Archive Dashboard | couple_archives | None (read-only) | None |
| `/admin/archives/[coupleId]` | Couple Archive Detail | couple_archives, couples | couple_archives (UPDATE — locations, sizes, status, notes, distribution) | None |

### Finance

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/finance` | Finance Overview | payments, couple_financial_summary, contracts | None | None |
| `/admin/finance/income` | Income Tracking | payments, contracts, couples | payments | `trg_flip_m05_on_first_payment`, `trg_check_m33_on_payment` |
| `/admin/finance/expenses` | Expense Tracking | expenses-related tables | expenses | None |
| `/admin/finance/reconciliation` | Reconciliation | payments, contracts | payments | None |
| `/admin/finance/tax` | Tax Reports | payments, expenses | None (read-only) | None |

### Wedding Day

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/wedding-day/forms` | Wedding Day Forms | wedding_day_forms, couples | wedding_day_forms (INSERT) | `trg_flip_m15_on_form`, `trigger_day_form_milestone` |
| `/admin/wedding-day/forms/[id]/print` | Wedding Day Form Print | wedding_day_forms, couples | None (read-only, print) | None |
| `/admin/wedding-day/crew-confirm` | Crew Confirmation | crew_call_sheets, crew_call_sheet_members, team_members, couples, meeting_points | crew_call_sheets, crew_call_sheet_members (via `/api/admin/crew-call-sheet` server route on Send only — page itself is read-only; loadSavedCrew dedupes by team_member_id, preferring rows with call_time set) | `trg_flip_m16_on_crew_call` (on INSERT into `crew_call_sheets`) |
| `/admin/wedding-day/checklist` | Wedding Day Checklist | couples, wedding_day_forms | — | None |
| `/admin/wedding-day/coordination` | Day-of Coordination | couples, wedding_assignments | — | None |
| `/admin/wedding-day/equipment` | Equipment Prep | — | — | None |
| `/admin/wedding-day/packing` | Packing Lists | — | — | None |

### Team

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/team/members` | Team Members | team_members | team_members | None |
| `/admin/team/notes` | Team Notes | team_notes, couples | team_notes | None |
| `/admin/team/payments` | Team Payments | team_members, payments | payments | None |
| `/admin/team/schedule` | Team Schedule | wedding_assignments, couples, team_members | wedding_assignments | None |
| `/admin/team/training` | Training Resources | — | — | None |

### Reports

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/reports` | Reports Dashboard | couples, contracts, payments, extras_orders, ballots, jobs | None (read-only, CSV export) | None |

### Orders

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/orders` | Orders List | client_orders, jobs, couples | client_orders | None |
| `/admin/orders/[orderId]/view` | Order Detail | client_orders, jobs | None (read-only) | None |

### Portal (Admin + Client)

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/portal` | Portal Admin List | couples (portal fields, hero_image_url, wedding_year), contracts (inner join) | None | None |
| `/admin/portal/[coupleId]` | Portal Admin Editor | couples (hero_image_url, collage fields, portal_video_url, email, invite/login timestamps) | couples (portal fields, portal_invite_sent_at) | None |
| `/portal/login` | Client Portal Login | — | Supabase Auth | None |
| `/portal/[slug]` | Client Portal Home | couples, contracts, extras_orders, extras_installments (via portal_slug) | None | None |
| `/portal/[slug]/wedding-day` | Wedding Day Planner | wedding_day_forms, couples | wedding_day_forms (upsert) | `trg_flip_m15_on_form` |
| `/portal/[slug]/payments` | Financial Vault | contracts, extras_orders, c3_line_items, payments, extras_installments | None (read-only) | None |
| `/portal/share/[token]` | Public Share Page | couples (via share_token, share_enabled) | couples.share_view_count | None |

### Client Admin Pages

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/client-quotes` | Client Quotes Admin | client_quotes, couples | client_quotes | None |
| `/admin/client/communication` | Client Communication | couples | — | None |
| `/admin/client/extras-sales` | Client Extras Sales | extras_orders, couples | — | None |
| `/admin/client/new-quote` | New Quote (Admin) | couples, product_catalog | client_quotes (INSERT) | None |
| `/admin/extras-quotes` | Extras Quotes | client_extras, couples | — | None |

### Marketing & Settings

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/marketing/sigs` | SIGS Marketing | seo_* tables | seo_* tables | None |
| `/admin/marketing/sigs-seo` | SIGS SEO Dashboard | seo_* tables | seo_* tables | None |
| `/admin/marketing/jeanmarcotte` | JM Marketing | seo_* tables | seo_* tables | None |
| `/admin/settings` | Settings | settings | settings | None |

### BridalFlow

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/leads` | BridalFlow Lead List | ballots, lead_contacts, shows, lead_sources | ballots (INSERT with lead_source_id auto-set from active filter) | `trigger_score_lead_on_insert` — defaults to most recent lead source, excludes appt/booked/quoted from main grid |
| `/leads/[id]/compose` | Lead Email Compose | ballots, lead_contacts | — | None |
| `/leads/analytics` | Lead Analytics | ballots, shows | None (read-only) | None |
| `/leads/settings` | BridalFlow Script Editor | message_templates, chase_templates | message_templates, chase_templates | None |

### Client-Facing Forms

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/client/new-quote` | Quote Builder | product_catalog | client_quotes (INSERT) | None |
| `/client/photo-order` | Photo Order Form (auth) | couples, product_catalog | photo_orders (INSERT) | None |
| `/client/photo-order-public` | Photo Order Form (public) | product_catalog | photo_orders (INSERT) | None |
| `/client/video-order` | Video Order Form (auth) | couples | video_orders (INSERT) | `trg_flip_m25_on_video_order`, `video_order_submitted_trigger` |
| `/client/video-order-public` | Video Order Form (public) | — | video_orders (INSERT) | `trg_flip_m25_on_video_order`, `video_order_submitted_trigger` |
| `/client/wedding-day-form` | Wedding Day Form (lookup) | couples | — | None |
| `/client/wedding-day-form/[coupleId]` | Wedding Day Form (fill) | couples, contracts | wedding_day_forms (INSERT) | `trg_flip_m15_on_form`, `trigger_day_form_milestone` |
| `/client/extras-quote` | Extras Quote (client) | product_catalog | client_extras | None |
| `/client/extras` | Client Extras List | client_extras | — | None |
| `/client/extras/new` | New Extras Request | product_catalog | client_extras (INSERT) | None |
| `/client/extras/[id]` | Extras Detail | client_extras | — | None |

### Crew Portal

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/crew/login` | Crew Login | — | crew auth cookies | None |
| `/crew/dashboard` | Crew Dashboard | wedding_assignments, couples, contracts, team_members | None (read-only) | None |
| `/crew/wedding/[coupleId]` | Crew Wedding Detail | couples, contracts, wedding_assignments, crew_call_sheets, meeting_points | None (read-only) | None |

### Other

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/analytics` | Analytics Dashboard | couples, payments, jobs | None (read-only) | None |
| `/ballot` | Ballot Form (BridalFlow public) | shows | ballots (INSERT) | `trigger_score_lead_on_insert` |
| `/scanner` | QR Scanner | — | — | None |
| `/test-quote` | Quote Test Page | product_catalog | — | None |

---

## Pages That Are BROKEN

| Route | Issue | WO# |
|-------|-------|------|
| `/admin/production/editing/new` | Page crashes / broken | WO-890 |

---

## Pages That Are Desktop-Only (Intentional)

| Route | Reason |
|-------|--------|
| `/admin/contracts/[id]/view` | Print/presentation — shows "Open on Desktop" on mobile |
| `/admin/albums/[id]/view` | Print/presentation |
| `/admin/extras/[id]/view` | Print/presentation |
| `/admin/sales/frames/new/[coupleId]` | C2 sales presentation — client-facing on large screen |

---

*Verified against codebase on April 25, 2026.*
