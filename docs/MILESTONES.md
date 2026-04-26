# MILESTONES.md
**StudioFlow — Milestone Trigger Registry**
**Version:** 2.0
**Created:** April 25, 2026
**Last Verified:** April 25, 2026

---

## Rule #1

**NOTHING IS MANUAL.** Every milestone must be flipped by a database trigger — an action somewhere in the system that fires automatically. The only exception is m35 (Archived), which is intentionally blocked pending archive system completion.

---

## Rule #2

**EVERY MILESTONE HAS CONSEQUENCES.** Before building any trigger, the milestone must define:
1. What it is (definition)
2. What fires it (trigger spec)
3. What happens when it flips (UI changes, unlocks, dependencies)
4. How to verify it (acceptance criteria with test query)

If any of these four are missing, the trigger is not ready to build.

---

## Coverage Summary

| Status | Count |
|--------|-------|
| ✅ Has working trigger | 16 |
| ❌ Missing trigger | 14 |
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

**Consequences (m01-m05):** Couple enters the system. Dashboard shows new booking. Contract installments created. Client Journey begins at Phase 1 complete. Unlocks engagement and pre-wedding phases.

**Acceptance (m01-m05):** Tested via quote conversion flow. All 5 milestones seeded atomically.

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
| m10 | `m10_frame_sale_quote` | Frame Sale Quoted | `trg_flip_m10_on_extras_insert` → `fn_flip_m10_on_extras_insert()` | `extras_orders` | AFTER INSERT | ✅ | 2026-04-25 |
| m11 | `m11_frame_sale_complete` | Frame Sale Complete | `trg_flip_m11_on_extras_status` → `fn_flip_m11_on_extras_status()` | `extras_orders` | AFTER UPDATE status → signed/declined | ✅ | 2026-04-25 |
| m12 | `m12_eng_order_to_lab` | Eng Order to Lab | ❌ MISSING (WO-893) | `jobs` | engagement non-proofs job status → `at_lab` | ❌ | 2026-04-25 |
| m13 | `m13_eng_items_framed` | Eng Items Framed | ❌ PENDING (WO-893) | `jobs` | Auto-flip with m09 — same trigger, one extra line | ❌ | 2026-04-25 |
| m14 | `m14_eng_items_picked_up` | Eng Items Picked Up | `flip_engagement_milestones` | `jobs` | engagement job status → `picked_up` | ✅ | 2026-04-25 |

**Consequences:**
- **m06:** Client Detail shows "Engagement Session: Shot." Production dashboard shows job in progress.
- **m07:** Client Detail shows "Engagement Photos: Edited." Proofs ready for lab submission.
- **m08:** Client Detail shows "Eng Proofs: At Lab." Lab tracking list shows active item.
- **m09:** Client Detail shows "Eng Prints: At Studio." Precursor to m14 (pickup). Also flips m13 (items are already framed when they arrive at studio).
- **m10:** Dashboard Engagement Pipeline moves couple from "Needs Quote" to "Quoted." Client Detail shows Frame Sale checkmark. "Shot but not quoted" action alert disappears. Unlocks m11.
- **m11:** Couple exits C2 sales pipeline. If signed: installment tracking activates, production expects physical items. If declined/no_sale: no more follow-up alerts. Client Detail shows final status badge.
- **m12:** Client Detail shows "Eng Physical Items: At Lab." Production page shows item in lab tracking list.
- **m13:** Client Detail shows framing complete. Precursor to m14 (pickup). **DECISION:** Auto-flip with m09 — when engagement items arrive at studio, they're already framed.
- **m14:** Engagement complete. Client Detail shows "Eng Items: Picked Up."

**Acceptance:**
- **m10:** INSERT into extras_orders for Test & Verify couple. Query couple_milestones — m10 = true.
- **m11:** UPDATE Test & Verify extras_order status to 'signed'. Query milestones — m11 = true.
- **m12:** Create engagement job (type ENG_COLLAGE) for Test & Verify, update status to 'at_lab'. Query milestones — m12 = true. Trigger: ON UPDATE of `jobs` WHERE `category = 'engagement' AND job_type NOT LIKE '%PROOFS%' AND NEW.status = 'at_lab'`.
- **m13:** Update engagement job for Test & Verify to 'at_studio'. Query milestones — both m09 AND m13 = true.

**Open Questions:**
- m08 vs m12: m08 fires when eng proofs go to lab. m12 should fire when eng physical orders (collage, frames) go to lab. Currently m12 has no trigger — needs one (WO-893).
- m09 label mismatch: Client Journey displays "Eng Prints Picked Up" but trigger fires on `at_studio`. Should label be "Eng Prints at Studio"?

---

## Phase 3: Pre-Wedding (m15–m16)

| # | Column | Name | Trigger | Table | Event | Status | Verified |
|---|--------|------|---------|-------|-------|--------|----------|
| m15 | `m15_day_form_approved` | Day Form Approved | `trg_flip_m15_on_form` → `flip_m15_on_form_submit()` | `wedding_day_forms` | INSERT | ✅ | 2026-04-25 |
| m16 | `m16_staff_confirmed` | Staff Confirmed | ❌ MISSING (WO-894) | `crew_call_sheets` | ON INSERT WHERE `couple_id = NEW.couple_id` | ❌ | 2026-04-25 |

**Consequences:**
- **m15:** Wedding Day Form received. Dashboard "Week Ahead" shows form status. Client Detail shows Day Form checkmark. Crew call sheet can be generated.
- **m16:** Dashboard "Week Ahead" stops showing "Needs Crew" warning. Client Detail Crew section shows green checkmark. Crew Portal shows wedding on crew dashboards.

**Acceptance:**
- **m16:** INSERT crew_call_sheet for Test & Verify. Query milestones — m16 = true.

**Resolved:** m15 duplicate trigger (`trigger_day_form_milestone` / `update_milestone_on_day_form`) removed April 25, 2026.

---

## Phase 4: Post-Wedding Production (m19–m32)

| # | Column | Name | Trigger | Table | Event | Status | Verified |
|---|--------|------|---------|-------|-------|--------|----------|
| m19 | `m19_wedding_day` | Wedding Day | ❌ MISSING (WO-895) | `couples` | Supabase Edge Function cron, daily 00:01 America/Toronto | ❌ | 2026-04-25 |
| m20 | `m20_files_backed_up` | Files Backed Up | ❌ MISSING (WO-896) | `jobs` | ON INSERT WHERE `category = 'wedding' AND job_type IN ('WED_PROOFS', 'wedding_proofs')` | ❌ | 2026-04-25 |
| m22 | `m22_proofs_edited` | Proofs Edited | ❌ MISSING (WO-896) | `jobs` | ON UPDATE WHERE `category = 'wedding' AND job_type IN ('WED_PROOFS', 'wedding_proofs') AND NEW.status = 'completed'` | ❌ | 2026-04-25 |
| m24 | `m24_photo_order_in` | Photo Order In | `on_wedding_job_created` → `trigger_m24_photo_order_in()` | `jobs` | Wedding non-proofs job INSERT | ✅ | 2026-04-25 |
| m25 | `m25_video_order_in` | Video Order In | `trg_flip_m25_on_video_order` → `flip_m25_on_video_order()` | `video_orders` | INSERT | ✅ | 2026-04-25 |
| m26 | `m26_photo_order_to_lab` | Photo Order to Lab | ❌ MISSING (WO-897) | `jobs` | ON UPDATE WHERE `category = 'wedding' AND job_type NOT LIKE '%PROOFS%' AND NEW.status = 'at_lab'` | ❌ | 2026-04-25 |
| m27 | `m27_video_long_form` | Video Long Form | ❌ MISSING (WO-898) | `video_jobs` | ON UPDATE WHERE `job_type = 'FULL' AND NEW.status = 'complete'` | ❌ | 2026-04-25 |
| m28 | `m28_recap_edited` | Recap Edited | ❌ MISSING (WO-898) | `video_jobs` | ON UPDATE WHERE `job_type = 'RECAP' AND NEW.status = 'complete'` | ❌ | 2026-04-25 |
| m29 | `m29_lab_order_back` | Lab Order Back | ❌ MISSING (WO-897) | `jobs` | ON UPDATE WHERE `category = 'wedding' AND job_type NOT LIKE '%PROOFS%' AND NEW.status = 'at_studio'` | ❌ | 2026-04-25 |
| m30 | `m30_hires_on_usb` | Hi-Res Delivered | ❌ MISSING (WO-899) | `jobs` | Same trigger as m34 — fires when ALL wedding jobs for couple have status = 'picked_up' | ❌ | 2026-04-25 |
| m31 | `m31_video_on_usb` | Video Delivered | ❌ MISSING (WO-899) | `jobs` | Same trigger as m34 — fires when ALL wedding jobs for couple have status = 'picked_up' | ❌ | 2026-04-25 |
| m32 | `m32_ready_at_studio` | Ready at Studio | ❌ MISSING (WO-897) | `jobs` | ON UPDATE → CHECK all wedding non-proofs jobs for couple have status IN ('at_studio', 'picked_up', 'completed'). If yes, flip m32. | ❌ | 2026-04-25 |

**Consequences:**
- **m19:** Couple enters post-wedding phase. Pre-wedding milestones stop mattering. Production workflow begins. Dashboard shows couple in post-wedding pipeline. **DECISION:** Supabase Edge Function cron, daily at 00:01 America/Toronto.
- **m20:** Safety net confirmed. Editing can begin. Precursor to m22 (proofs edited). **DECISION:** Auto-flip when WED_PROOFS/wedding_proofs job is created. If proofs job exists, backup happened.
- **m22:** Dashboard Production Floor moves couple from "Editing" to "Proofs Ready." Client Detail shows proofs complete. Unlocks photo ordering phase and couple portal proofs gallery. Key metric: 7-day editing turnaround.
- **m24:** Photo production begins. Dashboard shows couple in production pipeline.
- **m25:** Video order received. Video production tracking begins.
- **m26:** Dashboard Production Floor shows couple in "At Lab" phase. Lab tracking list shows active item. Fires on FIRST item only.
- **m27:** Video production tracking shows longform done. Client Detail Video section shows "Long Form." Unlocks m31 pathway. Directly tied to eliminating video work.
- **m28:** Video production tracking shows recap done. Client Detail Video section shows "Recap." Combined with m27, both must be true before video delivery.
- **m29:** Dashboard Production Floor shows couple in "Back from Lab" phase. Fires on FIRST item back. Precursor to m32.
- **m30:** Photo delivery complete. Digital files delivered with physical pickup. **DECISION:** Fires when ALL wedding jobs for couple have status = 'picked_up'. Same event as m34.
- **m31:** Video delivery complete. **DECISION:** Same trigger as m30/m34 — all jobs picked_up.
- **m32:** Dashboard shows couple in "Ready for Pickup" state. Action Alert fires: "Call couple — everything is ready." Client Detail shows "Ready at Studio" banner. Unlocks m34.

**Acceptance:**
- **m19:** Set Test & Verify wedding_date to yesterday. Run cron function manually. Query milestones — m19 = true. Reset wedding_date to 2099-12-31 after test.
- **m20:** INSERT a WED_PROOFS job for Test & Verify. Query milestones — m20 = true.
- **m22:** UPDATE Test & Verify WED_PROOFS job to status 'completed'. Query milestones — m22 = true.
- **m26:** Create WED_ALBUM job for Test & Verify, update to 'at_lab'. Query milestones — m26 = true.
- **m27:** Create FULL video_job for Test & Verify, update to 'complete'. Query milestones — m27 = true.
- **m28:** Create RECAP video_job for Test & Verify, update to 'complete'. Query milestones — m28 = true.
- **m29:** UPDATE Test & Verify WED_ALBUM job to 'at_studio'. Query milestones — m29 = true.
- **m30:** Set ALL wedding jobs for Test & Verify to 'picked_up'. Query milestones — m30 = true.
- **m31:** Same as m30 — all wedding jobs picked_up. Query milestones — m31 = true.
- **m32:** Set ALL wedding non-proofs jobs for Test & Verify to 'at_studio'. Query milestones — m32 = true.

**Open Questions:**
- m26/m29: Fires on FIRST item sent/received (resolved).

**Resolved:** m25 duplicate trigger (`video_order_submitted_trigger` / `set_video_order_milestone`) removed April 25, 2026.

**Resolved (m24):** Orphaned functions `flip_m24_on_photo_order` and `set_photo_order_milestone` dropped April 25, 2026. Only `trigger_m24_photo_order_in` (via trigger `on_wedding_job_created`) remains active.

---

## Phase 5: Delivery & Close (m33–m36)

| # | Column | Name | Trigger | Table | Event | Status | Verified |
|---|--------|------|---------|-------|-------|--------|----------|
| m33 | `m33_final_payment` | Final Payment | `check_and_flip_m33` | `payments` | INSERT/UPDATE/DELETE → checks `couple_financial_summary.balance_due <= 0` | ✅ | 2026-04-25 |
| m34 | `m34_items_picked_up` | Items Picked Up | ❌ MISSING (WO-899) | `jobs` | ON UPDATE → CHECK all wedding non-proofs jobs for couple have status = 'picked_up'. If yes, flip m34 + m30 + m31. | ❌ | 2026-04-25 |
| m35 | `m35_archived` | Archived | ⏸️ BLOCKED | — | Intentionally on hold. Should fire from archive system when implemented | ⏸️ | 2026-04-25 |
| m36 | `m36_complete` | Complete | ❌ MISSING (WO-900) | `couple_milestones` | ON UPDATE → CHECK all m01-m35 = true. If yes, flip m36 and UPDATE couples.status = 'completed'. | ❌ | 2026-04-25 |

**Consequences:**
- **m33:** Final payment received. Finance dashboard shows couple fully paid. No more payment alerts. Couple can still be in production (physical items not yet delivered).
- **m34:** Couple exits production pipeline. Client Detail shows "All Items Picked Up." Also flips m30 and m31. Unlocks m36 pathway.
- **m35:** Couple's raw files archived to external storage. Precursor to m36.
- **m36:** Couple disappears from ALL active dashboards. Moves to archive/completed view. `couples.status` auto-changes to 'completed'. Financial records locked. The "done done" moment.

**Acceptance:**
- **m34:** Set ALL wedding jobs for Test & Verify to 'picked_up'. Query milestones — m34, m30, m31 all = true.
- **m36:** Set ALL m01-m35 to true for Test & Verify. Query milestones — m36 = true. Query couples — status = 'completed'.

---

## Trigger Function Registry

| Function Name | Fires On | What It Does |
|---------------|---------|--------------|
| `convert_quote_to_contract` | `client_quotes` UPDATE (status → booked) | Creates couple, contract, installments. Seeds m01-m05. |
| `fn_flip_m05_on_first_payment` | `payments` INSERT | Flips m05 if not already true |
| `flip_engagement_milestones` | `jobs` UPDATE (engagement category) | Flips m06/m07/m08/m09/m13/m14 based on status |
| `trigger_m24_photo_order_in` | `jobs` INSERT (wedding, non-proofs) | Flips m24 |
| `flip_m25_on_video_order` | `video_orders` INSERT | Flips m25 |
| `fn_flip_m10_on_extras_insert` | `extras_orders` INSERT | Flips m10 |
| `fn_flip_m11_on_extras_status` | `extras_orders` UPDATE (status → signed/declined) | Flips m11 |
| `flip_m15_on_form_submit` | `wedding_day_forms` INSERT | Flips m15 |
| `check_and_flip_m33` | `payments` INSERT/UPDATE/DELETE | Checks balance_due, flips m33 if <= 0 |
| `fn_auto_complete_couple_on_proofs` | `jobs` INSERT/UPDATE | Flips couples.status → completed when PROD-WED-PROOFS exists and wedding_date passed |
| `fn_autofill_vendor_from_catalog` | `jobs` INSERT | Auto-fills vendor from product_catalog.default_vendor |
| `score_lead_on_insert` | `ballots` INSERT | Calculates lead score 0-300 |
| `update_lead_score_on_change` | `ballots` UPDATE | Recalculates lead score on field changes |
| `on_quote_status_change` | `client_quotes` UPDATE | Triggers convert_quote_to_contract when status → booked |

## Triggers To Build

| WO | Milestones | Table | Trigger Spec |
|----|-----------|-------|-------------|
| ~~WO-892~~ | ~~m10, m11~~ | ~~`extras_orders`~~ | ✅ DONE — triggers built + backfilled April 25, 2026 |
| WO-893 | m12, m13 | `jobs` | m12: engagement non-proofs → at_lab. m13: add line to `flip_engagement_milestones` to auto-flip with m09 |
| WO-894 | m16 | `crew_call_sheets` | INSERT flips m16 |
| WO-895 | m19 | Edge Function cron | Daily 00:01 Toronto — flip m19 for couples where wedding_date < CURRENT_DATE |
| WO-896 | m20, m22 | `jobs` | m20: INSERT WED_PROOFS job flips m20. m22: UPDATE WED_PROOFS → completed flips m22 |
| WO-897 | m26, m29, m32 | `jobs` | m26: first wedding non-proofs → at_lab. m29: first → at_studio. m32: ALL non-proofs → at_studio+ |
| WO-898 | m27, m28 | `video_jobs` | m27: FULL → complete. m28: RECAP → complete |
| WO-899 | m30, m31, m34 | `jobs` | ALL wedding non-proofs jobs → picked_up flips m34 + m30 + m31 |
| WO-900 | m36 | `couple_milestones` | ALL m01-m35 = true → flip m36, set couples.status = 'completed' |

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

## Test Couple

A dedicated couple named **"Test & Verify"** exists in the database for trigger verification.

- **Wedding date:** 2099-12-31 (never conflicts with real weddings)
- **Status:** booked
- **Phone:** 000-000-0000
- **Purpose:** Every new trigger is tested against this couple before deployment

### Test Procedure
1. Create the required record (job, extras_order, payment, etc.) for Test & Verify
2. Query `couple_milestones` to verify the milestone flipped
3. Clean up test data (delete the test record) — milestone stays TRUE (Rule #1: milestones never revert)
4. Reset milestones to FALSE for next test: `UPDATE couple_milestones SET m[XX] = false WHERE couple_id = (SELECT id FROM couples WHERE couple_name = 'Test & Verify')`

---

## Status Simplification Audit — PENDING

The current `jobs` status dropdown has 13 values:
Ready to Start, In Progress, Proofs Out, Waiting for Bride, Ready to Re-edit, Re-editing, At Lab, At Studio, On Hold, Ready to Order, Completed, Picked Up

Several may overlap or be redundant. This audit is blocked until the Couple Production Hub (WO-902-907) is built — the Hub will clarify which statuses are actually needed vs. which can be merged.

**DO NOT add new statuses before this audit is complete.**

---

*Verified against production database `ntysfrgjwwcrtgustteb` on April 25, 2026. Cleanup migration applied April 25, 2026.*
