// src/components/leads/LeadSourceSelect.tsx

'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface LeadSource {
  id: string;
  slug: string;
  display_name: string;
  source_type: string;
}

interface LeadSourceSelectProps {
  value: string | null;
  onChange: (sourceId: string | null) => void;
  disabled?: boolean;
}

export function LeadSourceSelect({ value, onChange, disabled }: LeadSourceSelectProps) {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSources() {
      const { data, error } = await supabase
        .from('lead_sources')
        .select('id, slug, display_name, source_type')
        .eq('is_active', true)
        .order('display_name');

      if (!error && data) {
        setSources(data);
      }
      setLoading(false);
    }
    fetchSources();
  }, []);

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin" />;
  }

  // Group by source_type
  const bridalShows = sources.filter(s => s.source_type === 'bridal_show');
  const digital = sources.filter(s => ['website', 'instagram_dm', 'facebook_dm', 'google_ads', 'seo', 'instagram_organic'].includes(s.source_type));
  const referrals = sources.filter(s => ['past_client', 'planner', 'venue', 'referral', 'wom'].includes(s.source_type));

  return (
    <Select
      value={value || ''}
      onValueChange={(v) => onChange(v || null)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select lead source..." />
      </SelectTrigger>
      <SelectContent>
        {bridalShows.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Bridal Shows</div>
            {bridalShows.map(source => (
              <SelectItem key={source.id} value={source.id}>
                {source.display_name}
              </SelectItem>
            ))}
          </>
        )}
        {digital.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Digital</div>
            {digital.map(source => (
              <SelectItem key={source.id} value={source.id}>
                {source.display_name}
              </SelectItem>
            ))}
          </>
        )}
        {referrals.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Referrals</div>
            {referrals.map(source => (
              <SelectItem key={source.id} value={source.id}>
                {source.display_name}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}
