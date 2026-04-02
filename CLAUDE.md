# CLAUDE.md — StudioFlow CRM
**Last Updated:** April 3, 2026
**Repo:** jeanmarcotte/studioflow
**App URL:** https://studioflow-zeta.vercel.app
**Supabase Project ID:** ntysfrgjwwcrtgustteb

---

## WHAT IS THIS APP

StudioFlow is the business management CRM for SIGS Photography (Toronto/Vaughan, 35+ weddings/year). It handles couples, contracts, payments, photo/video production tracking, quotes, frame sales, and team scheduling. BridalFlow (lead capture from bridal shows) shares this same repo and Supabase project.

**Two modes:**
- **Client Mode** (`/client/*`) — Couple-facing pages (quote builder, wedding day form)
- **Admin Mode** (`/admin/*`) — Jean's backend (production, sales, finance, team, couples)

---

## TECH STACK

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (loosely typed — see Rule 6) |
| Styling | Tailwind CSS + shadcn/ui component library (see Rule 2 & 3) |
| Fonts | Playfair Display (headings) + Nunito (body) — not all pages use them |
| Icons | Lucide React ONLY |
| Database | Supabase (PostgreSQL) |
| Auth | Google OAuth via Supabase |
| Hosting | Vercel (deploys on push to main) |
| Email | Resend via noreply@sigsphoto.ca |

---

## ARCHITECTURE RULES (13 Rules)

### Rule 1: Page File Size & Composition

Page files (`page.tsx`) must be thin shells — max ~200 lines. They fetch data, manage top-level state, and compose imported components. All UI rendering, tables, forms, and business logic belong in dedicated components.

**Good example:** `src/app/admin/couples/[id]/page.tsx` (306 lines) — imports Q01-Q13 components, page itself renders almost no HTML.

**Bad examples (do NOT replicate):**
- `src/app/admin/production/photo/page.tsx` — 1,164 lines, all inline
- `src/app/admin/production/video/page.tsx` — 1,317 lines, all inline
- `src/app/client/new-quote/page.tsx` — 2,596 lines, all inline

**New pages:** Create as shell, components go in `src/components/{feature}/`.
**Existing monolithic pages:** Do NOT refactor unprompted. Patch in-place. Extract only if adding a major new section.

### Rule 2: Use shadcn/ui for Shared UI Primitives

shadcn/ui is the component library for StudioFlow. Components live in `src/components/ui/`.

- **New pages:** Use shadcn components (Button, Badge, Table, Card, Dialog, Select, Collapsible, etc.) instead of building from raw HTML + Tailwind
- **Old pages:** Still use inline Tailwind — do NOT refactor them to shadcn unless doing a full page rebuild
- **Adding shadcn components:** Use `npx shadcn-ui@latest add <component>` to install new ones as needed
- **Customization:** shadcn copies components as regular files into `src/components/ui/` — you can edit them freely

**Note:** shadcn uses the CSS variables already configured in `tailwind.config.js` (`--primary`, `--muted`, `--border`, etc.), so components will match the existing color system automatically.

### Rule 3: Styling — Tailwind + shadcn/ui + CSS Variables

`tailwind.config.js` has CSS variable mappings (`--primary`, `--muted`, `--border`, etc.) that shadcn components consume automatically.

- **New pages:** Use shadcn components from `@/components/ui/*` + Tailwind utility classes
- **Old pages:** Still use raw Tailwind + hardcoded hex values — match their existing style when patching
- CSS variable classes work everywhere (`text-muted-foreground`, `bg-background`, etc.)
- When building new UI, prefer shadcn components over hand-building from raw HTML

### Rule 4: Design Tokens — Couples Page Only

`src/components/couples/designTokens.ts` defines a full token system. Used ONLY by Q01-Q13 couple detail components.

- **Editing couple detail components:** Import and use `designTokens.ts`
- **Editing ANY other page:** Do NOT import `designTokens.ts`. Use Tailwind classes directly. Match existing style of that page.

### Rule 5: Data Access Pattern

Data access is split across:
1. `src/lib/supabase.ts` — 400-line file with auth helpers + couple/quote CRUD
2. Inline `supabase.from()` calls directly in page components (50+ occurrences)

No custom hooks, no `/services/` folder, no `/hooks/` folder exist.

- Follow the existing pattern of the page you're editing
- If page uses `src/lib/supabase.ts` functions, use those
- If page does inline `supabase.from()`, add new queries in same style
- Do NOT create custom hooks or services layer unless explicitly asked
- API routes (`src/app/api/`) are for server-side mutations (PDF, email). Read-only fetching is client-side.

### Rule 6: TypeScript — Match Existing Looseness

- Interfaces defined inline at top of each page file (not shared)
- `any` type used 20+ times across codebase
- No Supabase-generated types (`Database` type doesn't exist)
- Only shared type file: `src/types/team-notes.ts`

When adding new code: define interfaces at top of file, prefer typed over `any` for new code, don't refactor existing `any` unless asked, don't run `supabase gen types` unless asked.

### Rule 7: Icons — Lucide React Only

All icons from `lucide-react`. No Heroicons, FontAwesome, or others. Check existing imports before adding new icons.

### Rule 8: Font Usage

- **Playfair_Display** — headings/section titles (serif, weight 700)
- **Nunito** — body text (sans-serif, weights 400/600/700)

Imported via `next/font/google`. Not all pages use them. Match the page you're editing.

### Rule 9: Layout Patterns

**A. Full-width with collapsible sections (most pages):**
```
<div className="space-y-0">
  <header />                    — title + action buttons
  <filters />                   — search, category dropdowns
  <collapsible-section />       — repeated for each data group
</div>
```

**B. Two-column with stats sidebar (production pages, frames page):**
```
<div className="flex">
  <main className="flex-1 border-r" />           — tables, filters
  <aside className="w-[280px] hidden lg:block" /> — stat cards, YoY
</div>
```

New page? Ask which layout. Existing page? Preserve its layout.

### Rule 10: Supabase Client Import

Always:
```typescript
import { supabase } from '@/lib/supabase'
```

Never use `createClient()` directly. Never use `createClientComponentClient()` or other Next.js Supabase wrappers.

### Rule 11: Currency Formatting

- Couple detail components: `fmt` from `designTokens.ts` → `Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })`
- Other pages: inline `$${amount.toLocaleString()}` or `$${amount.toFixed(2)}`

Match the page you're editing. All amounts are CAD.

### Rule 12: Status/Badge Color Conventions

| Status | Color |
|--------|-------|
| Active / In Progress | `blue-100/blue-700` |
| Completed / Success | `green-100/green-700` or `teal-100/teal-700` |
| Warning / Pending | `amber-100/amber-700` |
| Declined / Error | `red-100/red-700` or `rose-100/rose-700` |
| Neutral / Default | `gray-100/gray-700` or `stone-100/stone-700` |
| At Lab / Special | `indigo-100/indigo-700` |

### Rule 13: Always Commit and Push

After ANY code changes: `git add`, `git commit`, `git push`. Never leave files uncommitted. Vercel deploys on push to main.

---

## MIGRATION STRATEGY (Incremental)

**We do NOT refactor working pages.** Instead:

| Situation | Action |
|-----------|--------|
| NEW page | Build with full architecture (thin shell + components) |
| OLD page, < 20 line change | Patch in place, match existing patterns |
| OLD page, new section/feature | Extract as component, keep rest as-is |
| OLD page, major overhaul | Full rebuild — planned event, not forced |

**Wedding Season Pragmatism:** A working patch beats a half-finished rebuild.

---

## STATUS VALUES

### Couple Status (`couples.status`) — ALWAYS LOWERCASE
| Value | Color | Meaning |
|-------|-------|---------|
| `lead` | Gray | Initial inquiry |
| `quoted` | Yellow | Quote sent |
| `booked` | Green | Contract signed |
| `completed` | Blue | All delivered |
| `cancelled` | Red | Cancelled |

### Extras Order Status (`extras_orders.status`)
| Value | Color | Meaning |
|-------|-------|---------|
| `pending` | Yellow | Quote given, awaiting decision |
| `signed` | Green | Deal closed, payments in progress |
| `completed` | Blue | Delivered |
| `declined` | Red | Said no after quote |

**DEPRECATED — DO NOT USE:** `active`, `paid`

### Quote Status (`client_quotes.status`)
| Value | Color | Meaning |
|-------|-------|---------|
| `draft` | Gray | Created, not sent |
| `sent` | Blue | Emailed to couple |
| `converted` | Green | Accepted, contract created |
| `expired` | Gray | 14+ days |
| `lost` | Red | Declined or went elsewhere |

---

## CORE TERMINOLOGY

Use these words precisely. No synonyms.

| Term | Definition |
|------|------------|
| **Action** | Human does something in the system |
| **Event** | Recorded fact that action happened (immutable) |
| **Trigger** | Event that automatically causes something else |
| **Milestone** | Boolean flag = event occurred (once true, stays true) |
| **Status** | Current state of an entity (can change) |

**The Flow:** `ACTION → EVENT → TRIGGER → MILESTONE/STATUS`

**Page Types:**
| Type | Purpose | Data Operations |
|------|---------|-----------------|
| **Production** | Where work happens | WRITE |
| **Display** | Where data is viewed | READ only |
| **Detail** | Scoreboard for single entity | READ only |

**Critical:** Couple detail page is READ-ONLY. All editing happens in Production pages.

---

## THREE-LEVEL PAGE ARCHITECTURE (Locked)

All entity pages follow: **List → Production → Detail**

| Level | Purpose | Data |
|-------|---------|------|
| Level 1 | Portfolio list — see all records | READ |
| Level 2 | Production — work surface | WRITE |
| Level 3 | Individual detail — scoreboard | READ |

---

## DATABASE TABLES (Supabase ntysfrgjwwcrtgustteb)

### Core Tables
| Table | Purpose | Notes |
|-------|---------|-------|
| `couples` | Master couple records | 73+ rows. Status must be lowercase. |
| `contracts` | Contract details | Source of truth for `reception_venue` and `ceremony_location` |
| `contract_installments` | Payment schedules | 3 sale types |
| `payments` | Payment records | |
| `couple_milestones` | Boolean milestone tracking | m01–m36 with intentional gaps (m17, m18, m21, m23 deleted) |

### Sales Tables
| Table | Rows | Purpose |
|-------|------|---------|
| `client_quotes` | 7 | Quotes page |
| `extras_orders` | 49 | Frame Sales (C2). `extras_sale_amount` is source of truth, NOT `total` |
| `client_extras` | 19 | Extras page (TBD) |
| `addon_invoices` | | Sale 3 type |

### Production Tables
| Table | Purpose |
|-------|---------|
| `photo_jobs` | Photo production tracking. Source of truth for waiting status. |
| `video_jobs` | Video production (34 rows) |
| `studio_pickup_items` | Manual "At Studio" tracking |

### Other Tables
| Table | Purpose |
|-------|---------|
| `ballots` | BridalFlow leads (115 rows). NOT "leads" — table is called `ballots`. |
| `sales_meetings` | Completed sales meeting tracker (18 rows) |

---

## LEDGER ARCHITECTURE RULES (Locked)

1. **Balance = SUM(couple_charges) − SUM(payments)** — ALWAYS calculated live, NEVER stored
2. **C1 matching STOPS at C2 signing date** — post-C2 payments belong to C2 schedule
3. **contract_balance_remaining is SACRED** — trust Marianna's number, never recalculate
4. **Q10 = extras_orders, Q11 = client_extras** — NEVER swap these tables
5. **Milestones are manually managed** — no auto-population from other tables
6. **C2 standard installment descriptions are hardcoded** — not stored in DB
7. **last_installment_amount = 2× standard installment** — must be set per couple
8. **couples.balance_owing is a STALE column** — never display it, always recalculate

---

## REFERENCE DESIGN: PHOTO PRODUCTION PAGE

File: `src/app/admin/production/photo/page.tsx` (1,164 lines)
- Legacy page — raw Tailwind CSS (pre-shadcn)
- Playfair Display + Nunito fonts
- Lucide React icons
- Collapsible sections via `collapsedLanes` state (Set<string>)
- Two-column flexbox: main panel + stats sidebar

**New production/sales pages should match this design language but use shadcn components instead of raw HTML.**

---

## SUPABASE PATTERNS

- **Use `.limit(1)` not `.single()`** — `.single()` throws error when >1 row exists
- Always import client from `@/lib/supabase`
- `supabase.from('table').select()` for reads
- API routes for server-side mutations only
- Status values are exact strings: `'booked'` not `'Booked'`

---

## BRIDALFLOW (Same Repo)

- Main table: `ballots` (NOT "leads")
- `show_id` uses STRING SLUGS: `modern-feb-2026`, `weddingring-oakville-mar-2026`
- `service_needs`: `photo_video`, `photo_only`, `video_only`
- Violet rows = video-only leads
- Phone: auto-format mask `(123) 456-7890`
- Integration: `/api/ballots/appointments` fetches `status='appointment'` ballots
- `onAppointmentBooked()` in `lib/bridalflow-bridge.ts` auto-creates StudioFlow entries

---

## LESSONS LEARNED (Code-Relevant Only)

- **LESSON-006:** Page flashes content A then B → convert to Server Component
- **LESSON-007:** Code looks correct but Vercel serves old version → push a new commit
- **LESSON-008:** `extras_orders.total` = retail template price. Use `extras_sale_amount` as source of truth.
- **LESSON-009:** Tailwind `text-right` gets overridden in admin context → use `style={{ textAlign: 'right' }}`
- **LESSON-010:** Status values must be lowercase. `couples.status = 'booked'` not `'Booked'`
- **LESSON-011:** `.single()` fails when >1 row. Use `.limit(1)` + `?.[0] ?? null`
- **LESSON-012:** Don't iterate on UI — specify COMPLETE design in first prompt
- **LESSON-013:** Tables with 3 items = wrong pattern. Use cards.
- **LESSON-015:** When rebuilding from scratch, AUDIT old version feature-by-feature first
- **LESSON-017:** Unicode escapes (`\u2014`) don't render in JSX text — use literal characters
- **LESSON-023:** Use precise terminology (Action/Event/Trigger/Milestone/Status) — no synonyms
- **LESSON-024:** Query actual database structure BEFORE writing code
- **LESSON-025:** Ask for business terminology — don't use column names as UI labels
- **LESSON-026:** When told "page must match X" — actually look at X and match it
- **LESSON-027:** When told "don't use table Y" — don't use table Y
- **LESSON-028:** Verify queries against actual data before writing code
- **LESSON-029:** Learn from feedback — don't repeat same mistakes

---

## KEY RULES (Non-Architecture)

1. **ALL tables must have sortable columns** — don't ask, just include
2. **If scope expands beyond 60 seconds, STOP and ask**
3. **SIGS fiscal year:** May 1 – April 30
4. **`contracts` table** is source of truth for `reception_venue` and `ceremony_location`
5. **Couple detail page is READ-ONLY** — all editing in Production pages
6. **Use inline styles for critical alignment** — Tailwind can be purged
7. **Production report cron:** `CRON_SECRET=sigs-prod-report-2026`, Sun+Thu 9AM Toronto
8. **Resend domain verified** — `noreply@sigsphoto.ca` working
9. **Admin notifications:** Always send to `jeanmarcotte@gmail.com` AND `info@sigsphoto.ca`

---

## DEBUGGING PROTOCOL

**After 2 failed attempts at ANY bug:**
1. STOP trying solutions
2. READ THE LOGS (Vercel Build → Runtime → Function)
3. CHECK THE DATA via Supabase MCP — what's actually in the DB?
4. TRACE THE FULL PATH: Input → Processing → Storage → Query → Display

**After 4 failed attempts:**
1. PAUSE. Ask: "Are we solving the right problem?"
2. Generate a DIAGNOSIS REPORT before trying anything else

**NEVER:** Keep trying variations of the same fix. Guess without reading errors.

---

## GOOD PATTERNS TO KEEP

1. **Couple detail Q-components** (Q01-Q13) — the right extraction pattern
2. **designTokens.ts structure** — good for its scope, just don't expand without asking
3. **Photo Production collapsible lanes** — good UX pattern, use shadcn Collapsible for new pages
4. **shadcn/ui** — use for all new shared UI (Button, Badge, Table, Card, Dialog, Select, etc.)
