# SIGS Photography — Client Account Ledger Quadrant Map

**Component:** Finance section (Q7/Q8) within Couple Detail Page  
**Last Updated:** March 27, 2026  
**Status:** All quadrants LOCKED

---

## Overview

The ledger is a **double-entry accounting system** modelled on 15th-century Venetian bookkeeping.

- Every contract signed creates a **DEBIT** (charge)
- Every payment received creates a **CREDIT**
- **Balance = SUM(debits) − SUM(credits)**
- The balance is **NEVER stored** — always calculated live

The ledger renders in **5 quadrants plus a summary bar**.

---

## Contract Types

| Code | Name | Source Table | Source Field |
|------|------|--------------|--------------|
| **C1** | Original wedding contract | `contracts` | `contracts.total` |
| **C2** | Frames & albums sale | `extras_orders` | `extras_orders.extras_sale_amount` |
| **C3** | Post-wedding extras | `client_extras` | `SUM(client_extras.total)` |

---

## Quadrant Specifications

### Q1 — Original Contract Installments (C1)
**Status:** 🟢 LOCKED  
**Data Source:** `contract_installments` + `payments` tables

**Table Columns:** # │ Description │ Due Date │ Status Badge │ Amount

**Status Logic:**
| Status | Condition | Styling |
|--------|-----------|---------|
| **PAID** | Payment matched to installment | Struck through, teal PAID badge, gray text |
| **OVERDUE** | due_date ≤ today AND unpaid | Red row highlight, red OVERDUE badge |
| **ABSORBED** | Installment occurs after C2 signing date | Gray, note "Absorbed into C2 schedule" |
| **UPCOMING** | due_date > today AND unpaid | Normal styling |
| **PENDING** | No due_date AND unpaid | Gray badge |

**Payment Matching Rules:**
1. Date-based (±5 days) takes priority for dated installments
2. Sequential fallback: next unpaid installment receives unmatched payment
3. **🔴 CRITICAL:** Matching STOPS at C2 signing date — post-C2 payments belong to C2

**Footer Rows:**
- Row 1: Contract Total (N × $X.XX)
- Row 2: Paid to date (N of N installments)
- Row 3: C1 balance remaining

**Warning Banner:** Displayed above table if any OVERDUE installments exist  
*Text: "⚠ PAYMENT OVERDUE — [name] was due [date]. Payment required before next service."*

---

### Q2 — Additional Sale Mini Ledger (C2)
**Status:** 🟢 LOCKED  
**Data Source:** `extras_orders` table — only shown if record exists

**Render Condition:** Only if `extras_orders` record exists for this couple

**Section Header:** C2 description + signing date

**Mini Ledger Rows:**
| Label | Value Source |
|-------|--------------|
| C1 total contract value | `contracts.total` |
| C1 balance remaining at signing | `extras_orders.contract_balance_remaining` ← **SOURCE OF TRUTH** |
| New purchase — [description] | `extras_orders.extras_sale_amount` |
| Downpayment at signing | `(extras_orders.downpayment)` |
| New combined balance | `extras_orders.new_balance` |

**Highlighted Summary Row:** "New combined balance owing: $X,XXX.XX"

**⚠️ IMPORTANT:** `contract_balance_remaining` is entered by Marianna at time of C2 signing — **trust this field, do NOT recalculate from payments**

C2 items description pulled from `extras_orders.notes` or items JSON

---

### Q3 — Updated Installment Schedule (C2)
**Status:** 🟢 LOCKED  
**Data Source:** `extras_orders` fields: `num_installments`, `payment_per_installment`, `last_installment_amount`

**Render Condition:** Only if `extras_orders` record exists

**Header:** "X installments × $Y.YY (last installment: $Z.ZZ)"

**Amber Info Banner:** "Installments #1–#N satisfied — see Q1. [Overdue items if any.]"

**Standard C2 Installment Descriptions (always in this order):**
1. Pick Up Portraits
2. January 15th [YEAR]
3. 2 Weeks before wedding
4. Pick up proof disk/Dropbox
5. Order Photos
6. Pick up the final wedding album & prints ×2
7. (repeat or extend as needed for num_installments)

**Last Installment:** Amount = `last_installment_amount` field (2× standard installment)

**Payment Matching:** Payments on/after C2 `order_date` (excluding downpayment) matched sequentially

**Status Rules:** Same as Q1 (PAID/OVERDUE/UPCOMING)

**Footer Rows:**
- Row 1: Remaining balance on schedule
- Row 2: True balance owing (grand total − total paid)
- Red warning row if schedule total ≠ true balance

---

### Q4 — All Payments Received
**Status:** 🟢 LOCKED  
**Data Source:** `payments` table WHERE couple_id = [id]

**Table Columns:** Date │ From (from_name) │ Method │ Amount │ Applied To

**Applied To Column Examples:**
- "C1 #1 — Upon Booking"
- "C2 — Downpayment"
- "C2 #3 — 2 Weeks before wedding"
- "C3 — Raw Video"

**Display Rules:**
- Alternating row shading for readability
- Sorted chronologically ascending
- `from_name` shown exactly as it appears in CSV/bank record

**Footer:** Total Payments (N payments) │ $X,XXX.XX total

**Note:** All payments shown regardless of source — no filtering

---

### Q5 — Extras & Add-ons (C3)
**Status:** 🟢 LOCKED  
**Data Source:** `client_extras` table WHERE couple_id = [id]

**Render Condition:** Only if `client_extras` records exist

**Table Columns:** Date │ Item Type │ Description │ Qty │ Unit Price │ HST │ Total │ Status

**Item Types:**
- Additional Person
- Hi Res Files
- Hours
- Parent Album
- Print
- Raw Video

**Status Options:**
- Paid (green)
- Pending (amber)
- Sent (blue)

**Amber Note Banner:** Shown when `payment_note` field is populated  
*Example: "Note: Divide installments into $468"*

**Footer:** C3 Total: $X.XX

**Empty State:** Gray section header "None recorded for this couple"

**Display Rules:**
- Each row in `client_extras` = one line item
- Multiple C3 items appear as multiple rows
- C3 charges are added to existing installment schedule (not a new schedule)

---

### SUMMARY — Account Summary (Balance Bar)
**Status:** 🟢 LOCKED  
**Data Source:** `couple_charges` + `payments` (LIVE — never stored)

**Layout:** 3-cell horizontal bar at bottom of ledger

| Cell | Content | Notes |
|------|---------|-------|
| **Cell 1** | TOTAL CHARGED | SUM(couple_charges.amount) — C1 + C2 + C3 itemized below |
| **Cell 2** | TOTAL PAID | SUM(payments.amount) — N payments |
| **Cell 3** | BALANCE OWING | Total Charged − Total Paid |

**Balance Cell Colors:**
- **Red:** if >$0 (owing)
- **Teal:** if $0 (paid in full)
- **Blue:** if <$0 (credit)

**Credit Balance Note:** "Credit — applies to final pickup"

**Overdue Flag:** Shown in balance cell if any installments past due

**🔴 CRITICAL:** 
- Formula: Balance = SUM(couple_charges.amount) − SUM(payments.amount)
- NEVER reads from `couples.balance_owing` or `couples.total_paid` (stale columns)
- All calculations performed server-side in a single query

---

## Critical Rules — READ BEFORE BUILDING

| # | Rule |
|---|------|
| 1 | Balance is **NEVER stored**. Always calculated: SUM(couple_charges.amount) − SUM(payments.amount) |
| 2 | C1 payment matching **STOPS at C2 signing date**. Post-C2 payments belong to C2 schedule. |
| 3 | `contract_balance_remaining` in extras_orders is the **SOURCE OF TRUTH** for C1 balance at C2 signing. Do NOT recalculate. |
| 4 | C2 installment descriptions are **STANDARD** (hardcoded 6 labels) — not stored in DB. |
| 5 | Last installment = `last_installment_amount` field (2× standard amount). Must be set manually per couple. |
| 6 | C3 charges are added to existing installment — no new schedule created. `payment_note` field stores restructuring instructions. |
| 7 | `couples.balance_owing` and `couples.total_paid` are **STALE columns** — never read them for display. |
| 8 | Payment matching is **date-based first** (±5 days), then sequential. Never by amount alone. |
| 9 | Q10 Frames & Albums reads from `extras_orders`. Q11 Extras reads from `client_extras`. These are **DIFFERENT tables**. |
| 10 | Overdue flag fires for any date-based installment where due_date ≤ TODAY and no matched payment exists. |

---

*Ledger architecture finalized March 27, 2026 · Double-entry system · Venetian model (1494)*
