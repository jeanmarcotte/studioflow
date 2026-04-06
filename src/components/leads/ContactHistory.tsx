'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { Phone, MessageSquare, Mail, Voicemail } from 'lucide-react';

interface Contact {
  id: string;
  contact_number: number;
  contact_type: string;
  contact_date: string;
  outcome: string | null;
  notes: string | null;
}

interface ContactHistoryProps {
  leadId: string;
  entityId?: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  call: <Phone className="w-3 h-3" />,
  text: <MessageSquare className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  voicemail: <Voicemail className="w-3 h-3" />,
};

export function ContactHistory({ leadId }: ContactHistoryProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContacts() {
      const { data, error } = await supabase
        .from('lead_contacts')
        .select('*')
        .eq('ballot_id', leadId)
        .order('contact_date', { ascending: false })
        .limit(10);

      if (!error && data) {
        setContacts(data);
      }
      setLoading(false);
    }

    loadContacts();
  }, [leadId]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (contacts.length === 0) {
    return <div className="text-sm text-muted-foreground">No contact history</div>;
  }

  return (
    <div className="space-y-2">
      {contacts.map((contact) => (
        <div key={contact.id} className="flex items-start gap-2 text-sm">
          <div className="mt-1 text-muted-foreground">
            {typeIcons[contact.contact_type] || <Phone className="w-3 h-3" />}
          </div>
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="font-medium">Touch {contact.contact_number}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(contact.contact_date), { addSuffix: true })}
              </span>
            </div>
            {contact.outcome && (
              <div className="text-xs text-muted-foreground capitalize">
                {contact.outcome.replace('_', ' ')}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
