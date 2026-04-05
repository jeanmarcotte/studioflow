'use client'

import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PaginationButtonGroup = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  pageSize: number
}) => {
  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 md:px-6 border-t border-border/60">
      <span className="text-xs text-muted-foreground">
        Showing Results: {start}–{end} of {totalItems}
      </span>
      <div className="inline-flex rounded-lg border border-border overflow-hidden">
        <motion.button
          whileTap={{ scale: 0.9 }}
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 px-3 text-xs font-medium flex items-center gap-1 bg-white dark:bg-gray-900 hover:bg-muted disabled:opacity-40 disabled:pointer-events-none border-r border-border"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </motion.button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="h-8 px-2 flex items-center text-xs text-muted-foreground bg-white dark:bg-gray-900 border-r border-border">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-8 w-8 text-xs font-medium border-r border-border ${
                p === currentPage
                  ? 'bg-[#0d4f4f] text-white'
                  : 'bg-white dark:bg-gray-900 hover:bg-muted text-muted-foreground'
              }`}
            >
              {p}
            </button>
          )
        )}
        <motion.button
          whileTap={{ scale: 0.9 }}
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 px-3 text-xs font-medium flex items-center gap-1 bg-white dark:bg-gray-900 hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </motion.button>
      </div>
    </div>
  )
}

export { PaginationButtonGroup }
