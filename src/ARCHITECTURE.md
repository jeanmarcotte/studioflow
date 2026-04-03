# StudioFlow Architecture

## Page Type System (WO-297)

Every page in StudioFlow follows one of these types:

### TYPE 1: DASHBOARD
- Bento box layout or mixed cards/charts
- Aggregated data, READ-only
- Example: `/admin`

### TYPE 2: INFO
- Stats row + FilterBar + DataTable
- READ-only, click-through to detail
- Template: `InfoPageTemplate`
- Examples: `/admin/couples`, `/admin/team/members`

#### TYPE 2a: DETAIL (subtype)
- Quadrant layout, single entity scoreboard
- **ABSOLUTELY NO DATA INPUT — zero exceptions**
- Example: `/admin/couples/[id]`

### TYPE 3: INPUT
- Forms, line item builders, calculations
- CREATE/UPDATE operations
- Template: `InputPageTemplate`
- Examples: `/admin/team/notes`, `/client/extras-quote`

### TYPE 4: CONTROL
- Collapsible sections by status, inline updates, stats sidebar
- READ + UPDATE — where milestones flip
- Template: `ControlPageTemplate`
- Examples: `/admin/production/photo`, `/admin/sales/frames`

#### TYPE 4a: SALES CONTROL (subtype)
- All CONTROL features + pipeline funnel, revenue metrics
- Examples: `/admin/sales/quotes`, `/admin/sales/frames`

---

## Shared Components

Location: `src/components/ui/`

| Component | Purpose | Used By |
|-----------|---------|---------|
| StatusBadge | Colored status badges | ALL |
| StatCard | Metric with optional YoY | ALL |
| StatsRow | Horizontal StatCard grid | INFO |
| StatsSidebar | Vertical StatCard stack | CONTROL |
| CollapsibleSection | Expandable lanes | CONTROL |
| FilterBar | Search + dropdowns | INFO, CONTROL |
| DataTable | Sortable/filterable table | INFO, CONTROL |
| DataTableColumnHeader | Sortable column header | with DataTable |

---

## Page Templates

Location: `src/components/templates/`

| Template | Page Type | Props |
|----------|-----------|-------|
| InfoPageTemplate | INFO | title, statsRow, filters, children |
| ControlPageTemplate | CONTROL | title, sidebar, pipeline, children |
| InputPageTemplate | INPUT | title, onSubmit, children |

---

## URL State (nuqs)

All filters use `useQueryState` from nuqs:

```tsx
const [year, setYear] = useQueryState("year", { defaultValue: "2026" })
const [search, setSearch] = useQueryState("q", { defaultValue: "" })
```

Benefits:
- Filters survive page refresh
- Shareable URLs
- Browser back/forward works

---

## Data Fetching Pattern

```tsx
// 1. Define types
interface MyData { ... }

// 2. Fetch function
async function fetchData(): Promise<MyData[]> {
  const { data, error } = await supabase.from("table").select("*")
  if (error) throw error
  return data || []
}

// 3. State + useEffect
const [data, setData] = useState<MyData[]>([])
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  fetchData()
    .then(setData)
    .catch((e) => setError(e.message))
    .finally(() => setIsLoading(false))
}, [dependencies])

// 4. Pass states to template
<ControlPageTemplate isLoading={isLoading} error={error}>
  {/* content */}
</ControlPageTemplate>
```

---

## Rules

1. **Identify page type FIRST** — before ANY new page
2. **Use templates** — no custom layouts without approval
3. **Import shared components** — never rebuild StatusBadge, DataTable, etc.
4. **URL state with nuqs** — never useState for filters
5. **Handle all states** — loading, error, empty
6. **DETAIL pages are READ-ONLY** — zero exceptions

---

## Reference Implementation

Frame Sales page (`/admin/sales/frames`) is the reference for CONTROL pages.

Study it before building any new CONTROL or SALES CONTROL page.
