// src/components/leads/SourceFilter.tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface LeadSource {
  id: string;
  display_name: string;
  source_type: string;
}

interface SourceFilterProps {
  selectedSourceId: string | null;
  onSourceChange: (sourceId: string | null) => void;
}

export function SourceFilter({ selectedSourceId, onSourceChange }: SourceFilterProps) {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function fetchSources() {
      const { data } = await supabase
        .from('lead_sources')
        .select('id, display_name, source_type')
        .eq('is_active', true)
        .order('display_name');

      if (data) setSources(data);
    }
    fetchSources();
  }, []);

  const selectedSource = sources.find(s => s.id === selectedSourceId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Filter className="w-4 h-4 mr-2" />
          {selectedSource ? selectedSource.display_name : 'All Sources'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="max-h-64 overflow-y-auto">
          <div
            className={cn(
              "flex items-center px-3 py-2 cursor-pointer hover:bg-accent",
              !selectedSourceId && "bg-accent"
            )}
            onClick={() => {
              onSourceChange(null);
              setOpen(false);
            }}
          >
            {!selectedSourceId && <Check className="w-4 h-4 mr-2" />}
            <span className={cn(!selectedSourceId ? "ml-0" : "ml-6")}>All Sources</span>
          </div>
          {sources.map(source => (
            <div
              key={source.id}
              className={cn(
                "flex items-center px-3 py-2 cursor-pointer hover:bg-accent",
                selectedSourceId === source.id && "bg-accent"
              )}
              onClick={() => {
                onSourceChange(source.id);
                setOpen(false);
              }}
            >
              {selectedSourceId === source.id && <Check className="w-4 h-4 mr-2" />}
              <span className={cn(selectedSourceId === source.id ? "ml-0" : "ml-6")}>
                {source.display_name}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
