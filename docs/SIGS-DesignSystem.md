# SIGS Design System
**Version:** 1.1
**Last Updated:** April 1, 2026
**Scope:** All StudioFlow + BridalFlow pages

---

## 1. STATUS VALUES & COLORS

### 1.1 Couple Status (couples — use phase column or booked_date IS NOT NULL)
| Value | Color | Badge | Meaning |
|-------|-------|-------|---------|
| lead | Gray | bg-gray-100 text-gray-700 | Initial inquiry |
| quoted | Yellow | bg-yellow-100 text-yellow-700 | Quote sent |
| booked | Green | bg-green-100 text-green-700 | Contract signed |
| completed | Blue | bg-blue-100 text-blue-700 | All deliverables delivered |
| cancelled | Red | bg-red-100 text-red-700 | Cancelled/refunded |

### 1.2 Extras Order Status (extras_orders.status)
| Value | Color | Badge |
|-------|-------|-------|
| pending | Yellow | bg-yellow-100 text-yellow-700 |
| signed | Green | bg-green-100 text-green-700 |
| paid | Green | bg-green-100 text-green-700 |
| completed | Blue | bg-blue-100 text-blue-700 |
| declined | Red | bg-red-100 text-red-700 |
| no_sale | Gray | bg-gray-100 text-gray-700 |

### 1.3 Job Status Colors
| Status | Badge |
|--------|-------|
| not_started | bg-gray-100 text-gray-700 |
| in_progress | bg-yellow-100 text-yellow-700 |
| at_lab, at_studio, waiting_approval, waiting_for_bride | bg-yellow-100 text-yellow-700 |
| completed, complete, picked_up | bg-green-100 text-green-700 |
| on_hold | bg-red-100 text-red-700 |
| pending | bg-gray-100 text-gray-700 |

**DEPRECATED:** active status — DO NOT USE.

---

## 2. PAGE LAYOUT PATTERNS

### 2.1 Sales Page Pattern
All pages under /admin/sales/* follow: Header → Metrics Dashboard → Pipeline → Action Alerts → Filters → Active Table → Completed Table → Year Comparison Footer.

### 2.2 Three-Level Architecture
List (READ) → Production (WRITE) → Detail (READ).

### 2.3 Table Pattern
All tables MUST have: sortable columns, row numbers (#), status badges, actions dropdown.

---

## 3. COMPONENT LIBRARY

### Required Components
| Component | Location | Used For |
|-----------|----------|----------|
| StatusBadge | /ui/StatusBadge.tsx | All status displays |
| DataTable | /ui/DataTable.tsx | All sortable tables |
| MetricCard | /ui/MetricCard.tsx | Dashboard metrics |
| ActionAlert | /ui/ActionAlert.tsx | Smart notifications |
| YearSelector | /ui/YearSelector.tsx | Year filter dropdowns |

---

## 4. FORMATTING RULES

- 24-hour clock everywhere (Rule #33)
- Wedding dates show day of week (Rule #34)
- All formatting via src/lib/formatters.ts (Rule #35)
- Inline styles for critical alignment

---

## 5. ICONS (Lucide React)

| Purpose | Icon |
|---------|------|
| Edit | Pencil |
| Delete | Trash2 |
| View | Eye |
| Add | Plus |
| Download | Download |
| Email | Mail |
| Calendar | Calendar |
| Check | Check |
| X | X |

---

## 6. RESPONSIVE BREAKPOINTS

| Breakpoint | Width |
|------------|-------|
| Mobile | < 640px |
| Tablet | 640-1024px |
| Desktop | > 1024px |

Priority: Tablet (Marianna) > Desktop > Mobile.

---

## 7. NAMING CONVENTIONS

- Components: PascalCase.tsx
- Pages: page.tsx (Next.js App Router)
- Tables: snake_case
- Columns: snake_case
- Status values: lowercase
