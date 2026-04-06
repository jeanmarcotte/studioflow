// src/components/leads/LeadSearch.tsx

'use client';

import { useState, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Lead {
  id: string;
  bride_name: string | null;
  groom_name: string | null;
  venue_name: string | null;
  wedding_date: string | null;
}

interface LeadSearchProps {
  onSelect: (leadId: string) => void;
}

export function LeadSearch({ onSelect }: LeadSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!search || search.length < 2) {
      setLeads([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('ballots')
        .select('id, bride_name, groom_name, venue_name, wedding_date')
        .or(`bride_name.ilike.%${search}%,groom_name.ilike.%${search}%,venue_name.ilike.%${search}%`)
        .limit(10);

      if (data) setLeads(data);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-72 justify-start text-muted-foreground font-normal"
        >
          <Search className="mr-2 h-4 w-4 shrink-0" />
          Search leads...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type bride, groom, or venue..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!loading && search.length >= 2 && leads.length === 0 && (
              <CommandEmpty>No leads found.</CommandEmpty>
            )}
            {!loading && leads.length > 0 && (
              <CommandGroup heading="Leads">
                {leads.map((lead) => (
                  <CommandItem
                    key={lead.id}
                    value={lead.id}
                    onSelect={() => {
                      onSelect(lead.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {lead.bride_name || 'Unknown'} & {lead.groom_name || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {lead.venue_name || 'No venue'} — {formatDate(lead.wedding_date)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!loading && search.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
