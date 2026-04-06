// src/components/leads/ChaseSubFilters.tsx

'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ChaseFilter = 'all' | 'due_today' | 'overdue' | 'upcoming' | 'exhausted';

interface ChaseSubFiltersProps {
  activeFilter: ChaseFilter;
  onFilterChange: (filter: ChaseFilter) => void;
  counts: {
    all: number;
    due_today: number;
    overdue: number;
    upcoming: number;
    exhausted: number;
  };
}

export function ChaseSubFilters({ activeFilter, onFilterChange, counts }: ChaseSubFiltersProps) {
  const filters: { key: ChaseFilter; label: string; color?: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'due_today', label: 'Due Today', color: 'text-yellow-600' },
    { key: 'overdue', label: 'Overdue', color: 'text-red-600' },
    { key: 'upcoming', label: 'Upcoming', color: 'text-blue-600' },
    { key: 'exhausted', label: 'Exhausted', color: 'text-gray-500' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(filter => (
        <Button
          key={filter.key}
          variant={activeFilter === filter.key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(filter.key)}
          className={cn(
            "h-7 text-xs",
            activeFilter !== filter.key && filter.color
          )}
        >
          {filter.label}
          <span className="ml-1.5 opacity-70">({counts[filter.key]})</span>
        </Button>
      ))}
    </div>
  );
}

export type { ChaseFilter };
