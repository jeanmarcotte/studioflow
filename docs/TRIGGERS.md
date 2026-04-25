# TRIGGERS.md
**StudioFlow — Database Trigger Registry**
**Version:** 1.1
**Created:** April 25, 2026
**Last Verified:** April 25, 2026

---

## Summary

| Category | Count |
|----------|-------|
| Milestone triggers | 10 (8 unique functions, 0 duplicates) |
| Business logic triggers | 3 (auto-complete, vendor fill, quote conversion) |
| Lead scoring triggers | 2 |
| Timestamp triggers | 23 (3 existing + 18 added April 25 + milestones + video_jobs) |
| **Total** | **36** |

**Cleanup (April 25, 2026):** Orphaned functions removed (`flip_m24_on_photo_order`, `set_photo_order_milestone`, `update_editing_jobs_timestamp`, `update_photo_jobs_updated_at`). Duplicate triggers removed (`trigger_day_form_milestone` on m15, `video_order_submitted_trigger` on m25). 18 `updated_at` auto-triggers added.

---

## All Triggers by Table

### `app_meta`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_app_meta_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `appointment_statuses`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_appointment_statuses_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `archive_couples`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_archive_couples_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `archive_milestones`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_archive_milestones_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `ballots`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `trigger_score_lead_on_insert` | INSERT | BEFORE | `score_lead_on_insert` | Calculates lead score 0-300 on ballot creation |
| `trigger_update_lead_score` | UPDATE | BEFORE | `update_lead_score_on_change` | Recalculates score when ballot fields change |
| `update_ballots_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `client_orders`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_client_orders_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `client_quotes`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `quote_status_change_trigger` | UPDATE | AFTER | `on_quote_status_change` | When status → `booked`, calls `convert_quote_to_contract` which creates couple + contract + seeds m01-m05 |
| `update_client_quotes_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `contracts`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_contracts_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `couple_appointments`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_couple_appointments_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

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
| `update_jobs_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `payer_links`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_payer_links_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `payments`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `trg_flip_m05_on_first_payment` | INSERT | AFTER | `fn_flip_m05_on_first_payment` | Flips m05 on first payment for a couple |
| `trg_check_m33_on_payment` | INSERT | AFTER | `check_and_flip_m33` | Checks balance_due ≤ 0, flips m33 |
| `trg_check_m33_on_payment` | UPDATE | AFTER | `check_and_flip_m33` | Same check on payment update |
| `trg_check_m33_on_payment` | DELETE | AFTER | `check_and_flip_m33` | Same check on payment delete (unfips m33 if balance > 0) |

### `photo_orders`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_photo_orders_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `product_catalog`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_product_catalog_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `sales_meetings`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_sales_meetings_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `settings`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_settings_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `team_members`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_team_members_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `video_jobs`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `video_jobs_updated_at` | UPDATE | BEFORE | `update_video_jobs_updated_at` | Sets `updated_at = NOW()` |

### `video_orders`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `trg_flip_m25_on_video_order` | INSERT | AFTER | `flip_m25_on_video_order` | Flips m25 |
| `video_orders_updated_at` | UPDATE | BEFORE | `update_milestones_timestamp` | Sets `updated_at = NOW()` |

### `wedding_assignments`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_wedding_assignments_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `wedding_day_forms`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `trg_flip_m15_on_form` | INSERT | AFTER | `flip_m15_on_form_submit` | Flips m15 |
| `update_wedding_day_forms_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `working_drives`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_working_drives_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

### `work_orders`

| Trigger | Event | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `update_work_orders_updated_at` | UPDATE | BEFORE | `update_updated_at_column` | Sets `updated_at = NOW()` |

---

## Known Issues

| Issue | Severity | Tables | Details |
|-------|----------|--------|---------|
| No wedding production triggers | Critical | `jobs` | m19, m20, m22, m26, m29, m32 have no triggers. See WO-895, WO-896, WO-897. |
| No video production triggers | Critical | `video_jobs` | m27, m28 have no triggers. See WO-898. |
| No delivery triggers | High | `jobs` | m30, m31, m34 have no trigger. See WO-899. |
| No sales milestone triggers | High | `extras_orders` | m10, m11 have no triggers. See WO-892. |
| No engagement physical triggers | Medium | `jobs` | m12 has no trigger. m13 needs auto-flip with m09. See WO-893. |
| No crew milestone trigger | Medium | `crew_call_sheets` | m16 has no trigger. See WO-894. |
| No completion trigger | Medium | `couple_milestones` | m36 has no trigger. See WO-900. |

## Triggers To Build

| WO | Milestones | Table | Trigger Spec |
|----|-----------|-------|-------------|
| WO-892 | m10, m11 | `extras_orders` | INSERT flips m10; UPDATE status → signed/declined flips m11 |
| WO-893 | m12, m13 | `jobs` | m12: engagement non-proofs → at_lab. m13: add line to `flip_engagement_milestones` to auto-flip with m09 |
| WO-894 | m16 | `crew_call_sheets` | INSERT flips m16 |
| WO-895 | m19 | Edge Function cron | Daily 00:01 Toronto — flip m19 for couples where wedding_date < CURRENT_DATE |
| WO-896 | m20, m22 | `jobs` | m20: INSERT WED_PROOFS job flips m20. m22: UPDATE WED_PROOFS → completed flips m22 |
| WO-897 | m26, m29, m32 | `jobs` | m26: first wedding non-proofs → at_lab. m29: first → at_studio. m32: ALL non-proofs → at_studio+ |
| WO-898 | m27, m28 | `video_jobs` | m27: FULL → complete. m28: RECAP → complete |
| WO-899 | m30, m31, m34 | `jobs` | ALL wedding non-proofs jobs → picked_up flips m34 + m30 + m31 |
| WO-900 | m36 | `couple_milestones` | ALL m01-m35 = true → flip m36, set couples.status = 'completed' |

## Resolved Issues

| Issue | Resolved | Details |
|-------|----------|---------|
| Duplicate m15 trigger | April 25, 2026 | Removed `trigger_day_form_milestone` + `update_milestone_on_day_form()`. Kept `trg_flip_m15_on_form`. |
| Duplicate m25 trigger | April 25, 2026 | Removed `video_order_submitted_trigger` + `set_video_order_milestone()`. Kept `trg_flip_m25_on_video_order`. |
| Orphaned m24 functions | April 25, 2026 | Dropped `flip_m24_on_photo_order()` and `set_photo_order_milestone()`. Only `trigger_m24_photo_order_in()` was active. |
| Orphaned timestamp functions | April 25, 2026 | Dropped `update_editing_jobs_timestamp()` and `update_photo_jobs_updated_at()`. Not attached to any trigger. |

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

*Verified against production database on April 25, 2026. Cleanup migration applied April 25, 2026.*
