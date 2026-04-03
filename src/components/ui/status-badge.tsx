import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Status color mapping - matches SIGS Design System
const statusColors: Record<string, string> = {
  // Couple status
  lead: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  quoted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  booked: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",

  // Extras order status
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  signed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  declined: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",

  // Quote status
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  converted: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  lost: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",

  // Job status
  "ready to start": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "in progress": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "proofs out": "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  "waiting for bride": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  "at lab": "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  "at studio": "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  "picked up": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",

  // Default
  default: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase()
  const colorClass = statusColors[normalizedStatus] || statusColors.default

  return (
    <Badge
      variant="secondary"
      className={cn(colorClass, "font-medium capitalize", className)}
    >
      {status}
    </Badge>
  )
}
