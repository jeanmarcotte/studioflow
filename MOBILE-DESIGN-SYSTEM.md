# StudioFlow Mobile Design System
**Version:** 1.0
**Created:** 2026-04-23
**Applies to:** All StudioFlow + BridalFlow pages

---

## 1. RESPONSIVE PRIORITY ORDER

| Priority | User | Device | Viewport | Pages |
|----------|------|--------|----------|-------|
| 1 | Couple (client) | iPhone | 390px | Portal, wedding day form, order forms |
| 2 | Jean (admin, on the go) | iPhone | 390px | Production, couples, dashboard |
| 3 | Marianna (studio manager) | iPad Mini | 768px | BridalFlow, couples list |
| 4 | Jean (admin, at desk) | Desktop | 1280px+ | Everything — C2 presentations, data entry, reports |

---

## 2. BREAKPOINTS

| Name | Width | Tailwind | Usage |
|------|-------|----------|-------|
| Mobile | < 768px | default (no prefix) | Phone-first — this is the base |
| Tablet | 768px - 1023px | `md:` | iPad, Marianna's device |
| Desktop | 1024px+ | `lg:` | Jean at desk, full layouts |
| Wide | 1280px+ | `xl:` | Large monitors, optional |

**Rule:** Write mobile styles first (no prefix), then add `md:` and `lg:` for larger screens. Never write desktop-first with overrides downward.

---

## 3. SHARED LAYOUT (Admin Shell)

### Mobile (< 768px)
- Sidebar: HIDDEN (display: none)
- Navigation: Fixed bottom nav bar (64px) — Home, Couples, Photo, Video, More
- Content: Full viewport width, pb-20 bottom padding
- Hamburger: Top-left, opens slide-over sidebar overlay

### Tablet (768px - 1023px)
- Sidebar: Collapsed to icons (w-16)
- Navigation: Sidebar icons only, no bottom nav
- Content: Full width minus sidebar

### Desktop (1024px+)
- Sidebar: Expanded (w-64) with labels
- Navigation: Full sidebar
- Content: Full width minus sidebar

---

## 4. PAGE TYPE SCHEMAS

### 4.1 LIST Pages (tables of records)

**Examples:** Couples list, production photo/video, sales quotes, sales frames, orders, team members

**Desktop Layout:**
```
┌──────────────────────────────────────────────┐
│ [Title]                    [Filters] [+ New] │
│ ┌──────────────────────────────────────────┐ │
│ │ Metric Cards (2-4 columns)               │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Filter Pills / Tabs                      │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ Data Table (full columns, sortable)      │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Mobile Layout:**
```
┌─────────────────────┐
│ [Title]      [+ New]│
├─────────────────────┤
│ Metric Cards        │
│ (horizontal scroll) │
├─────────────────────┤
│ [Search________] 🔍 │
├─────────────────────┤
│ Filter Pills (wrap) │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Card: Couple 1  │ │
│ │ Status | Date   │ │
│ │ Key metric      │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Card: Couple 2  │ │
│ │ Status | Date   │ │
│ │ Key metric      │ │
│ └─────────────────┘ │
│ ... (card stack)    │
└─────────────────────┘
```

**Mobile Rules:**
- Tables become card stacks (NO horizontal scroll tables on phone)
- Each card shows: name, status badge, 1-2 key fields, tap to navigate
- Metric cards: horizontal scroll row, not grid
- Filters: wrap to multiple rows, search bar full width
- Sort: dropdown instead of column headers
- "+ New" button: stays top-right, compact

---

### 4.2 DETAIL Pages (single record view)

**Examples:** Couple detail (/admin/couples/[id]), order detail, lead detail

**Desktop Layout:**
```
┌──────────────────────────────────────────────┐
│ [← Back] [Name]              [Status Badge]  │
├──────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ Zone 1  │ │ Zone 2  │ │ Zone 3  │        │
│ │(3 cols) │ │         │ │         │        │
│ └─────────┘ └─────────┘ └─────────┘        │
├──────────────────────────────────────────────┤
│ Section 2 (2 columns)                        │
├──────────────────────────────────────────────┤
│ Section 3 (full width)                       │
└──────────────────────────────────────────────┘
```

**Mobile Layout:**
```
┌─────────────────────┐
│ [←] Name    [Badge] │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Key Info Card   │ │
│ │ (most important │ │
│ │  fields only)   │ │
│ └─────────────────┘ │
│                     │
│ ▶ Contract Details  │ ← collapsible accordion
│ ▶ Financial Summary │
│ ▶ Production Status │
│ ▶ Team & Engagement │
│ ▶ Communication     │
└─────────────────────┘
```

**Mobile Rules:**
- Multi-column grids collapse to single column
- Sections become collapsible accordions (shadcn Collapsible)
- Most important info stays visible at top (name, status, wedding date, next action)
- Secondary sections collapsed by default
- No horizontal scrolling ever

---

### 4.3 DASHBOARD Pages (metrics + widgets)

**Examples:** Admin home, finance overview, sales revenue, production report

**Desktop Layout:**
```
┌──────────────────────────────────────────────┐
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                │
│ │Stat│ │Stat│ │Stat│ │Stat│  (4 columns)   │
│ └────┘ └────┘ └────┘ └────┘                │
├──────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐           │
│ │ Chart / List │ │ Chart / List │           │
│ └──────────────┘ └──────────────┘           │
└──────────────────────────────────────────────┘
```

**Mobile Layout:**
```
┌─────────────────────┐
│ Stat Cards          │
│ ← scroll →          │
│ [💰$12K] [📊43] ... │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Chart (full w)  │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ List / Table    │ │
│ │ (card stack)    │ │
│ └─────────────────┘ │
└─────────────────────┘
```

**Mobile Rules:**
- Stat cards: horizontal scroll row (flex-nowrap overflow-x-auto)
- Charts: full width, reduce height to ~200px
- Multi-column widgets: stack vertically
- Tables within dashboards: convert to card stacks

---

### 4.4 FORM Pages (data entry)

**Examples:** Wedding day form, contract generation, new quote, crew confirm, extras form

**Desktop Layout:**
```
┌──────────────────────────────────────────────┐
│ [Title]                          [Save/Submit]│
├──────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐           │
│ │ Field 1      │ │ Field 2      │ (2 cols)  │
│ └──────────────┘ └──────────────┘           │
│ ┌──────────────────────────────┐            │
│ │ Field 3 (full width)        │            │
│ └──────────────────────────────┘            │
└──────────────────────────────────────────────┘
```

**Mobile Layout:**
```
┌─────────────────────┐
│ [Title]              │
├─────────────────────┤
│ Step 1 of 4   ●○○○  │ ← step indicator if multi-section
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Field 1 (full)  │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Field 2 (full)  │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Field 3 (full)  │ │
│ └─────────────────┘ │
├─────────────────────┤
│      [Next →]       │
└─────────────────────┘
```

**Mobile Rules:**
- All fields single column (grid-cols-1)
- Long forms: break into steps/sections with progress indicator
- Submit/Save: sticky bottom button on mobile
- Dropdowns: full width
- Date pickers: native mobile date input where possible
- Labels above inputs (never beside)

---

### 4.5 PRESENTATION Pages (print / client-facing)

**Examples:** C1 Contract view, C2 Frames & Albums view, C3 Extras view, document views

**Rule: DESKTOP ONLY — No mobile layout needed.**

These pages are:
- Viewed on desktop/laptop before printing (Ctrl+P)
- Fixed width (8.5in) for print accuracy
- Used during in-person sales meetings (studio computer)

On mobile, show a message:
```
┌─────────────────────┐
│ 📄                  │
│ This document is    │
│ designed for        │
│ desktop viewing     │
│ and printing.       │
│                     │
│ [Open on Desktop]   │
│ (copies URL)        │
└─────────────────────┘
```

---

## 5. COMPONENT PATTERNS

### 5.1 Tables → Cards (Mobile)

Desktop table:
| Couple | Date | Status | Amount |
|--------|------|--------|--------|

Mobile card:
```
┌─────────────────────┐
│ Sara & Rocco  [Booked] │
│ SAT June 14, 2026      │
│ $4,200                  │
│                    [→]  │
└─────────────────────┘
```

**Pattern:**
- Card shows: primary field (name), status badge, 1-2 secondary fields
- Tap entire card to navigate (not just arrow)
- No actions dropdown on mobile — actions on detail page

### 5.2 Metric Cards (Mobile)

Horizontal scroll row:
```
← [💰 Revenue $12,345] [📊 Jobs 43] [📷 Photos 161] [✅ Done 89%] →
```

- `flex flex-nowrap overflow-x-auto gap-3 pb-2`
- Each card: `min-w-[140px] flex-shrink-0`
- Snap scroll: `scroll-snap-type: x mandatory`

### 5.3 Filters (Mobile)

```
┌─────────────────────┐
│ [Search____________] │
│ [All] [Wedding] [Eng]│ ← pill buttons, wrap
│ [2026 ▼] [Status ▼] │ ← dropdowns, full width
└─────────────────────┘
```

### 5.4 Grid Collapse Rules

| Desktop | Mobile | Tailwind Pattern |
|---------|--------|-----------------|
| grid-cols-2 | grid-cols-1 | `grid-cols-1 md:grid-cols-2` |
| grid-cols-3 | grid-cols-1 | `grid-cols-1 md:grid-cols-3` |
| grid-cols-4 | grid-cols-1 | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` |
| grid-cols-6 | grid-cols-2 | `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` |

**NEVER write `grid-cols-X` without a responsive prefix chain starting from mobile.**

---

## 6. TYPOGRAPHY (Mobile)

| Element | Desktop | Mobile |
|---------|---------|--------|
| Page title | text-2xl (24px) | text-xl (20px) |
| Section header | text-lg (18px) | text-base (16px) |
| Body | text-sm (14px) | text-sm (14px) |
| Card labels | text-xs (12px) | text-xs (12px) |
| Stat numbers | text-3xl (30px) | text-2xl (24px) |

---

## 7. TOUCH TARGETS

Minimum touch target: 44px × 44px (Apple HIG)
- All buttons, links, and interactive elements must be at least 44px tall on mobile
- Spacing between interactive elements: minimum 8px

---

## 8. PAGES EXCLUDED FROM MOBILE

These pages are intentionally desktop-only:
- /admin/contracts/[id]/view — Print document
- /admin/albums/[id]/view — Print document
- /admin/extras/[id]/view — Print document
- /admin/documents/photo-order/[id] — Print document
- /admin/documents/video-order/[id] — Print document
- /admin/documents/wedding-day-form/[id] — Print document
- /admin/sales/frames/new/[coupleId] — C2 Sales Presentation (in-person, studio computer)

On mobile, these show the "Open on Desktop" message from section 4.5.

---

## 9. shadcn COMPONENT USAGE

| Pattern | Component | Usage |
|---------|-----------|-------|
| Card stack (mobile tables) | `Card` | Replace tables on mobile |
| Collapsible sections | `Collapsible` | Detail page sections |
| More menu | `Sheet side="bottom"` | Bottom nav overflow |
| Sidebar overlay | `Sheet side="left"` | Mobile hamburger menu |
| Filter dropdowns | `Select` | Mobile-friendly dropdowns |
| Sort control | `Select` | Replace sortable column headers |
| Status badges | `Badge` | Consistent across all views |
| Loading states | `Skeleton` | Card-shaped on mobile, row-shaped on desktop |

---

## 10. IMPLEMENTATION CHECKLIST

For every page being made mobile-responsive:
- [ ] All grids have mobile-first breakpoint chain (grid-cols-1 → md: → lg:)
- [ ] Tables have mobile card view alternative
- [ ] No fixed widths without responsive override
- [ ] Touch targets ≥ 44px
- [ ] Bottom padding accounts for nav bar (pb-20)
- [ ] Typography scales per section 6
- [ ] Tested at 390px viewport width
- [ ] Dark mode works on mobile
- [ ] No horizontal scroll (except intentional metric card rows)
