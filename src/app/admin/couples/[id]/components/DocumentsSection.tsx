'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Printer, ClipboardList, File, Download } from 'lucide-react';
import { T, card, sectionLabel } from './designTokens';

const DOC_ICONS: Record<string, typeof FileText> = {
  wedding_contract: FileText,
  pickup_slip: Printer,
  wedding_day_form: ClipboardList,
};

export interface DocumentsSectionProps {
  coupleId: string;
}

export function DocumentsSection({ coupleId }: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocs() {
      const { data } = await supabase
        .from('couple_documents')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false });
      setDocuments(data || []);
      setLoading(false);
    }
    fetchDocs();
  }, [coupleId]);

  return (
    <div style={{ ...card, marginTop: '0.5rem' }}>
      <div style={{ ...sectionLabel, marginBottom: '1.25rem' }}>
        Documents
      </div>

      {loading ? (
        <div style={{ fontSize: '0.875rem', color: T.textSecondary, textAlign: 'center', padding: '1rem 0' }}>Loading…</div>
      ) : documents.length === 0 ? (
        <div style={{ fontSize: '0.875rem', color: T.textMuted, fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
          No documents yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {documents.map((doc, i) => {
            const Icon = DOC_ICONS[doc.doc_type] || File;
            return (
              <div key={doc.id}>
                {i > 0 && <div style={{ borderTop: `1px solid ${T.border}` }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.25rem' }}>
                  <Icon size={18} style={{ color: T.accentDark, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: T.text }}>
                    {doc.doc_name}
                  </div>
                  {doc.file_url ? (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        fontSize: '0.8125rem', fontWeight: 500, color: T.accent,
                        textDecoration: 'none', padding: '0.25rem 0.5rem',
                        borderRadius: '6px', border: `1px solid ${T.border}`,
                      }}
                    >
                      <Download size={14} />
                      Download
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.8125rem', color: T.textMuted, fontStyle: 'italic' }}>Pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
