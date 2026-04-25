# TECH-DEBT.md
**StudioFlow — Technical Debt Registry**
**Version:** 1.0
**Created:** April 25, 2026
**Last Verified:** April 25, 2026

---

## Critical

| # | Issue | Impact | Planned Fix |
|---|-------|--------|-------------|
| 1 | **16 milestones have no trigger** | Client Journey shows incomplete data. Couples who've had their wedding show 55% progress when they should show 80%+. | Project 2 — build triggers for m10-m36 |
| 2 | **`extras_orders.items` JSONB is template garbage** | Cannot use for production decisions. Reconciliation requires uploading C2 PDFs and reading Page 1. | Upload C2 PDFs, read, map to product codes |
| 3 | **`video_jobs` and `jobs` are separate tables** | Photo production and video production use different tables with different schemas. Makes unified Couple Production Hub harder. | Long-term: unify under `jobs` table |
| 4 | **Add Editing Job page broken** | `/admin/production/editing/new` crashes. Cannot create new jobs. | WO-890 |

---

## High

| # | Issue | Impact | Planned Fix |
|---|-------|--------|-------------|
| 5 | **Duplicate triggers on m15** | Two triggers (`trg_flip_m15_on_form`, `trigger_day_form_milestone`) both flip m15. No current harm but messy. | Remove one |
| 6 | **Duplicate triggers on m25** | Two triggers (`trg_flip_m25_on_video_order`, `video_order_submitted_trigger`) both flip m25. | Remove one |
| 7 | **No auth on admin routes** | Any URL is accessible without login. Internal tool, but risky. | Add Supabase Auth for admin |
| 8 | **`client_orders` table has 0 rows** | Table built but never populated. Add Editing Job form doesn't use it. | Wire into production workflow |
| 9 | **m09 label mismatch** | Client Journey shows "Eng Prints Picked Up" but trigger fires on `at_studio`. | Fix label or fix trigger |
| 10 | **No system capture of client communication** | Emails, texts, approval — all live in Jean's phone/inbox. No record in StudioFlow. | Couple Production Hub — communication log |

---

## Medium

| # | Issue | Impact | Planned Fix |
|---|-------|--------|-------------|
| 11 | **Production pages are both dashboard and workspace** | Jean edits data on the same page that shows management overview. Conflates two purposes. | Split: production pages = dashboard, Hub = workspace |
| 12 | **Video revision cycle has no tracking** | Fazana has a list of edits — nowhere to put them in the system. | Couple Production Hub — communication log |
| 13 | **Pixieset / Dropbox links not stored** | Gallery URLs, proof delivery links — not in Supabase. | Add `gallery_url` and `proofs_url` fields to jobs or couples |
| 14 | **Vendor submission dates not tracked** | No record of when items were sent to CCI/UAF/Best Canvas. | Add `submitted_to_lab_date` to jobs table |
| 15 | **No weekly production email for Marianna** | She relies on paper system for vendor pickups. | Build automated email via Resend cron |
| 16 | **Portal auth (WO-710) never verified** | Magic link login shipped but end-to-end test never happened. | Test and verify |

---

## Low

| # | Issue | Impact | Planned Fix |
|---|-------|--------|-------------|
| 17 | **Mobile audit incomplete** | 18 WOs shipped April 23-24, not all verified on device. | Spot-check on phone |
| 18 | **`couples.status = 'completed'` was set manually for some couples** | Should only be set via auto-trigger. Some may be incorrect. | Audit and fix |
| 19 | **`active` status in extras_orders** | Deprecated but may still exist in old records. | Migrate to `pending` or `signed` |
| 20 | **Backblaze B2 not set up** | P14 — replacing Dropbox for offsite backup. Storage decision pending. | Spencer review required |

---

## Resolution Log

| Date | Issue # | Resolution |
|------|---------|------------|
| 2026-04-25 | — | m01-m05 triggers built (convert_quote_to_contract + payment trigger) |
| 2026-04-25 | — | `trg_auto_complete_couple_on_proofs` trigger built |
| 2026-04-25 | — | `trg_autofill_vendor` trigger built (canvas → Best Canvas) |
| 2026-04-25 | — | Carmela & James manually flipped to completed |

---

*Verified April 25, 2026.*
