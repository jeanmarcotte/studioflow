# DATA-INTEGRITY-RULEBOOK.md
**Version:** 1.0  
**Created:** April 29, 2026  
**Scope:** All StudioFlow financial tables  
**Authors:** Spencer (Tech), Hubert (Finance), Karen (Accountability)  
**Origin:** The C3 Orphan Incident — April 29, 2026

---

## PURPOSE

This document defines the structural rules for every financial table in StudioFlow. It exists because on April 29, 2026, an AI assistant created an orphaned `client_extras` record with guessed numbers, then proposed deprecating the table entirely, because no structural rules existed to prevent either action.

**If you are about to create, modify, or query a financial table — read this first.**

---

## RULE 1: THE HEADER-DETAIL PATTERN

Every invoice type in StudioFlow follows the **Header-Detail** pattern:

```
couples (grandparent)
    → HEADER TABLE (one row per couple per invoice type)
        → LINE ITEMS TABLE (one row per product sold)
        → INSTALLMENTS TABLE (payment schedule)
```

**A detail row (line item) CANNOT exist without its header.**  
**A header row CANNOT exist without its parent couple.**  
**The database enforces this with foreign key constraints.**

### The Three Invoice Types

| Invoice | Header Table | Line Items Table | Installments Table |
|---------|-------------|-----------------|-------------------|
| **C1 — Contract** | `contracts` | `c1_line_items` | `contract_installments` |
| **C2 — Frames & Albums** | `extras_orders` | `c2_line_items` | `extras_installments` |
| **C3 — Extras** | `client_extras` | `c3_line_items` | *(none yet)* |

### Required Foreign Keys

| Table | FK Column | Points To | Constraint |
|-------|-----------|-----------|------------|
| `contracts` | `couple_id` | `couples.id` | NOT NULL |
| `c1_line_items` | `contract_id` | `contracts.id` | NOT NULL |
| `contract_installments` | `contract_id` | `contracts.id` | NOT NULL |
| `extras_orders` | `couple_id` | `couples.id` | NOT NULL |
| `c2_line_items` | `extras_order_id` | `extras_orders.id` | NOT NULL |
| `extras_installments` | `extras_order_id` | `extras_orders.id` | NOT NULL |
| `client_extras` | `couple_id` | `couples.id` | NOT NULL |
| `c3_line_items` | `client_extras_id` | `client_extras.id` | NOT NULL ⚠️ **MISSING — WO-989** |

### The Rule

> **Line items FK to their HEADER table, never to the grandparent (couples).**
> 
> `c1_line_items.contract_id` → `contracts.id` ✅  
> `c2_line_items.extras_order_id` → `extras_orders.id` ✅  
> `c3_line_items.client_extras_id` → `client_extras.id` ⚠️ MUST BE ADDED  
> `c3_line_items.couple_id` → `couples.id` ❌ THIS IS THE BUG

---

## RULE 2: NO ORPHANS

An **orphan** is a row that references a parent that doesn't exist.

### Types of Orphans

| Orphan Type | Example | How to Prevent |
|-------------|---------|----------------|
| **Detail without header** | `c3_line_items` row with no `client_extras` record | FK constraint (NOT NULL) |
| **Charge without invoice** | `couple_charges.source_id` pointing to nonexistent record | FK constraint on source_id |
| **Header without couple** | `contracts` row with invalid `couple_id` | FK constraint (already exists) |

### The Orphan Test

Run this before any release:

```sql
-- Find orphaned C3 line items (no header)
SELECT li.id, li.couple_id 
FROM c3_line_items li
LEFT JOIN client_extras ce ON li.client_extras_id = ce.id
WHERE ce.id IS NULL;

-- Find orphaned charges (source doesn't exist)
SELECT cc.id, cc.contract_type, cc.source_table, cc.source_id
FROM couple_charges cc
WHERE cc.source_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM contracts WHERE id = cc.source_id AND cc.source_table = 'contracts'
    UNION ALL
    SELECT 1 FROM extras_orders WHERE id = cc.source_id AND cc.source_table = 'extras_orders'
    UNION ALL
    SELECT 1 FROM client_extras WHERE id = cc.source_id AND cc.source_table = 'client_extras'
);
```

---

## RULE 3: SINGLE SOURCE OF TRUTH

Every financial number has ONE authoritative source. Other tables may cache or reference it, but the source is definitive.

| Data Point | Source of Truth | Other Locations (derived) |
|------------|----------------|--------------------------|
| C1 invoiced amount | `contracts.total` | `couple_charges` (C1 row) |
| C2 invoiced amount | `extras_orders.extras_sale_amount` | `couple_charges` (C2 row) |
| C3 invoiced amount | `client_extras.total` | `couple_charges` (C3 row) |
| C1 product details | `c1_line_items` | — |
| C2 product details | `c2_line_items` | — |
| C3 product details | `c3_line_items` | — |
| Payments received | `payments` | — |
| What was charged (ledger) | `couple_charges` | — |

### The Single Source Rule

> **If two tables contain the same number, one is the source and the other is derived.**
> **Never SUM both. Never trust the derived copy over the source.**
> **If they disagree, the source wins.**

### How the FinanceCard Should Read

| Column | Source |
|--------|--------|
| C1 Invoiced | `couple_charges` WHERE `contract_type = 'C1'` |
| C2 Invoiced | `couple_charges` WHERE `contract_type = 'C2'` |
| C3 Invoiced | `couple_charges` WHERE `contract_type = 'C3'` |
| C1 Received | `payments` WHERE `payment_type = 'contract'` |
| C2 Received | `payments` WHERE `payment_type = 'extras'` |
| C3 Received | `payments` WHERE `payment_type = 'client_extras'` |
| Balance | Invoiced - Received |

---

## RULE 4: SYMMETRICAL SCHEMA

When a new invoice type is added, it MUST follow the same structure as existing types.

### Checklist for New Invoice Type

- [ ] Header table created (one row per couple)
- [ ] Line items table created (FK to header, NOT to couples)
- [ ] FK constraints added (header→couples, line_items→header)
- [ ] NOT NULL on all FKs
- [ ] `product_code` FK to `product_catalog` on line items
- [ ] `couple_charges` row created when header is created
- [ ] Installments table created (if payment plan needed)
- [ ] Page component reads from header for existence check
- [ ] FinanceCard reads from `couple_charges` for invoiced amount

### The Symmetry Test

> **If you can describe a table relationship using "C1 has X" or "C2 has X", 
> then C3 MUST also have X. No exceptions.**

---

## RULE 5: COUPLE_CHARGES IS THE LEDGER

`couple_charges` is the **financial ledger**. It records what was invoiced. It does NOT store product details, payment schedules, or status.

### What Goes in couple_charges

| Column | Purpose |
|--------|---------|
| `couple_id` | Who was charged |
| `contract_type` | Which invoice (C1, C2, C3) |
| `amount` | How much was charged |
| `description` | Human-readable label |
| `charge_date` | When the charge was created |
| `source_table` | Which header table this came from |
| `source_id` | FK to the header record |

### What Does NOT Go in couple_charges

- Product codes (those go in line items)
- Payment information (that goes in `payments`)
- Status (that lives on the header table)
- Subtotal/HST split (that lives on the header or line items)

### When to Create a couple_charges Row

A `couple_charges` row is created when:
1. A contract is signed → C1 charge
2. An extras order is closed → C2 charge
3. A client extras sale is made → C3 charge

**Never create a charge without the corresponding header record existing first.**

---

## RULE 6: PRODUCT_CATALOG IS THE MASTER

Every product sold has a `product_code` in `product_catalog`. Line items reference this code.

```
product_catalog.product_code (master)
    ← c1_line_items.product_code (FK)
    ← c2_line_items.product_code (FK)
    ← c3_line_items.product_code (FK)
```

**Never invent a product code that isn't in the catalog.**  
**Never store product names in line items — join to the catalog.**

---

## RULE 7: ORDER OF OPERATIONS

When creating a new sale for a couple:

### For C1 (Contract)
1. Create `contracts` row (header)
2. Create `c1_line_items` rows (products included)
3. Create `contract_installments` rows (payment schedule)
4. Create `couple_charges` row (C1 ledger entry)

### For C2 (Frames & Albums)
1. Create `extras_orders` row (header)
2. Create `c2_line_items` rows (products sold)
3. Create `extras_installments` rows (payment schedule)
4. Create `couple_charges` row (C2 ledger entry)

### For C3 (Extras)
1. Create `client_extras` row (header) **← THIS WAS SKIPPED FOR 2025**
2. Create `c3_line_items` rows (products sold)
3. Create `couple_charges` row (C3 ledger entry)

**Never skip step 1. The header is the anchor for everything else.**

---

## RULE 8: THE PAGE READS FROM THE ARCHITECTURE

The couple detail page is ONE component. It works for ALL couples, ALL years.

| Page Section | Reads From | To Determine |
|-------------|-----------|--------------|
| Couple Resources — C1 exists? | `contracts` | Show "✓ View" or "No record" |
| Couple Resources — C2 exists? | `extras_orders` | Show "✓ View" or "No record" |
| Couple Resources — C3 exists? | `client_extras` | Show "✓ View" or "No record" |
| C1 Card — product list | `c1_line_items` JOIN `product_catalog` | What's in the package |
| C2 Card — product list | `c2_line_items` JOIN `product_catalog` | What was sold |
| C3 Card — product list | `c3_line_items` JOIN `product_catalog` | What was sold |
| Finance — invoiced | `couple_charges` | Dollar amounts |
| Finance — received | `payments` | What was paid |

**If a page section shows wrong data, the fix is ALWAYS one of:**
1. The data is missing → populate the correct table
2. The page reads from the wrong table → fix the component
3. The FK is missing → add the constraint

**The fix is NEVER:**
- Create a new table
- Hardcode values for specific years
- Deprecate an existing table that follows the pattern
- Guess numbers and insert them

---

## ANTI-PATTERNS (What NOT To Do)

| Anti-Pattern | What Happened | Rule Violated |
|--------------|---------------|---------------|
| Creating a header with guessed amounts | Cassandra's `client_extras` created with estimated subtotal/HST | Rule 3 (Single Source) |
| Proposing to deprecate `client_extras` | Table was nearly empty, so AI suggested removing it | Rule 4 (Symmetry) |
| Line items FK to grandparent | `c3_line_items.couple_id` instead of `client_extras_id` | Rule 1 (Header-Detail) |
| Summing two tables for same number | FinanceCard adds `couple_charges` + `client_extras` for C3 | Rule 3 (Single Source) |
| Creating charges without headers | `couple_charges` C3 rows with `source_id` pointing to nothing | Rule 2 (No Orphans) |
| Year-specific code paths | "If 2025 do X, if 2026 do Y" | Rule 8 (One Component) |

---

## LESSONS LEARNED (from this incident)

| # | Lesson |
|---|--------|
| 100 | **Before creating ANY financial record, verify the header exists.** The Header-Detail pattern requires headers first. If the header table is empty, the fix is to populate headers — not create line items without them, and not deprecate the header table. |
| 101 | **Line items FK to their header, not to the grandparent.** `c3_line_items` should FK to `client_extras.id`, just like `c2_line_items` FKs to `extras_orders.id`. If you find a line items table FKing to `couples`, that's a structural bug. |
| 102 | **Never guess financial numbers.** If you don't know the subtotal, HST, or total for a record, ASK. Don't calculate backwards from another table's number. The data owner (Jean) knows. The AI doesn't. |
| 103 | **The symmetry test catches missing architecture.** If C1 has it and C2 has it but C3 doesn't, that's a bug — not a design choice. Run the symmetry test before declaring any table "unnecessary." |

---

## VERIFICATION QUERIES

### Check All FKs Exist
```sql
SELECT 
  tc.table_name, kcu.column_name, ccu.table_name AS fk_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('c1_line_items','c2_line_items','c3_line_items','contracts','extras_orders','client_extras')
ORDER BY tc.table_name;
```

### Check Header-Detail Counts Match
```sql
SELECT 
  'C1' as type,
  (SELECT count(*) FROM contracts) as headers,
  (SELECT count(DISTINCT contract_id) FROM c1_line_items) as line_item_headers
UNION ALL
SELECT 'C2',
  (SELECT count(*) FROM extras_orders),
  (SELECT count(DISTINCT extras_order_id) FROM c2_line_items)
UNION ALL
SELECT 'C3',
  (SELECT count(*) FROM client_extras),
  (SELECT count(DISTINCT couple_id) FROM c3_line_items);  -- should be client_extras_id after WO-989
```

---

## CHANGE LOG

| Date | Version | Change |
|------|---------|--------|
| 2026-04-29 | 1.0 | Initial version — born from the C3 Orphan Incident |

---

*"The database is the constitution. If it allows bad data, bad data will happen."*  
— Spencer, after reading the FK constraints
