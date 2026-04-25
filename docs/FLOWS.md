# FLOWS.md
**StudioFlow — Runtime Flow Views**
**Version:** 1.0
**Created:** April 25, 2026
**Last Verified:** April 25, 2026

---

## Flow 1: Lead → Booked Couple

What happens when a couple goes from first contact to signed contract.

```mermaid
sequenceDiagram
    participant Couple
    participant BridalFlow
    participant DB as Supabase
    participant StudioFlow
    participant Email as Resend

    Couple->>BridalFlow: Fill out ballot at expo
    BridalFlow->>DB: INSERT ballots
    DB->>DB: trigger: score_lead_on_insert (0-300)
    Note over DB: m01 NOT auto-flipped here (couple doesn't exist yet)

    StudioFlow->>DB: INSERT sales_meetings (appt booked)
    Couple->>StudioFlow: Attend consultation
    StudioFlow->>DB: INSERT client_quotes (quote created)
    StudioFlow->>Email: Send quote PDF to couple

    Couple->>StudioFlow: Accept quote
    StudioFlow->>DB: UPDATE client_quotes.status → 'booked'
    DB->>DB: trigger: on_quote_status_change
    DB->>DB: convert_quote_to_contract()
    Note over DB: Creates: couple, contract, installments
    Note over DB: Seeds: m01, m02, m03, m04, m05 = true
    DB->>DB: INSERT couple_milestones (all booking milestones true)
```

---

## Flow 2: Engagement Session (Photo)

What happens from engagement shoot through delivery.

```mermaid
sequenceDiagram
    participant Jean
    participant SF as StudioFlow
    participant DB as Supabase
    participant Lab as CCI/UAF
    participant Couple

    Jean->>SF: Create job: PROD-ENG-PROOFS
    SF->>DB: INSERT jobs (engagement, in_progress)
    DB->>DB: trigger: flip_engagement_milestones → m06 = true

    Jean->>SF: Update status → completed
    DB->>DB: trigger: m07 = true

    Jean->>SF: Export proofs, send to couple via Dropbox
    Note over Jean,Couple: Currently no system tracking of this step

    Couple->>Jean: Send order list (email/text)
    Jean->>SF: Create physical jobs (collage, frames)
    Jean->>SF: Update status → at_lab
    DB->>DB: trigger: m08 = true

    Lab->>Jean: Items ready
    Jean->>SF: Update status → at_studio
    DB->>DB: trigger: m09 = true

    Couple->>Jean: Pick up items
    Jean->>SF: Update status → picked_up
    DB->>DB: trigger: m14 = true
```

---

## Flow 3: Wedding Photo Production (POST-WEDDING)

What SHOULD happen after the wedding — currently most milestones don't auto-flip.

```mermaid
sequenceDiagram
    participant Jean
    participant SF as StudioFlow
    participant DB as Supabase
    participant Eddie as Eddie 3.0
    participant Dropbox
    participant Pixieset
    participant Lab as CCI/UAF/Best Canvas
    participant Couple

    Note over Jean: Wedding day (m19 — NO TRIGGER)
    Jean->>Jean: Backup cards to Thunderbolt + HD 31
    Note over DB: m20 Files Backed Up — NO TRIGGER

    Jean->>SF: Create job: PROD-WED-PROOFS
    SF->>DB: INSERT jobs
    DB->>DB: trigger: trg_auto_complete_couple_on_proofs (flips couples.status if wedding passed)

    Jean->>Eddie: Import to Lightroom, run Eddie 3.0
    Jean->>Jean: Quality pass — review every image
    Jean->>Dropbox: Export proofs to [Couple]_WEDPROOFS folder
    Jean->>Couple: Send 2 emails (Dropbox + custom letter)
    Note over DB: m22 Proofs Edited — NO TRIGGER

    Couple->>Jean: Order list (portraits, albums, TYC)
    Jean->>SF: Create physical jobs per item
    DB->>DB: trigger: m24 = true (photo order in)

    loop Per album (can repeat 8+ times)
        Jean->>Jean: Find photos, export, design in Fundy
        Jean->>Pixieset: Upload album version (e.g., P1V3)
        Jean->>Couple: Send Pixieset link for review
        Couple->>Jean: Request changes (email)
        Jean->>Jean: Re-edit, re-export, re-upload
    end

    Couple->>Jean: Approve (email)
    Note over DB: Client approval — NO SYSTEM CAPTURE

    Jean->>Lab: Submit final files (ROES/WeTransfer/online)
    Note over DB: m26 Photo Order to Lab — NO TRIGGER

    Lab->>Jean: Items ready
    Jean->>SF: Update status → at_studio
    Note over DB: m29 Lab Order Back — NO TRIGGER

    Jean->>Jean: Prep at studio, print pickup slip
    Note over DB: m32 Ready at Studio — NO TRIGGER

    Couple->>Jean: Pick up
    Note over DB: m34 Items Picked Up — NO TRIGGER
```

**This flow makes visible every gap.** The engagement flow (Flow 2) has full trigger coverage. The wedding flow (Flow 3) has almost none.

---

## Flow 4: Video Production

```mermaid
sequenceDiagram
    participant Jean
    participant SF as StudioFlow
    participant DB as Supabase
    participant Dropbox
    participant Couple

    Note over Jean: Wait for photo order first (couple must order photos before video starts)

    Jean->>SF: Create video job (longform)
    Jean->>Jean: Copy from LaCie → NVME, rename folder "- Active"
    Jean->>Jean: Run proxies, update production page

    Jean->>Jean: Organize footage on timeline by location (1hr)
    Jean->>Jean: Edit ceremony (no-thinking work)
    Jean->>Jean: Edit reception (no-thinking work)
    Jean->>Jean: Real editing — music-driven segments

    Jean->>Dropbox: Upload to Dropbox + Marketing drive + LaCie
    Jean->>Couple: Send email with Dropbox link
    Note over DB: m27 Video Long Form — NO TRIGGER

    Couple->>Jean: Request changes (email)
    Note over DB: No system capture of video revision cycle
    Jean->>Jean: Re-edit, re-upload, repeat

    Couple->>Jean: Approve
    Jean->>SF: Mark complete
    Note over DB: m28 Recap — NO TRIGGER (if recap also done)

    Jean->>Jean: Archive raw footage
```

---

## Flow 5: Payment → Final Close

```mermaid
sequenceDiagram
    participant Couple
    participant Jean
    participant DB as Supabase

    Couple->>Jean: E-transfer payment
    Jean->>DB: INSERT payments
    DB->>DB: trigger: check_and_flip_m33 (checks balance_due ≤ 0)
    Note over DB: If balance = 0 → m33 = true

    Note over Jean: All items picked up?
    Note over DB: m34 — NO TRIGGER (should fire when ALL jobs → picked_up)

    Note over Jean: Archive files
    Note over DB: m35 — BLOCKED (archive system not built)

    Note over DB: m36 — should auto-fire when ALL m01-m35 = true
```

---

## Summary: Trigger Coverage by Flow

| Flow | Steps | Steps with Triggers | Gap |
|------|-------|-------------------|-----|
| Lead → Booked | 5 | 5 (m01-m05) | ✅ None |
| Engagement | 7 | 5 (m06-m09, m14) | 2 missing (m10, m11) |
| Wedding Photo | 12 | 2 (m24, couples.status) | 10 missing |
| Video | 6 | 0 | 6 missing |
| Payment → Close | 4 | 1 (m33) | 3 missing |

---

*Verified against production database and workflow interviews on April 25, 2026.*
