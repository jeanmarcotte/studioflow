// src/components/leads/ResurrectButton.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { RefreshCw, Loader2 } from 'lucide-react';

interface ResurrectButtonProps {
  leadId: string;
  currentStatus: string;
  onSuccess?: () => void;
}

export function ResurrectButton({ leadId, currentStatus, onSuccess }: ResurrectButtonProps) {
  const [loading, setLoading] = useState(false);

  // Only show for dead/lost leads
  if (currentStatus !== 'dead' && currentStatus !== 'lost') {
    return null;
  }

  const handleResurrect = async () => {
    setLoading(true);
    try {
      // Get current reactivation count
      const { data: lead } = await supabase
        .from('ballots')
        .select('reactivation_count')
        .eq('id', leadId)
        .limit(1);

      const currentCount = lead?.[0]?.reactivation_count || 0;

      // Update lead
      const { error } = await supabase
        .from('ballots')
        .update({
          status: 'contacted',
          contact_count: 0,
          contact_status: 'active',
          reactivated_at: new Date().toISOString(),
          reactivation_count: currentCount + 1,
          reactivation_reason: 'Manual resurrection',
        })
        .eq('id', leadId);

      if (error) throw error;

      toast.success('Lead resurrected! Chase sequence reset.');
      onSuccess?.();
    } catch (error) {
      console.error('Error resurrecting lead:', error);
      toast.error('Failed to resurrect lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResurrect}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4 mr-2" />
      )}
      Resurrect Lead
    </Button>
  );
}
