'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { EmailComposer } from '@/components/email';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { TemplateContext } from '@/lib/email/types';

interface Lead {
  id: string;
  entity_id: string;
  bride_name: string;
  groom_name: string;
  email: string;
  venue_name: string | null;
  wedding_date: string | null;
  show_id: string | null;
  contact_count: number;
}

export default function ComposeEmailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLead() {
      try {
        const { data, error } = await supabase
          .from('ballots')
          .select('id, entity_id, bride_name, groom_name, email, venue_name, wedding_date, show_id, contact_count')
          .eq('id', leadId)
          .limit(1);

        if (error) throw error;
        if (!data || data.length === 0) {
          setError('Lead not found');
          return;
        }

        setLead(data[0]);
      } catch (err) {
        console.error('Error loading lead:', err);
        setError('Failed to load lead');
      } finally {
        setLoading(false);
      }
    }

    if (leadId) {
      loadLead();
    }
  }, [leadId]);

  const handleSuccess = () => {
    router.push('/leads');
  };

  const handleCancel = () => {
    router.back();
  };

  const getWeddingDay = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getShowName = (showId: string | null): string => {
    if (!showId) return 'the bridal show';
    const showNames: Record<string, string> = {
      'modern-feb-2026': 'the Modern Bridal Show',
      'weddingring-oakville-mar-2026': 'the WeddingRing Oakville Show',
      'hamilton-ring-mar-2026': 'the Hamilton Ring Show',
      'newmarket-uxbridge-apr-2026': 'the Newmarket-Uxbridge Expo',
    };
    return showNames[showId] || 'the bridal show';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-destructive">{error || 'Lead not found'}</p>
        <Button variant="outline" onClick={() => router.push('/leads')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leads
        </Button>
      </div>
    );
  }

  const templateContext: TemplateContext = {
    bride_name: lead.bride_name || '',
    groom_name: lead.groom_name || '',
    venue_name: lead.venue_name || 'your venue',
    wedding_date: lead.wedding_date || '',
    wedding_day: getWeddingDay(lead.wedding_date),
    show_name: getShowName(lead.show_id),
  };

  const coupleName = lead.groom_name
    ? `${lead.bride_name} & ${lead.groom_name}`
    : lead.bride_name;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Compose Email</h1>
            <p className="text-sm text-muted-foreground">{coupleName}</p>
          </div>
        </div>
      </header>

      {/* Composer */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-card rounded-lg border p-6">
          <EmailComposer
            to={lead.email}
            recipientName={lead.bride_name}
            templateCategory="chase"
            templateContext={templateContext}
            leadId={lead.id}
            entityId={lead.entity_id}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </main>
    </div>
  );
}
