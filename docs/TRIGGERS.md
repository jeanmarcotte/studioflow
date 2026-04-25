# TRIGGERS.md
**StudioFlow — Database Trigger Registry**
**Version:** 1.0
**Created:** April 25, 2026
**Last Verified:** April 25, 2026

---

## Summary

| Category | Count |
|----------|-------|
| Milestone triggers | 14 (11 unique functions, 3 duplicates) |
| Business logic triggers | 3 (auto-complete, vendor fill, quote conversion) |
| Lead scoring triggers | 2 |
| Timestamp triggers | 5 |
| **Total** | **22** |

---

## All Triggers by Table

### `ballots`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `trigger_score_lead_on_insert` | INSERT | BEFORE | `score_lead_on_insert` | Calculates lead score 0-300 on ballot creation |
| `trigger_update_lead_score` | UPDATE | BEFORE | `update_lead_score_on_change` | Recalculates score when ballot fields change |

### `client_quotes`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `quote_status_change_trigger` | UPDATE | AFTER | `on_quote_status_change` | When status → `booked`, calls `convert_quote_to_contract` which creates couple + contract + seeds m01-m05 |

### `couple_milestones`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `milestones_updated_at` | UPDATE | BEFORE | `update_milestones_timestamp` | Sets `updated_at = NOW()` |

### `couples`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_couples_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `jobs`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `trg_autofill_vendor` | INSERT | BEFORE | `fn_autofill_vendor_from_catalog` | Auto-fills vendor from `product_catalog.default_vendor` (e.g., canvas → Best Canvas) |
| `on_wedding_job_created` | INSERT | AFTER | `trigger_m24_photo_order_in` | Flips m24 when wedding non-proofs job created |
| `trg_auto_complete_couple_on_proofs` | INSERT | AFTER | `fn_auto_complete_couple_on_proofs` | Flips `couples.status` → `completed` when PROD-WED-PROOFS exists + wedding_date passed |
| `trg_auto_complete_couple_on_proofs` | UPDATE | AFTER | `fn_auto_complete_couple_on_proofs` | Same as above, also fires on status update |
| `trg_flip_engagement_milestones` | UPDATE | AFTER | `flip_engagement_milestones` | Flips m06/m07/m08/m09/m14 based on engagement job status changes |

### `payments`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `trg_flip_m05_on_first_payment` | INSERT | AFTER | `fn_flip_m05_on_first_payment` | Flips m05 on first payment for a couple |
| `trg_check_m33_on_payment` | INSERT | AFTER | `check_and_flip_m33` | Checks balance_due ≤ 0, flips m33 |
| `trg_check_m33_on_payment` | UPDATE | AFTER | `check_and_flip_m33` | Same check on payment update |
| `trg_check_m33_on_payment` | DELETE | AFTER | `check_and_flip_m33` | Same check on payment delete (unfips m33 if balance > 0) |

### `video_jobs`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `video_jobs_updated_at` | UPDATE | BEFORE | `update_video_jobs_updated_at` | Sets `updated_at = NOW()` |

### `video_orders`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `trg_flip_m25_on_video_order` | INSERT | AFTER | `flip_m25_on_video_order` | Flips m25 |
| `video_order_submitted_trigger` | INSERT | AFTER | `set_video_order_milestone` | Flips m25 ⚠️ DUPLICATE |
| `video_orders_updated_at` | UPDATE | BEFORE | `update_milestones_timestamp` | Sets `updated_at = NOW()` |

### `wedding_assignments`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_wedding_assignments_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `wedding_day_forms`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `trg_flip_m15_on_form` | INSERT | AFTER | `flip_m15_on_form_submit` | Flips m15 |
| `trigger_day_form_milestone` | INSERT | AFTER | `update_milestone_on_day_form` | Flips m15 ⚠️ DUPLICATE |

### `work_orders`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_work_orders_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

---

## Known Issues

| Issue | Severity | Tables | Details |
|-------|----------|--------|---------|
| Duplicate m15 trigger | Medium | `wedding_day_forms` | `trg_flip_m15_on_form` and `trigger_day_form_milestone` both flip m15 on INSERT. Remove one. |
| Duplicate m25 trigger | Medium | `video_orders` | `trg_flip_m25_on_video_order` and `video_order_submitted_trigger` both flip m25 on INSERT. Remove one. |
| No wedding production triggers | Critical | `jobs` | m19, m20, m22, m26, m29, m32 have no triggers. Wedding production milestones never auto-flip. |
| No video production triggers | Critical | `video_jobs` | m27, m28 have no triggers. Video completion milestones never auto-flip. |
| No delivery triggers | High | `jobs` | m34 (items picked up) has no trigger. |

---

## Verification Query

```sql
SELECT trigger_name, event_object_table, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name NOT LIKE 'RI_%'
ORDER BY event_object_table, trigger_name;
```

---

*Verified against production database on April 25, 2026.*
