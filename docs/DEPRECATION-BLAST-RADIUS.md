# Deprecation Blast Radius Report
**Generated:** 2026-05-01
**WO:** 1004

> **Scope note:** Greps run against `src/**/*.{ts,tsx}` (excluding `node_modules` and `.next`). No code changed. Each row classifies the call site by its source table and proposes whether `product_code` (joined to `product_catalog`) can replace it.
>
> **Heuristic key:**
> - **YES** = pure WHERE/INSERT/CASE on the legacy column where `product_code` already exists or can be backfilled cleanly.
> - **NEEDS REVIEW** = display labels, fallbacks, or string-derived booleans that may need a `product_catalog.item_name` JOIN or a UI tweak before swap.
> - **NO** = call site reads/writes `job_type` for a reason that cannot be expressed via `product_code` today (e.g., write paths to columns that still require non-null `job_type`).

---

## job_type References (jobs table)

| File | Line | Context | Can Replace with product_code? |
|------|------|---------|-------------------------------|
| src/components/reports/PhotoProductionReport.tsx | 10 | `job_type: string` — interface field on photo job row | NEEDS REVIEW (drop after consumers migrate to product_code) |
| src/components/reports/PhotoProductionReport.tsx | 368 | `<Text style={s.cellJobType}>{JOB_TYPE_LABELS[job.job_type] \|\| job.job_type}</Text>` — PDF cell label | NEEDS REVIEW (replace label lookup with `product_catalog.item_name`) |
| src/components/production-hub/PhotoJobsTable.tsx | 52 | `<td …>{job.job_type}</td>` — table cell | NEEDS REVIEW (display label — switch to product name) |
| src/components/production-hub/types.ts | 55 | `PhotoJob.job_type: string` — interface field | NEEDS REVIEW (drop with consumers) |
| src/components/production-hub/types.ts | 95 | `OrderJob.job_type: string` — interface field | NEEDS REVIEW (drop with consumers) |
| src/components/production-hub/AddJobModal.tsx | 78 | `job_type: selectedProductCode` — INSERT into `jobs` writing the product code into `job_type` | NEEDS REVIEW (drop write once column made nullable / removed) |
| src/components/production-hub/OrderCards.tsx | 40 | `productMap.get(job.product_code \|\| '') \|\| job.product_code \|\| job.job_type` — fallback display | YES (final fallback can be removed once product_code is NOT NULL) |
| src/app/admin/page.tsx | 53 | `EditingJobRow.job_type: string` — interface field | NEEDS REVIEW |
| src/app/admin/page.tsx | 78 | `CurrentlyEditingJob.job_type: string` — interface field | NEEDS REVIEW |
| src/app/admin/page.tsx | 235 | `supabase.from('jobs').select('id, couple_id, job_type, category, …')` — SELECT | YES (select `product_code` instead, JOIN product_catalog for name) |
| src/app/admin/page.tsx | 358 | `job_type: j.job_type` — mapping into local object | YES (re-map from `product_code`) |
| src/app/admin/page.tsx | 392 | `ALBUM_TYPES.includes(j.job_type) && j.status !== 'completed' …` — filter | YES (rebuild ALBUM_TYPES around `product_code` values) |
| src/app/admin/page.tsx | 404 | `${JOB_TYPE_LABELS[j.job_type] \|\| j.job_type.replace(/_/g, ' ')}` — display label | NEEDS REVIEW (use product_catalog.item_name) |
| src/app/admin/page.tsx | 457 | `${ALBUM_TYPE_LABELS[j.job_type] \|\| j.job_type}` — display label | NEEDS REVIEW (use product_catalog.item_name) |
| src/app/api/cron/production-report/route.ts | 151 | `j.status === 'completed' && isProofsJob(j.job_type)` — filter | YES (predicate rewritten as `product_code IN ('PROD-WED-PROOFS','PROD-ENG-PROOFS')`) |
| src/app/api/cron/production-report/route.ts | 157 | `isProofsJob(j.job_type)` — filter | YES (same as above) |
| src/app/api/cron/production-report/route.ts | 170 | `DELIVERABLE_MAP[job.job_type] \|\| formatJobType(job.job_type)` — display label | NEEDS REVIEW (use product_catalog.item_name) |
| src/app/api/cron/production-report/route.ts | 291 | `${formatJobType(job.job_type)}` — HTML cell | NEEDS REVIEW |
| src/app/api/cron/production-report/route.ts | 333 | `${formatJobType(job.job_type)}` — HTML cell | NEEDS REVIEW |
| src/components/dashboard/ProductionFloor.tsx | 10 | `EditingJob.job_type: string` — interface field | NEEDS REVIEW |
| src/components/dashboard/ProductionFloor.tsx | 21 | `PhysicalJob.job_type: string` — interface field | NEEDS REVIEW |
| src/components/dashboard/ProductionFloor.tsx | 45 | `.select('id, couple_id, job_type, category, status, …')` from `jobs` | YES (select product_code; JOIN product_catalog for label) |
| src/components/dashboard/ProductionFloor.tsx | 49 | `.select('id, couple_id, job_type, status, …')` from `jobs` | YES |
| src/components/dashboard/ProductionFloor.tsx | 107 | `j.category === 'wedding' \|\| j.job_type.startsWith('wed_') \|\| j.job_type === 'PARENT_BOOK' \|\| j.job_type === 'parent_album' \|\| j.job_type === 'bg_album'` — wedding-bucket filter | NEEDS REVIEW (mix of legacy `wed_*` strings + product codes — confirm coverage of every legacy job before swap) |
| src/components/dashboard/ProductionFloor.tsx | 126 | `JOB_TYPE_LABELS[j.job_type] ?? j.job_type.replace(/_/g, ' ')` — display | NEEDS REVIEW |
| src/components/dashboard/ProductionFloor.tsx | 157 | `JOB_TYPE_LABELS[j.job_type] ?? j.job_type` — display | NEEDS REVIEW |
| src/app/admin/production/photo/page.tsx | 21 | `job_type: string` — interface field | NEEDS REVIEW |
| src/app/admin/production/photo/page.tsx | 232 | `.select('job_type, edited_so_far, photos_taken, total_proofs, status')` from `jobs` | YES (select product_code instead) |
| src/app/admin/production/photo/page.tsx | 281 | `r.job_type && r.job_type.toLowerCase().includes('proofs')` — predicate | YES (use `product_code IN ('PROD-WED-PROOFS','PROD-ENG-PROOFS')`) |
| src/app/admin/production/photo/page.tsx | 408 | `(JOB_TYPE_LABELS[j.job_type] \|\| j.job_type).toLowerCase().includes(term)` — search | NEEDS REVIEW (search should target product_catalog.item_name) |
| src/app/admin/production/photo/page.tsx | 463 | `j.job_type.toLowerCase().includes('proofs') && j.status === 'completed'` — filter | YES (use product_code predicate) |
| src/app/admin/production/photo/page.tsx | 562 | `row.original.product_code ?? JOB_TYPE_LABELS[row.original.job_type] ?? row.original.job_type` — cell | YES (drop fallback once product_code NOT NULL) |
| src/app/admin/production/photo/page.tsx | 738 | `row.original.product_code ?? JOB_TYPE_LABELS[row.original.job_type] ?? row.original.job_type.replace(…)` — cell | YES (drop fallback once product_code NOT NULL) |
| src/app/admin/production/photo/page.tsx | 1024 | `job.product_code ?? JOB_TYPE_LABELS[job.job_type] ?? job.job_type.replace(…)` — cell | YES (drop fallback once product_code NOT NULL) |
| src/app/admin/production/photo/page.tsx | 1313 | `JOB_TYPE_LABELS[job.job_type] \|\| job.job_type` — cell | NEEDS REVIEW (use product_catalog label) |
| src/app/admin/production/dashboard/page.tsx | 87 | `.select('id, couple_id, product_code, job_type, status, vendor, …')` from `jobs` | YES (drop job_type from select once consumers migrate) |
| src/app/admin/production/dashboard/page.tsx | 112 | `EXCLUDED_ORDER_CODES.includes(j.product_code \|\| j.job_type \|\| '')` — filter | YES (drop job_type leg once product_code NOT NULL) |
| src/app/admin/production/dashboard/page.tsx | 164 | `productMap.get(j.product_code) \|\| j.product_code \|\| j.job_type \|\| 'Unknown'` — display fallback | YES (drop job_type leg) |
| src/app/admin/production/dashboard/page.tsx | 195 | `item_name: productMap.get(j.product_code) \|\| j.product_code \|\| j.job_type \|\| 'Unknown'` — display fallback | YES (drop job_type leg) |
| src/app/admin/production/couples/[id]/page.tsx | 43 | `.select('id, couple_id, job_type, category, product_code, …')` from `jobs` | YES (drop job_type from select) |
| src/app/admin/production/couples/[id]/page.tsx | 73 | `const code = j.product_code \|\| j.job_type \|\| ''` — fallback | YES (drop job_type leg) |
| src/app/admin/production/couples/[id]/page.tsx | 80 | `j.product_code === 'PROD-VID-SLIDESHOW' \|\| j.job_type === 'PROD-VID-SLIDESHOW'` — predicate | YES (drop job_type leg) |
| src/app/admin/production/report/page.tsx | 17 | `job_type: string` — interface field (photo job) | NEEDS REVIEW |
| src/app/admin/production/report/page.tsx | 121 | `function isProofsJob(job: { product_code: string \| null; job_type: string }): boolean` — signature | YES (drop job_type param after callers migrated) |
| src/app/admin/production/report/page.tsx | 123 | `return job.job_type.toLowerCase().includes('proofs')` — predicate body | YES (replace with `product_code IN (…)`) |
| src/app/admin/production/report/page.tsx | 210 | `// Resolve display name: product_catalog item_name > formatJobType(job_type) > 'Unknown'` — comment | YES (comment can drop job_type leg) |
| src/app/admin/production/report/page.tsx | 211 | `(job: { product_code: string \| null; job_type: string }) => …` — signature | YES |
| src/app/admin/production/report/page.tsx | 215 | `return formatJobType(job.job_type)` — fallback display | NEEDS REVIEW (use product_catalog.item_name) |
| src/app/admin/production/report/page.tsx | 218 | `(job: { product_code: string \| null; job_type: string }) => …` — signature | YES |
| src/app/api/admin/reports/send-production-report/route.ts | 150 | `j.status === 'completed' && isProofsJob(j.job_type)` — filter | YES (use product_code predicate) |
| src/app/api/admin/reports/send-production-report/route.ts | 156 | `isProofsJob(j.job_type)` — filter | YES |
| src/app/api/admin/reports/send-production-report/route.ts | 168 | `DELIVERABLE_MAP[job.job_type] \|\| formatJobType(job.job_type)` — label | NEEDS REVIEW (use product_catalog.item_name) |
| src/app/api/admin/reports/send-production-report/route.ts | 282 | `${formatJobType(job.job_type)}` — HTML cell | NEEDS REVIEW |
| src/app/api/admin/reports/send-production-report/route.ts | 324 | `${formatJobType(job.job_type)}` — HTML cell | NEEDS REVIEW |
| src/app/admin/production/editing/new/page.tsx | 347 | `job_type: selectedProductCode` — INSERT into `jobs` | NEEDS REVIEW (drop write once column nullable / removed) |
| src/app/api/production-email/route.ts | 25 | `job_type: string` — interface field | NEEDS REVIEW |
| src/app/api/production-email/route.ts | 33 | `job_type: string` — interface field | NEEDS REVIEW |
| src/app/api/production-email/route.ts | 43 | `job_type: string` — interface field | NEEDS REVIEW |
| src/app/api/production-email/route.ts | 60 | `${j.job_type.replace(/_/g, ' ')}` — HTML cell | NEEDS REVIEW (use product_catalog.item_name) |
| src/app/api/production-email/route.ts | 72 | `${j.job_type.replace(/_/g, ' ')}` — HTML cell | NEEDS REVIEW |
| src/app/api/production-email/route.ts | 82 | `${j.job_type.replace(/_/g, ' ')}` — HTML cell | NEEDS REVIEW |
| src/app/api/production-email/route.ts | 175 | `.select('job_type, vendor, at_lab_date, product_code, …')` from `jobs` | YES (drop job_type once consumers migrate) |
| src/app/api/production-email/route.ts | 180 | `.select('job_type, vendor, pickup_date, product_code, …')` from `jobs` | YES |
| src/app/api/production-email/route.ts | 185 | `.select('job_type, pickup_date, product_code, …')` from `jobs` | YES |

---

## job_type References (video_jobs table)

| File | Line | Context | Can Replace with product_code? |
|------|------|---------|-------------------------------|
| src/components/production-hub/types.ts | 75 | `VideoJob.job_type: string` — interface field | NEEDS REVIEW (drop with consumers; video_jobs.product_code now exists per WO-999) |
| src/components/production-hub/VideoJobsTable.tsx | 92 | `<td …>{job.job_type}</td>` — table cell | NEEDS REVIEW (display label — switch to product name) |
| src/app/api/cron/production-report/route.ts | 191 | `videoCompleted2026.forEach((v) => { vidTypeCounts[v.job_type] = … })` — count by job_type | YES (key by product_code; resolve label via product_catalog) |
| src/app/api/cron/production-report/route.ts | 362 | `${formatVideoJobType(vj.job_type)}` — HTML cell | NEEDS REVIEW (use product_catalog.item_name) |
| src/app/api/cron/production-report/route.ts | 411 | `${formatVideoJobType(vj.job_type)}` — HTML cell | NEEDS REVIEW |
| src/app/api/cron/production-report/route.ts | 434 | `${formatVideoJobType(vj.job_type)}` — HTML cell | NEEDS REVIEW |
| src/app/admin/production/dashboard/page.tsx | 88 | `supabase.from('video_jobs').select('id, couple_id, status, section, job_type, sent_for_review_date').eq('job_type', 'FULL').eq('section', 'editing')` — SELECT + WHERE | YES (filter on `product_code = 'PROD-VID-LONGFORM'` instead) |
| src/app/admin/production/couples/[id]/page.tsx | 44 | `.select('id, couple_id, job_type, status, hours_raw, …')` from `video_jobs` | YES (select product_code instead) |
| src/app/admin/production/report/page.tsx | 43 | `job_type: string` — interface field (video job) | NEEDS REVIEW |
| src/app/admin/production/report/page.tsx | 363 | `videoCompleted2026.forEach(j => { counts[j.job_type] = (counts[j.job_type] \|\| 0) + 1 })` — count | YES (key by product_code) |
| src/app/admin/production/report/page.tsx | 741 | `${formatVideoJobType(job.job_type)}` — display | NEEDS REVIEW (use product_catalog.item_name) |
| src/app/admin/production/report/page.tsx | 843 | `${formatVideoJobType(job.job_type)}` — display | NEEDS REVIEW |
| src/app/admin/production/report/page.tsx | 879 | `${formatVideoJobType(job.job_type)}` — display | NEEDS REVIEW |
| src/app/admin/production/video/page.tsx | (all) | All `'FULL'` / `'RECAP'` / `'ENG_SLIDESHOW'` literals migrated to `'PROD-VID-LONGFORM'` / `'PROD-VID-RECAP'` / `'PROD-VID-SLIDESHOW'` (the values now stored in `video_jobs.job_type`). `JOB_TYPE_LABELS` keys updated to match. Interface field + label fallbacks remain — drop after `product_code` is NOT NULL. | RESOLVED 2026-05-03 (FIX-VIDEO-PRODUCTION-PAGE.md) |
| src/app/api/admin/reports/send-production-report/route.ts | 188 | `videoCompleted2026.forEach((v) => { vidTypeCounts[v.job_type] = … })` — count | YES (key by product_code) |
| src/app/api/admin/reports/send-production-report/route.ts | 352 | `${formatVideoJobType(vj.job_type)}` — HTML cell | NEEDS REVIEW (use product_catalog.item_name) |
| src/app/api/admin/reports/send-production-report/route.ts | 399 | `${formatVideoJobType(vj.job_type)}` — HTML cell | NEEDS REVIEW |
| src/app/api/admin/reports/send-production-report/route.ts | 421 | `${formatVideoJobType(vj.job_type)}` — HTML cell | NEEDS REVIEW |

---

## client_order_id References

| File | Line | Context | Action Needed |
|------|------|---------|---------------|
| src/app/admin/orders/page.tsx | 61 | `.select('client_order_id')` from `jobs` (line-item count per order) | REMOVE (page reads deprecated `client_orders`; will go away with that flow) |
| src/app/admin/orders/page.tsx | 62 | `.in('client_order_id', orderIds)` — WHERE on `jobs` | REMOVE (same as above) |
| src/app/admin/orders/page.tsx | 66 | `countMap.set(j.client_order_id, …)` — per-order count | REMOVE |
| src/app/admin/orders/[orderId]/view/page.tsx | 122 | `.eq('client_order_id', orderId)` on `jobs` | REMOVE (order-detail view of deprecated client_orders) |
| src/app/admin/production/editing/new/page.tsx | 245 | `.eq('client_order_id', order.id)` on `jobs` | REMOVE (legacy client_orders ingest path) |
| src/app/admin/production/editing/new/page.tsx | 350 | `client_order_id: clientOrderId` — INSERT into `jobs` | REMOVE (FK was dropped in WO-999; writes still happen but no longer enforced) |

---

## client_orders Table References

| File | Line | Context | Action Needed |
|------|------|---------|---------------|
| src/app/admin/production/editing/new/page.tsx | 232 | `.from('client_orders')` — SELECT in editing-new flow | REMOVE (table deprecated in WO-999) |
| src/app/admin/production/editing/new/page.tsx | 304 | `.from('client_orders')` — second use in same flow | REMOVE |
| src/app/admin/production/editing/new/page.tsx | 319 | `.from('client_orders')` — third use in same flow | REMOVE |
| src/app/admin/orders/page.tsx | 51 | `.from('client_orders')` — list page | REMOVE (entire page targets deprecated table; either retire page or rewire to `jobs`/`product_catalog`) |
| src/app/admin/orders/[orderId]/view/page.tsx | 98 | `.from('client_orders')` — detail page | REMOVE (entire page targets deprecated table) |
| src/app/admin/documents/page.tsx | 84 | `supabase.from('client_orders').select('id, couple_id, order_type')` — documents listing pulls from client_orders | NEEDS REVIEW (documents page joins to deprecated table — confirm whether order rows are still surfaced; rewire to `jobs` or drop section) |

---

## Summary

- **Total `job_type` references:** 102 (jobs: 56 | video_jobs: 46)
- **Total `client_order_id` references:** 6
- **Total `client_orders` references:** 6

### Files affected (unique, 17)

**`job_type` consumers (15 files)**
- src/components/reports/PhotoProductionReport.tsx
- src/components/production-hub/PhotoJobsTable.tsx
- src/components/production-hub/types.ts
- src/components/production-hub/AddJobModal.tsx
- src/components/production-hub/VideoJobsTable.tsx
- src/components/production-hub/OrderCards.tsx
- src/components/dashboard/ProductionFloor.tsx
- src/app/admin/page.tsx
- src/app/admin/production/photo/page.tsx
- src/app/admin/production/dashboard/page.tsx
- src/app/admin/production/couples/[id]/page.tsx
- src/app/admin/production/report/page.tsx
- src/app/admin/production/video/page.tsx
- src/app/admin/production/editing/new/page.tsx
- src/app/api/cron/production-report/route.ts
- src/app/api/admin/reports/send-production-report/route.ts
- src/app/api/production-email/route.ts

**`client_order_id` consumers (3 files)**
- src/app/admin/orders/page.tsx
- src/app/admin/orders/[orderId]/view/page.tsx
- src/app/admin/production/editing/new/page.tsx

**`client_orders` consumers (4 files)**
- src/app/admin/production/editing/new/page.tsx
- src/app/admin/orders/page.tsx
- src/app/admin/orders/[orderId]/view/page.tsx
- src/app/admin/documents/page.tsx

### Migration shape (informational only — no work performed)

1. **Hot zone — high-touch reads/filters:** `src/app/admin/production/video/page.tsx` (28 occurrences) and `src/app/admin/production/photo/page.tsx` (8 occurrences) account for the bulk of legacy `job_type` filters. Most are pure equality checks against `'FULL'`/`'RECAP'`/`'ENG_SLIDESHOW'` and translate cleanly to `product_code`.
2. **Display labels (NEEDS REVIEW):** `JOB_TYPE_LABELS`, `formatJobType`, `formatVideoJobType`, `DELIVERABLE_MAP`, and `ALBUM_TYPE_LABELS` lookups should resolve through `product_catalog.item_name` after migration.
3. **Write paths:** `AddJobModal.tsx:78` and `editing/new/page.tsx:347` still write `job_type` on INSERT — both will need updating before the column can be made nullable / dropped on `jobs`.
4. **`client_orders` fully deprecated by WO-999:** the only live consumers are `/admin/orders/*` (entire feature) and `/admin/documents/page.tsx:84`. Retiring the orders pages (or rewiring to `jobs` + `product_catalog`) clears every `client_order_id` and `client_orders` reference at once.
