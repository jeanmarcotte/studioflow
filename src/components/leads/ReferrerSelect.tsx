// src/components/leads/ReferrerSelect.tsx

'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Referrer {
  id: string;
  name: string;
  relationship_type: string | null;
  referral_count: number;
}

interface ReferrerSelectProps {
  value: string | null;
  onChange: (referrerId: string | null, referrerName: string | null) => void;
}

export function ReferrerSelect({ value, onChange }: ReferrerSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchReferrers();
  }, []);

  async function fetchReferrers() {
    const { data } = await supabase
      .from('referrers')
      .select('id, name, relationship_type, referral_count')
      .order('name');

    if (data) setReferrers(data);
    setLoading(false);
  }

  async function createReferrer(name: string) {
    setCreating(true);
    const { data, error } = await supabase
      .from('referrers')
      .insert({ name, relationship_type: 'unknown' })
      .select()
      .limit(1);

    if (error) {
      toast.error('Failed to create referrer');
      setCreating(false);
      return;
    }

    if (data && data[0]) {
      toast.success(`Created referrer: ${name}`);
      await fetchReferrers();
      onChange(data[0].id, data[0].name);
      setOpen(false);
      setSearch('');
    }
    setCreating(false);
  }

  const filtered = search
    ? referrers.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : referrers;

  const selectedReferrer = referrers.find(r => r.id === value);
  const exactMatch = filtered.some(r => r.name.toLowerCase() === search.toLowerCase());

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
            {selectedReferrer?.name || 'Select referrer...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search or create referrer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <>
              {/* Clear selection option */}
              {value && (
                <div
                  className="flex items-center px-3 py-2 cursor-pointer hover:bg-accent border-b text-muted-foreground"
                  onClick={() => {
                    onChange(null, null);
                    setOpen(false);
                  }}
                >
                  <span className="text-sm">Clear selection</span>
                </div>
              )}

              {/* Create new option */}
              {search && !exactMatch && (
                <div
                  className="flex items-center px-3 py-2 cursor-pointer hover:bg-accent border-b"
                  onClick={() => createReferrer(search)}
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  <span className="text-sm">Create "{search}"</span>
                </div>
              )}

              {filtered.map(referrer => (
                <div
                  key={referrer.id}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent",
                    value === referrer.id && "bg-accent"
                  )}
                  onClick={() => {
                    onChange(referrer.id, referrer.name);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <div className="flex items-center">
                    {value === referrer.id && <Check className="w-4 h-4 mr-2" />}
                    <span className={cn(value === referrer.id ? "ml-0" : "ml-6")}>
                      {referrer.name}
                    </span>
                  </div>
                  {referrer.referral_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {referrer.referral_count} referrals
                    </span>
                  )}
                </div>
              ))}

              {filtered.length === 0 && !search && (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No referrers yet. Type a name to create one.
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
