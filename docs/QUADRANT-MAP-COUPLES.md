# SIGS Photography — Couple Detail Page Quadrant Map

**Path:** `/app/admin/couples/[id]/page.tsx`  
**Last Updated:** March 27, 2026  
**Status:** 13 of 13 LOCKED

---

## Overview

The couple detail page is organized into **13 quadrants** rendered vertically. Each quadrant is a self-contained component with its own data source. Quadrants are locked individually — a locked quadrant cannot be modified without explicit review.

**Design System:** Teal/beige StudioFlow design system with `designTokens.ts`

---

## Status Legend

| Color | Meaning |
|-------|---------|
| 🟢 LOCKED | Built and approved |
| 🟡 SKIPPED | Built but not reviewed |
| 🔵 PLANNED | Not yet built |
| 🟠 IN PROGRESS | Under construction |

---

## Quadrant Specifications

### Q1 — Alert Banner
**Status:** 🟢 LOCKED  
**Component:** `Q01-AlertBanner.tsx`  
**Data Source:** `couple_milestones` + `payments`

- Red/coral banner fires when:
  - (a) Wedding Day Form not received
  - (b) Overdue payment exists
- Position: very top of page, above all content
- Conditional: hidden when no alerts active
- Links directly to the relevant section for resolution
- Multiple alerts stack vertically

---

### Q2 — Navigation
**Status:** 🟢 LOCKED  
**Component:** `Q02-Navigation.tsx`  
**Data Source:** Static

- ← All Couples link — returns to `/admin/couples` list
- Breadcrumb style, top-left position
- Couple name displayed as page title

---

### Q3 — Client Card (Header)
**Status:** 🟢 LOCKED  
**Component:** `Q03-ClientCard.tsx`  
**Data Source:** `couples` + `contracts` tables

**Sub-sections:**
- **Q3a:** Couple name — service type badge (Photo Only / Photo & Video from `num_videographers`)
- **Q3b:** Wedding date with countdown + "X days since wedding" post-event
- **Q3c:** Signed date · Booked date
- **Q3d:** 3-column grid:
  - CONTACT (name/email/phone)
  - VENUES (ceremony/reception/park/engagement)
  - PACKAGE (type/coverage/photographers/videographers)
- **Q3e:** Status badges — booked · Photo+Video · Pre-Wedding / Post-Wedding · Extras Purchased

**⚠️ GUARD REQUIRED:** Null check on `start_time`/`end_time` — display "TBD" if missing (prevents NaN)

---

### Q4 — Team + Notes
**Status:** 🟢 LOCKED  
**Component:** `Q04-TeamNotes.tsx`  
**Data Source:** `wedding_assignments` table

- Left panel: TEAM box showing:
  - Lead Photographer (`photo_1`)
  - 2nd Photographer (`photo_2`)
  - Videographer (`video_1`)
- Confirmation status badge (Confirmed / Pending)
- Right panel: Notes free-text field from `wedding_assignments.notes`
- Contract specifies X photographer + X videographer note below team

---

### Q5 — Client Journey
**Status:** 🟢 LOCKED  
**Component:** `Q05-ClientJourney.tsx`  
**Data Source:** `couple_milestones` table (37 boolean columns)

- 32 milestone bubbles arranged in 4 rows with section labels
- **Row 1 PRE-WEDDING:** Lead Captured → Consultation Booked → Done → Contract Signed → Deposit Received → Eng Session Shot → Eng Photos Edited → Eng Proofs to Lab → Eng Prints Picked Up
- **Row 2 ENG SALES → WEDDING PREP:** Frame Sale Quote → Sale Results PDF → Eng Order to Lab → Eng Items Framed → Eng Items Picked Up → Day Form Approved → Staff Confirmed
- **Row 3 WEDDING → POST-PRODUCTION:** Wedding Day → Files Backed Up → Proofs Edited → Photo Order In → Video Order In → Photo Order to Lab → Video Long Form
- **Row 4 DELIVERY → COMPLETE:** Recap Edited → Lab Order Back → Hi-Res on USB → Video on USB → Ready at Studio → Final Payment → Items Picked Up → Archived → Complete
- Progress bar across top, X completed / Y remaining / Z% counter
- Milestones manually toggled — NOT auto-populated from other tables

---

### Q6 — Forms
**Status:** 🟢 LOCKED  
**Component:** `Q06-Forms.tsx`  
**Data Source:** `couple_milestones` (m15, m24, m25)

- 3 form rows:
  - Wedding Day Form: green checkmark + "View →" link when received (`m15_day_form_approved`)
  - Photo Order: Awaiting / Received badge (`m24_photo_order_in`)
  - Video Order: Awaiting / Received / N/A badge (`m25_video_order_in`) — N/A for Photo Only couples

---

### Q7 — Financial Summary Bar
**Status:** 🟢 LOCKED  
**Component:** `Q07-FinancialSummaryBar.tsx`  
**Data Source:** `couple_charges` + `payments` tables (LIVE calculation)

- 5-cell horizontal bar — single row, full width
- **Cell 1:** C1 CONTRACT — sum from `contracts.total`
- **Cell 2:** C2 FRAMES & ALBUMS — from `extras_orders.extras_sale_amount` (or "—" if none)
- **Cell 3:** C3 EXTRAS — `SUM(client_extras.total)` (or "—" if none)
- **Cell 4:** GRAND TOTAL — C1 + C2 + C3 calculated live
- **Cell 5:** BALANCE OWING — red if >$0, green if $0, blue if negative (credit)

**🔴 CRITICAL:** NEVER reads from stored balance columns — always live calculation  
**Formula:** Balance = SUM(couple_charges.amount) − SUM(payments.amount)

---

### Q8 — Finance Ledger
**Status:** 🟢 LOCKED  
**Component:** `Q08-FinanceLedger.tsx` (with sub-components)  
**Data Source:** `contracts` + `extras_orders` + `client_extras` + `payments` + `contract_installments`

#### Q8a — Original Contract (C1)
- Table: # │ Description │ Due Date │ Status │ Amount
- Status logic:
  - **PAID:** payment matched — struck through + teal PAID badge
  - **OVERDUE:** due_date ≤ today, unpaid — red highlight + red OVERDUE badge
  - **ABSORBED:** post-C2 installments taken over by C2 schedule — gray + note
  - **UPCOMING:** due_date > today, unpaid
  - **PENDING:** no due date, unpaid — gray badge
- Footer: Contract Total │ Paid to date │ C1 balance remaining
- Payment matching rule: date-based (±5 days) first, then sequential — **STOPS at C2 signing date**

#### Q8b — Additional Sale (C2)
*Only shown if `extras_orders` record exists*

- Mini ledger:
  - C1 total → C1 balance at C2 signing (from `extras_orders.contract_balance_remaining`) → New purchase → Downpayment → New combined balance → installment count × amount
- C2 installment schedule table with standard 6 descriptions
- C2 payment matching: payments on/after C2 `order_date` matched to C2 installments
- Last installment shown as 2× when `last_installment_amount` set

#### Q8c — Extras & Add-ons (C3)
*Only shown if `client_extras` records exist*

- Table: Date │ Item Type │ Description │ Qty │ Unit Price │ HST │ Total │ Status
- Footer: C3 Total
- Amber note banner when `payment_note` field contains restructuring instructions

---

### Q9 — Your Package (Contract As Signed)
**Status:** 🟢 LOCKED  
**Component:** `Q09-ContractPackage.tsx`  
**Data Source:** `contracts` table — all fields printed as-is

- 4-column grid: COVERAGE │ ENGAGEMENT │ TEAM │ FINANCIALS
- **COVERAGE:** Package type, Hours (start_time–end_time), Day of week, Locations checklist, Drone, Post Production
- **ENGAGEMENT:** Session included, Location, Kids included
- **TEAM:** # Photographers, # Videographers, Parent Albums details
- **FINANCIALS:** C1 Subtotal, C1 HST, C1 Contract total, C2 Frames & Albums, C3 Extras, Paid, Balance
- Active/signed date badge top right
- All data directly from contracts table — no calculation

**⚠️ ENHANCEMENT:** FINANCIALS column must show C1/C2/C3 prefixes

---

### Q10 — Frames & Albums
**Status:** 🟢 LOCKED  
**Component:** `Q10-FramesAndAlbums.tsx`  
**Data Source:** `extras_orders` table (order_type = frames_albums)

**🔴 SOURCE OF TRUTH:** `extras_orders` table — **NOT** `client_extras`

- Shows all items from `extras_orders.items` JSON field
- Album details: size, cover, collage specs, frame specs, signing book
- Financial summary: retail value, discount, sale price (`extras_sale_amount`)
- Blank / hidden if no `extras_orders` record exists

**⚠️ IMPORTANT:** `client_extras` stores C3 add-ons — separate from this section

---

### Q11 — Extras & Add-ons
**Status:** 🟢 LOCKED  
**Component:** `Q11-ExtrasAddOns.tsx`  
**Data Source:** `client_extras` table

**🔴 SOURCE OF TRUTH:** `client_extras` table — **NOT** `extras_orders`

- Each row = one extra item sold post-contract (hours, prints, raw video, hi-res files, etc.)
- Columns: Item Type │ Description │ Qty │ Unit Price │ HST │ Total │ Status │ Date
- Status: Paid / Pending / Sent
- Payment note shown when present
- Blank / hidden if no `client_extras` records exist

---

### Q12 — Documents
**Status:** 🟢 LOCKED  
**Component:** `Q12-Documents.tsx`  
**Data Source:** `couple_documents` table + API routes

- 3 static document rows always shown:
  - Wedding Contract PDF → `/api/couples/[id]/pdf/contract` (from contracts table)
  - Frames & Albums PDF → `/api/couples/[id]/pdf/frames` (from extras_orders)
  - Extras PDF → `/api/couples/[id]/pdf/extras` (from client_extras)
- Frames & Albums and Extras show disabled "Nothing purchased yet" if no data
- Dynamic rows below: any `couple_documents` table rows for this couple
- Dynamic rows show doc_name + Download link (file_url)
- All PDFs generated on-the-fly using pdf-lib — not stored
- Pickup slips generated in Q13 appear here automatically

---

### Q13 — Client Pickup Slip
**Status:** 🟢 LOCKED  
**Component:** `Q13-ClientPickupSlip.tsx`  
**Data Source:** `couples` + `contracts` + `couple_documents` tables

- Entry form: add/remove item text inputs (minimum 1 always shown)
- "+ Add Item" button adds new row
- "× Remove" button on each row (except last)
- "Generate & Print Pickup Slip" button:
  1. Calls `/api/couples/[id]/pdf/pickup-slip` with items array
  2. Returns PDF — opens in new tab for printing
  3. Inserts row into `couple_documents` table
  4. Refreshes Q12 Documents section to show new slip
- PDF design: SIGS logo + CLIENT PICKUP SLIP header, client info, items table with QTY/DESCRIPTION/RECEIVED checkbox columns, italic instruction, SIGS footer

---

## Critical Rules

1. **Balance is NEVER stored** — always calculated live
2. **C1 payment matching STOPS at C2 signing date**
3. **`contract_balance_remaining`** in extras_orders is SOURCE OF TRUTH for C1 balance at C2 signing
4. **Q10 reads from `extras_orders`** — Q11 reads from `client_extras` — DIFFERENT tables
5. **Couple detail page is READ-ONLY** — all writes happen in Production pages
6. **Use `.limit(1)` not `.single()`** — LESSON-011

---

## Component File Structure

```
/components/couples/
├── Q01-AlertBanner.tsx
├── Q02-Navigation.tsx
├── Q03-ClientCard.tsx
├── Q04-TeamNotes.tsx
├── Q05-ClientJourney.tsx
├── Q06-Forms.tsx
├── Q07-FinancialSummaryBar.tsx
├── Q08-FinanceLedger/
│   ├── index.tsx
│   ├── Q08a-OriginalContract.tsx
│   ├── Q08b-AdditionalSale.tsx
│   └── Q08c-ExtrasAddOns.tsx
├── Q09-ContractPackage.tsx
├── Q10-FramesAndAlbums.tsx
├── Q11-ExtrasAddOns.tsx
├── Q12-Documents.tsx
└── Q13-ClientPickupSlip.tsx
```

---

*Template finalized March 27, 2026 — Score: 13 of 13 LOCKED*
