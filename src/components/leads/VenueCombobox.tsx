// src/components/leads/VenueCombobox.tsx

'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface Venue {
  id: string;
  venue_name: string;
  jean_score: number | null;
  city: string | null;
  region: string | null;
}

interface VenueComboboxProps {
  value: string | null;
  onSelect: (venueName: string, jeanScore: number | null) => void;
}

export function VenueCombobox({ value, onSelect }: VenueComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);

  useEffect(() => {
    async function fetchVenues() {
      const { data } = await supabase
        .from('venues')
        .select('id, venue_name, jean_score, city, region')
        .order('venue_name');

      if (data) setVenues(data);
    }
    fetchVenues();
  }, []);

  const filtered = search
    ? venues.filter(v =>
        v.venue_name.toLowerCase().includes(search.toLowerCase()) ||
        v.city?.toLowerCase().includes(search.toLowerCase())
      )
    : venues;

  const selectedVenue = venues.find(v => v.venue_name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">
            {value || 'Select venue...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search venues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {/* Option to use custom venue name */}
          {search && !filtered.some(v => v.venue_name.toLowerCase() === search.toLowerCase()) && (
            <div
              className="flex items-center px-3 py-2 cursor-pointer hover:bg-accent border-b"
              onClick={() => {
                onSelect(search, null);
                setOpen(false);
                setSearch('');
              }}
            >
              <span className="text-sm">Use "{search}" (not in database)</span>
            </div>
          )}

          {filtered.map(venue => (
            <div
              key={venue.id}
              className={cn(
                "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent",
                value === venue.venue_name && "bg-accent"
              )}
              onClick={() => {
                onSelect(venue.venue_name, venue.jean_score);
                setOpen(false);
                setSearch('');
              }}
            >
              <div className="flex items-center">
                {value === venue.venue_name && <Check className="w-4 h-4 mr-2" />}
                <div className={cn(value === venue.venue_name ? "ml-0" : "ml-6")}>
                  <div className="text-sm font-medium">{venue.venue_name}</div>
                  {venue.city && (
                    <div className="text-xs text-muted-foreground">{venue.city}</div>
                  )}
                </div>
              </div>
              {venue.jean_score && (
                <div className="flex items-center text-xs">
                  <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                  {venue.jean_score}/10
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && !search && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No venues found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
