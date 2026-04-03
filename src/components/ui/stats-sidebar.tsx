import { cn } from "@/lib/utils"

interface StatsSidebarProps {
  children: React.ReactNode
  width?: string
  className?: string
}

export function StatsSidebar({
  children,
  width = "280px",
  className,
}: StatsSidebarProps) {
  return (
    <aside
      className={cn("flex-shrink-0 space-y-4", className)}
      style={{ width }}
    >
      {children}
    </aside>
  )
}
