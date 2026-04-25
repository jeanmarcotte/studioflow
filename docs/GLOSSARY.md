# GLOSSARY.md
**StudioFlow — Domain & Technical Glossary**
**Version:** 1.0
**Created:** April 25, 2026
**Last Verified:** April 25, 2026

---

## Domain Terms (Wedding Photography Business)

| Term | Definition |
|------|------------|
| **Ballot** | A digital form filled out by a couple at a bridal expo. Captures names, wedding date, venue, guest count, vendor status. Stored in `ballots` table. |
| **BridalFlow** | SIGS Photography's lead capture and management system for bridal expos. Part of StudioFlow. |
| **C1** | The wedding photography/videography contract. Stored in `contracts` table. Viewed at `/admin/contracts/[id]/view`. |
| **C2** | The Frames & Albums sales presentation and order. Stored in `extras_orders` + `c2_line_items`. Viewed at `/admin/albums/[id]/view`. |
| **C3** | Additional extras sold outside of C2 (e.g., extra prints, canvases). Stored in `c3_line_items`. |
| **CCI** | Custom Colour Imaging — print lab for albums, portraits, thank you cards. Vaughan, Ontario. Orders via ROES app. |
| **Collage** | A trio canvas print from an engagement session. Product code: `PROD-ENG-COLLAGE`. Always ordered from Best Canvas. |
| **Couple** | A client couple. The central entity in StudioFlow. Every table connects back to `couples`. |
| **Crew Call Sheet** | The document sent to the photography team before a wedding listing times, locations, team members, and equipment. |
| **Eddie** | Eddie the Editor — Jean's AI photo editing system (CNN/ResNet). Current version: v2.0.0. Vision: autonomous photo lab. |
| **Engagement Session** | A pre-wedding photo session, typically at a park. Usually 1-2 hours. Proofs delivered via Dropbox. |
| **Extras Order** | A C2 frame and album sale for a couple. Stored in `extras_orders`. |
| **Fundy** | Fundy Album Designer — software Jean uses to design physical albums before sending to lab. |
| **Job** | A unit of production work. Could be proofs editing, album design, portrait printing, etc. Stored in `jobs` table. |
| **Lead Score** | A 0-300 score calculated by BridalFlow's algorithm, indicating how ready a couple is to book. |
| **Milestone** | A boolean flag on `couple_milestones` tracking one step in the client journey. 36 total (m01-m36). |
| **Parent Album** | An 8x10 album with 30 photos, typically ordered as a pair (one for each parent). Lab: CCI. |
| **PLW** | Pre-Location Walk — Jean visits the wedding venue with the couple before the wedding day to plan photo locations. |
| **Portal** | The Client Portal — a couple-facing page showing their photos, video, and payment status. At `/portal/[slug]`. |
| **PROD-ENG-PROOFS** | Product code for engagement proofs editing job. |
| **PROD-WED-PROOFS** | Product code for wedding proofs editing job. Creating this job auto-flips `couples.status` to `completed` if wedding date has passed. |
| **Proofs** | The edited photos from a wedding or engagement session, delivered to the couple for review. Exported to Dropbox. |
| **ROES** | Remote Order Entry System — CCI's ordering software. Used to submit print orders. |
| **Signing Book** | A small photo book placed at the wedding reception for guests to sign. |
| **Thank You Cards** | Custom photo cards designed in Photoshop, printed at CCI. Product code: `TYC-4X6-PC`. |
| **UAF** | Universal Album Factory — alternative print lab for albums and portraits. Orders via WeTransfer. |
| **VLW** | Video Location Walk — similar to PLW but for video planning. |
| **Wedding Frame** | A large framed portrait print. Usually 24x30 canvas from Best Canvas. |

---

## Technical Terms

| Term | Definition |
|------|------------|
| **ADR** | Architecture Decision Record — a short document capturing why a technical decision was made. Stored in `/docs/decisions/`. |
| **C4 Model** | A framework for visualizing software architecture at 4 levels: Context, Container, Component, Code. StudioFlow uses Level 1 and 2. |
| **Closeshop** | The end-of-session protocol. Generates 4 files: CLAUDE.md, WAKEUP.md, SESSION file, CLOSESHOP.md. |
| **`couple_milestones`** | The "brain" of StudioFlow. A table with 36 boolean columns tracking every couple's journey. One row per couple. |
| **Trigger** | A PostgreSQL database trigger that automatically executes a function when data changes (INSERT, UPDATE, DELETE). Used to auto-flip milestones. |
| **Work Order (WO)** | A tracked task in the `work_orders` table on the Ops Dashboard Supabase project. Auto-numbered via Postgres SEQUENCE. |
| **Spencer** | Friday's AI board member persona — Chief Technology Officer. Must approve all technical decisions before execution. |
| **Karen** | Saturday's AI board member persona — Chief Accountability Officer. Tracks commitments and calls out slippage. |

---

## Status Value Rules

| Table | Case Rule | Example |
|-------|-----------|---------|
| `couples.status` | Always lowercase | `'booked'` not `'Booked'` |
| `sales_meetings.status` | Title Case | `'Booked'` not `'booked'` |
| `work_orders.status` | Always lowercase | `'open'` or `'completed'` only |
| `jobs.status` | snake_case | `'in_progress'`, `'at_lab'` |

---

*Verified April 25, 2026.*
