# MILESTONES.md
**StudioFlow — Milestone Trigger Registry**
**Version:** 1.0
**Created:** April 25, 2026
**Last Verified:** April 25, 2026

---

## Rule #1

**NOTHING IS MANUAL.** Every milestone must be flipped by a database trigger — an action somewhere in the system that fires automatically. The only exception is m35 (Archived), which is intentionally blocked pending archive system completion.

---

## Coverage Summary

| Status | Count |
|--------|-------|
| ✅ Has working trigger | 14 |
| ❌ Missing trigger | 16 |
| 🚫 Intentionally manual | 1 (m06_declined) |
| 🗑️ Deleted (gap numbers) | 4 (m17, m18, m21, m23) |
| ⏸️ Blocked | 1 (m35 → blocks m36) |
| **Total milestones** | **36 columns** |

---

## Phase 1: Booking & Onboarding (m01–m05)

| # | Column | Name | Trigger | Table | Event | Status | Verified |
|---|--------|------|---------|-------|-------|--------|----------|
| m01 | `m01_lead_captured` | Lead Captured | `convert_quote_to_contract` | `client_quotes` | Quote → booked → seeds m01-m05 | ✅ | 2026-04-25 |
| m02 | `m02_consultation_booked` | Consultation Booked | `convert_quote_to_contract` | `client_quotes` | Same — seeded when couple created | ✅ | 2026-04-25 |
| m03 | `m03_consultation_done` | Consultation Done | `convert_quote_to_contract` | `client_quotes` | Same — quote exists = consultation happened | ✅ | 2026-04-25 |
| m04 | `m04_contract_signed` | Contract Signed | `convert_quote_to_contract` | `client_quotes` | Same — contract created = signed | ✅ | 2026-04-25 |
| m05 | `m05_deposit_received` | Deposit Received | `convert_quote_to_contract` + `fn_flip_m05_on_first_payment` | `client_quotes` + `payments` | Seeded on conversion + flips on first payment INSERT | ✅ | 2026-04-25 |

**Notes:** m01-m05 are all seeded together inside `convert_quote_to_contract()` when a quote is booked. For couples created manually (not through quote system), `trg_flip_m05_on_first_payment` handles m05 independently on first payment.

---

## Phase 2: Engagement (m06–m14)

| # | Column | Name | Trigger | Table | Event | Status | Verified |
|---|--------|------|---------|-------|-------|--------|----------|
| m06 | `m06_eng_session_shot` | Eng Session Shot | `flip_engagement_milestones` | `jobs` | engagement job status → `in_progress` | ✅ | 2026-04-25 |
| m06d | `m06_declined` | Eng Declined | None — intentional | — | Manual checkbox (couple's decision) | 🚫 | 2026-04-25 |
| m07 | `m07_eng_photos_edited` | Eng Photos Edited | `flip_engagement_milestones` | `jobs` | engagement job status → `completed` | ✅ | 2026-04-25 |
| m08 | `m08_eng_proofs_to_lab` | Eng Proofs to Lab | `flip_engagement_milestones` | `jobs` | engagement job status → `at_lab` | ✅ | 2026-04-25 |
| m09 | `m09_eng_prints_picked_up` | Eng Prints at Studio | `flip_engagement_milestones` | `jobs` | engagement job status → `at_studio` | ✅ | 2026-04-25 |
| m10 | `m10_frame_sale_quote` | Frame Sale Quoted | ❌ MISSING | `extras_orders` | Should fire on extras_orders INSERT for this couple | ❌ | 2026-04-25 |
| m11 | `m11_frame_sale_complete` | Frame Sale Complete | ❌ MISSING | `extras_orders` | Should fire on extras_orders.status → `signed` or `declined` | ❌ | 2026-04-25 |
| m12 | `m12_eng_order_to_lab` | Eng Order to Lab | ❌ MISSING | `jobs` | Should fire when engagement physical job → `at_lab` (separate from m08 which is proofs) | ❌ | 2026-04-25 |
| m13 | `m13_eng_items_framed` | Eng Items Framed | ❌ OPEN QUESTION | — | Is this still a real step? Needs Jean's clarification | ❌ | 2026-04-25 |
| m14 | `m14_eng_items_picked_up` | Eng Items Picked Up | `flip_engagement_milestones` | `jobs` | engagement job status → `picked_up` | ✅ | 2026-04-25 |

**Open Questions:**
- m08 vs m12: m08 fires when eng proofs go to lab. m12 should fire when eng physical orders (collage, frames) go to lab. Currently m12 has no trigger — needs one.
- m09 label mismatch: Client Journey displays "Eng Prints Picked Up" but trigger fires on `at_studio`. Should label be "Eng Prints at Studio"?
- m13: Is "Eng Items Framed" still a real production step? Jean sometimes frames items at the studio before client pickup.

---

## Phase 3: Pre-Wedding (m15–m16)

| # | Column | Name | Trigger | Table | Event | Status | Verified |
|---|--------|------|---------|-------|-------|--------|----------|
| m15 | `m15_day_form_approved` | Day Form Approved | `flip_m15_on_form_submit` + `update_milestone_on_day_form` | `wedding_day_forms` | INSERT (DUPLICATE — two triggers doing same thing) | ✅ ⚠️ | 2026-04-25 |
| m16 | `m16_staff_confirmed` | Staff Confirmed | ❌ MISSING | `crew_call_sheets` | Should fire when crew confirm email sent, or when all crew_call_sheet_members confirmed | ❌ | 2026-04-25 |

**Tech Debt:** m15 has two triggers doing the same thing (`flip_m15_on_form_submit` and `update_milestone_on_day_form`). One should be removed.

---

## Phase 4: Post-Wedding Production (m19–m32)

| # | Column | Name | Trigger | Table | Event | Status | Verified |
|---|--------|------|---------|-------|-------|--------|----------|
| m19 | `m19_wedding_day` | Wedding Day | ❌ MISSING | `couples` | Should fire when `wedding_date < CURRENT_DATE` — cron job or on first post-wedding job creation | ❌ | 2026-04-25 |
| m20 | `m20_files_backed_up` | Files Backed Up | ❌ MISSING | `jobs` | Should fire when PROD-WED-PROOFS job created (can't create proofs job without backup being done) | ❌ | 2026-04-25 |
| m22 | `m22_proofs_edited` | Proofs Edited | ❌ MISSING | `jobs` | Should fire when PROD-WED-PROOFS status → `completed` | ❌ | 2026-04-25 |
| m24 | `m24_photo_order_in` | Photo Order In | `on_wedding_job_created` → `trigger_m24_photo_order_in()` | `jobs` | Wedding non-proofs job INSERT | ✅ | 2026-04-25 |
| m25 | `m25_video_order_in` | Video Order In | `flip_m25_on_video_order` + `set_video_order_milestone` | `video_orders` | INSERT (DUPLICATE — two triggers) | ✅ ⚠️ | 2026-04-25 |
| m26 | `m26_photo_order_to_lab` | Photo Order to Lab | ❌ MISSING | `jobs` | Should fire when first wedding physical job → `at_lab` | ❌ | 2026-04-25 |
| m27 | `m27_video_long_form` | Video Long Form | ❌ MISSING | `video_jobs` | Should fire when longform video status → complete | ❌ | 2026-04-25 |
| m28 | `m28_recap_edited` | Recap Edited | ❌ MISSING | `video_jobs` | Should fire when recap video status → complete | ❌ | 2026-04-25 |
| m29 | `m29_lab_order_back` | Lab Order Back | ❌ MISSING | `jobs` | Should fire when first wedding physical job → `at_studio` | ❌ | 2026-04-25 |
| m30 | `m30_hires_on_usb` | Hi-Res on USB | ❌ MISSING | — | Digital delivery — what action triggers this? Needs definition | ❌ | 2026-04-25 |
| m31 | `m31_video_on_usb` | Video on USB | ❌ MISSING | — | Video delivery — what action triggers this? Needs definition | ❌ | 2026-04-25 |
| m32 | `m32_ready_at_studio` | Ready at Studio | ❌ MISSING | `jobs` | Should fire when ALL wedding physical jobs for couple → `at_studio` or better | ❌ | 2026-04-25 |

**Tech Debt:** m25 has two triggers doing the same thing. One should be removed.

**Tech Debt (m24):** Two orphaned functions exist — `flip_m24_on_photo_order` and `set_photo_order_milestone` — that reference `couple_milestones` but are NOT attached to any trigger. Only `trigger_m24_photo_order_in` (via trigger `on_wedding_job_created`) is active. The orphaned functions should be removed or consolidated.

**Open Questions:**
- m19: Should this be a daily cron that checks all couples where `wedding_date < CURRENT_DATE AND m19 = false`? Or should it fire when the first post-wedding job is created?
- m26/m29: Should these fire on FIRST item sent/received, or when ALL items are sent/received?
- m30/m31: "USB" may be outdated — digital delivery is now via Dropbox links. What system action means "hi-res photos delivered"?

---

## Phase 5: Delivery & Close (m33–m36)

| # | Column | Name | Trigger | Table | Event | Status | Verified |
|---|--------|------|---------|-------|-------|--------|----------|
| m33 | `m33_final_payment` | Final Payment | `check_and_flip_m33` | `payments` | INSERT/UPDATE/DELETE → checks `couple_financial_summary.balance_due ≤ 0` | ✅ | 2026-04-25 |
| m34 | `m34_items_picked_up` | Items Picked Up | ❌ MISSING | `jobs` | Should fire when ALL wedding jobs for couple → `picked_up` | ❌ | 2026-04-25 |
| m35 | `m35_archived` | Archived | ⏸️ BLOCKED | — | Intentionally on hold. Should fire from archive system when implemented | ⏸️ | 2026-04-25 |
| m36 | `m36_complete` | Complete | ❌ MISSING | `couple_milestones` | Should auto-fire when ALL other milestones (m01-m35) = true | ❌ | 2026-04-25 |

---

## Trigger Function Registry

| Function Name | Fires On | What It Does |
|---------------|---------|--------------|
| `convert_quote_to_contract` | `client_quotes` UPDATE (status → booked) | Creates couple, contract, installments. Seeds m01-m05. |
| `fn_flip_m05_on_first_payment` | `payments` INSERT | Flips m05 if not already true |
| `flip_engagement_milestones` | `jobs` UPDATE (engagement category) | Flips m06/m07/m08/m09/m14 based on status |
| `trigger_m24_photo_order_in` | `jobs` INSERT (wedding, non-proofs) | Flips m24 |
| `flip_m25_on_video_order` | `video_orders` INSERT | Flips m25 |
| `set_video_order_milestone` | `video_orders` INSERT | Flips m25 (DUPLICATE of above) |
| `flip_m15_on_form_submit` | `wedding_day_forms` INSERT | Flips m15 |
| `update_milestone_on_day_form` | `wedding_day_forms` INSERT | Flips m15 (DUPLICATE of above) |
| `check_and_flip_m33` | `payments` INSERT/UPDATE/DELETE | Checks balance_due, flips m33 if ≤ 0 |
| `flip_m24_on_photo_order` | ⚠️ NOT ATTACHED TO ANY TRIGGER | Orphaned — references couple_milestones but never fires. Remove or consolidate with `trigger_m24_photo_order_in`. |
| `set_photo_order_milestone` | ⚠️ NOT ATTACHED TO ANY TRIGGER | Orphaned — references couple_milestones but never fires. Remove or consolidate with `trigger_m24_photo_order_in`. |
| `fn_auto_complete_couple_on_proofs` | `jobs` INSERT/UPDATE | Flips couples.status → completed when PROD-WED-PROOFS exists and wedding_date passed |
| `fn_autofill_vendor_from_catalog` | `jobs` INSERT | Auto-fills vendor from product_catalog.default_vendor |
| `score_lead_on_insert` | `ballots` INSERT | Calculates lead score 0-300 |
| `update_lead_score_on_change` | `ballots` UPDATE | Recalculates lead score on field changes |
| `on_quote_status_change` | `client_quotes` UPDATE | Triggers convert_quote_to_contract when status → booked |

---

## Verification Process

To verify this document against the live database:

```sql
-- List all triggers
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name NOT LIKE 'RI_%'
ORDER BY event_object_table, trigger_name;

-- Check milestone coverage for a specific couple
SELECT * FROM couple_milestones
WHERE couple_id = '[couple_uuid]';
```

---

*Verified against production database `ntysfrgjwwcrtgustteb` on April 25, 2026.*
