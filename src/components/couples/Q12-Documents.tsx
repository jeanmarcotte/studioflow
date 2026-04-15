/**
 * Q12 — Documents
 *
 * @spec docs/QUADRANT-MAP-COUPLES.md
 * @status LOCKED
 * @updated 2026-04-01
 *
 * Data Sources:
 * - couple_documents table + API routes
 *
 * Sub-sections:
 * - 3 static PDF generator rows (Contract, Frames & Albums, Extras)
 * - Dynamic rows from couple_documents table
 *
 * Critical Rules:
 * - All PDFs generated on-the-fly using pdf-lib — not stored
 * - Pickup slips from Q13 appear here automatically
 *
 * Guards:
 * - Frames & Albums and Extras show disabled state if no data
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Printer, ClipboardList, File, Download } from 'lucide-react';
import { T, card, sectionLabel } from './designTokens';

const DOC_ICONS: Record<string, typeof FileText> = {
  wedding_contract: FileText,
  pickup_slip: Printer,
  wedding_day_form: ClipboardList,
};

const btnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
  fontSize: '0.8125rem', fontWeight: 500, color: T.accent,
  textDecoration: 'none', padding: '0.25rem 0.625rem',
  borderRadius: '6px', border: `1px solid ${T.border}`,
  background: 'none', cursor: 'pointer',
};

const disabledBtnStyle: React.CSSProperties = {
  ...btnStyle,
  color: T.textMuted,
  cursor: 'not-allowed',
  opacity: 0.6,
};

export interface Q12DocumentsProps {
  coupleId: string;
  hasClientExtras: boolean;
  hasExtrasOrders: boolean;
  refreshKey?: number;
}

export function Q12Documents({ coupleId, hasClientExtras, hasExtrasOrders, refreshKey }: Q12DocumentsProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    const { data } = await supabase
      .from('couple_documents')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  }, [coupleId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs, refreshKey]);

  const openPdf = (path: string) => {
    window.open(`/api/couples/${coupleId}/pdf/${path}`, '_blank');
  };

  const staticRows: { name: string; path: string; enabled: boolean; icon: typeof FileText }[] = [
    { name: 'Wedding Contract', path: 'contract', enabled: true, icon: FileText },
    { name: 'Frames & Albums', path: 'frames', enabled: hasClientExtras, icon: FileText },
    { name: 'Extras', path: 'extras', enabled: hasExtrasOrders, icon: FileText },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-4">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-bold">Documents</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
        {staticRows.map((row, i) => (
          <div key={row.path}>
            {i > 0 && <div style={{ borderTop: `1px solid ${T.border}` }} />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.25rem' }}>
              <row.icon size={18} style={{ color: T.accentDark, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: T.text }}>
                {row.name}
              </div>
              {row.enabled ? (
                <button style={btnStyle} onClick={() => openPdf(row.path)}>
                  Generate PDF
                </button>
              ) : (
                <span style={disabledBtnStyle}>Nothing purchased yet</span>
              )}
            </div>
          </div>
        ))}

        {!loading && documents.length > 0 && documents.map((doc) => {
          const Icon = DOC_ICONS[doc.doc_type] || File;
          return (
            <div key={doc.id}>
              <div style={{ borderTop: `1px solid ${T.border}` }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.25rem' }}>
                <Icon size={18} style={{ color: T.accentDark, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: T.text }}>
                  {doc.doc_name}
                </div>
                {doc.file_url ? (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={btnStyle}>
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
    </div>
  );
}
