'use client';

import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface LeadSource {
  id: string;
  display_name: string;
  source_type: string;
  lead_count: number;
}

interface SourceDropdownProps {
  value: string | null;
  onChange: (sourceId: string | null) => void;
}

export function SourceDropdown({ value, onChange }: SourceDropdownProps) {
  const [sources, setSources] = useState<LeadSource[]>([]);

  useEffect(() => {
    async function fetchSources() {
      const { data } = await supabase
        .from('lead_sources')
        .select('id, display_name, source_type')
        .eq('is_active', true)
        .order('display_name');

      if (data) {
        const { data: countData } = await supabase
          .from('ballots')
          .select('lead_source_id');

        const counts: Record<string, number> = {};
        countData?.forEach(b => {
          if (b.lead_source_id) {
            counts[b.lead_source_id] = (counts[b.lead_source_id] || 0) + 1;
          }
        });

        setSources(data.map(s => ({
          ...s,
          lead_count: counts[s.id] || 0
        })));
      }
    }
    fetchSources();
  }, []);

  const selectedSource = sources.find(s => s.id === value);

  // Group sources
  const bridalShows = sources.filter(s => s.source_type === 'bridal_show');
  const digital = sources.filter(s => ['website', 'instagram_dm', 'facebook_dm', 'google_ads', 'seo', 'instagram_organic'].includes(s.source_type));
  const referrals = sources.filter(s => ['past_client', 'planner', 'venue', 'referral', 'wom'].includes(s.source_type));

  const getShortName = (name: string) => name.replace(/\s*\([^)]*\)/g, '').trim();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-between w-44 h-9 rounded-lg border border-border bg-background px-3 text-sm hover:bg-muted transition-colors outline-none">
        <span className="truncate flex-1 text-left">
          {selectedSource ? getShortName(selectedSource.display_name) : 'All Sources'}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-white border border-gray-200 shadow-lg">
        <DropdownMenuItem onClick={() => onChange(null)} className="cursor-pointer">
          <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
          <span className="text-gray-900 font-medium">All Sources</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-gray-200" />

        {bridalShows.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-gray-500 text-xs font-medium uppercase tracking-wide">
              Bridal Shows
            </DropdownMenuLabel>
            {bridalShows.map(source => (
              <DropdownMenuItem
                key={source.id}
                onClick={() => onChange(source.id)}
                className="cursor-pointer"
              >
                <Check className={cn("mr-2 h-4 w-4 text-gray-900", value === source.id ? "opacity-100" : "opacity-0")} />
                <span className="flex-1 truncate text-gray-900">{getShortName(source.display_name)}</span>
                {source.lead_count > 0 && (
                  <span className="ml-2 text-xs text-gray-500">{source.lead_count}</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}

        {digital.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                Digital
              </DropdownMenuLabel>
              {digital.map(source => (
                <DropdownMenuItem
                  key={source.id}
                  onClick={() => onChange(source.id)}
                  className="cursor-pointer"
                >
                  <Check className={cn("mr-2 h-4 w-4 text-gray-900", value === source.id ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate text-gray-900">{source.display_name}</span>
                  {source.lead_count > 0 && (
                    <span className="ml-2 text-xs text-gray-500">{source.lead_count}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        {referrals.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                Referrals
              </DropdownMenuLabel>
              {referrals.map(source => (
                <DropdownMenuItem
                  key={source.id}
                  onClick={() => onChange(source.id)}
                  className="cursor-pointer"
                >
                  <Check className={cn("mr-2 h-4 w-4 text-gray-900", value === source.id ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate text-gray-900">{source.display_name}</span>
                  {source.lead_count > 0 && (
                    <span className="ml-2 text-xs text-gray-500">{source.lead_count}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
