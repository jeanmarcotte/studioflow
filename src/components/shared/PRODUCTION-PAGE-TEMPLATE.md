# Production Page Template

Every Production Page in StudioFlow uses these 4 shared components.
Template source: src/app/admin/production/photo/page.tsx

## Usage

import { ProductionPageHeader, ProductionSidebar, ProductionPills } from '@/components/shared'

## Pages using this template

| Page | URL | Status |
|------|-----|--------|
| Photo Production | /admin/production/photo | TEMPLATE SOURCE |
| Video Production | /admin/production/video | Pending conversion |
| Archive | /admin/production/archive | Pending conversion |
| Couple Quotes | /admin/sales/quotes | Pending conversion |
| Frames & Albums | /admin/sales/frames | Pending conversion |
| Extras Sales | /admin/sales/extras | Pending conversion |

## Layout Pattern

LEFT: collapsible sections with DataTables (main content)
RIGHT: ProductionSidebar with stat boxes (fixed right column)
TOP: ProductionPageHeader (title + buttons)
BELOW HEADER: ProductionPills (status bubbles)

## Rules

1. NEVER rebuild these components inline on a page -- always import from shared
2. ALWAYS add new Production Pages to the table above
3. The photo production page is the visual source of truth
4. Each collapsible section MUST have an id= that matches a sidebar box scrollToId
