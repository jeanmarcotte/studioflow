# PAGES.md
**StudioFlow — Page & Route Inventory**
**Version:** 1.0
**Created:** April 25, 2026
**Last Verified:** April 25, 2026

---

## Route Map

### Dashboard

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin` | Dashboard | couples, couple_milestones, couple_appointments, jobs, extras_orders, extras_installments | None (read-only) | None |

### Couples

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/couples` | Couples List | couples, couple_milestones, couple_appointments | None (read-only display) | None |
| `/admin/couples/[id]` | Client Detail / Journey | couples, contracts, couple_milestones, jobs, video_jobs, payments, extras_orders, wedding_assignments, crew_call_sheets, wedding_day_forms | couple_milestones (manual checkboxes — SHOULD NOT EXIST per Rule #1) | Various milestone flips if manual |

### Production

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/production/photo` | Photo Editing Dashboard | jobs, couples, product_catalog | jobs.status, jobs.photos_taken, jobs.edited_so_far, jobs.total_proofs | `flip_engagement_milestones` on status change |
| `/admin/production/video` | Video Editing Dashboard | video_jobs, couples | video_jobs.status, video_jobs segment checkboxes | None (no milestone triggers on video_jobs) |
| `/admin/production/editing/new` | Add Editing Job | couples, product_catalog, meeting_points | jobs (INSERT), client_orders (INSERT) | `trigger_m24_photo_order_in`, `trg_autofill_vendor`, `trg_auto_complete_couple_on_proofs` |
| `/admin/production/team-notes` | Team Notes | team_notes, couples | team_notes | None |
| `/admin/client/orders` | Client Orders | client_orders, jobs, couples | client_orders | None |
| `/admin/archive` | Archive | jobs (completed/picked_up) | None | None |

### Sales

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/sales/quotes` | Couple Quotes | client_quotes, ballots, sales_meetings | client_quotes.status | `on_quote_status_change` → `convert_quote_to_contract` |
| `/admin/sales/frames` | Frame & Album Sales | extras_orders, c2_line_items, extras_installments, couples | extras_orders, extras_installments | None |
| `/admin/sales/extras` | Extras Sales | c3_line_items, couples | c3_line_items | None |
| `/admin/sales/frames/new/[coupleId]` | C2 Sales Presentation | couples, contracts, product_catalog, extras_orders | extras_orders (INSERT), c2_line_items (INSERT), extras_installments (INSERT) | None |
| `/admin/sales/report` | Sales Report | extras_orders, contracts, couples, payments | None (read-only) | None |

### Documents & Contracts

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/documents` | Documents Hub | couples, contracts, extras_orders | None | None |
| `/admin/contracts/[id]/view` | C1 Contract View | contracts, couples | None (read-only, print) | None |
| `/admin/albums/[id]/view` | C2 Retro View | extras_orders, couples | None (read-only, print) | None |
| `/admin/extras/[coupleId]` | C3 Extras Form | c3_line_items, product_catalog, couples | c3_line_items | None |

### Finance

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/finance` | Finance Overview | payments, couple_financial_summary, contracts | None | None |

### Wedding Day

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/wedding-day/forms` | Wedding Day Forms | wedding_day_forms, couples | wedding_day_forms (INSERT) | `flip_m15_on_form_submit` |
| `/admin/wedding-day/crew` | Crew Call Sheets | crew_call_sheets, crew_call_sheet_members, team_members, couples, meeting_points | crew_call_sheets, crew_call_sheet_members | None (m16 has no trigger) |

### Portal

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/portal/[coupleId]` | Portal Admin Editor | couples (hero_image_url, collage fields, portal_video_url) | couples (portal fields) | None |
| `/portal/login` | Client Portal Login | — | Supabase Auth | None |
| `/portal/[slug]` | Client Portal Page | couples (via portal_slug) | couples.portal_view_count | None |

### BridalFlow

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/leads` | BridalFlow Lead List | ballots, lead_contacts, shows | ballots (INSERT on ballot submit) | `score_lead_on_insert` |

### Marketing & Settings

| Route | Page | Reads From | Writes To | Triggers |
|-------|------|-----------|----------|----------|
| `/admin/marketing/sigs` | SIGS Marketing | seo_* tables | seo_* tables | None |
| `/admin/marketing/jeanmarcotte` | JM Marketing | seo_* tables | seo_* tables | None |
| `/admin/settings` | Settings | settings | settings | None |

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
