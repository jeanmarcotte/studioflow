'use client';

import { useState } from 'react';
import { Plus, X, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { T, card, sectionLabel } from './designTokens';

export interface PickupSlipSectionProps {
  coupleId: string;
  brideName: string;
  groomName: string;
  onGenerated?: () => void;
}

export function PickupSlipSection({ coupleId, brideName, groomName, onGenerated }: PickupSlipSectionProps) {
  const [items, setItems] = useState<string[]>(['']);
  const [generating, setGenerating] = useState(false);

  const updateItem = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    setItems(next);
  };

  const addItem = () => setItems([...items, '']);

  const removeItem = (i: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== i));
  };

  const generate = async () => {
    const validItems = items.filter(i => i.trim());
    if (validItems.length === 0) return;

    setGenerating(true);
    try {
      // Generate PDF
      const res = await fetch(`/api/couples/${coupleId}/pdf/pickup-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems }),
      });

      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Save record to couple_documents
      await supabase.from('couple_documents').insert({
        couple_id: coupleId,
        doc_type: 'pickup_slip',
        doc_name: `Client Pickup Slip \u2014 ${brideName} & ${groomName}`,
        file_url: null,
        generated_at: new Date().toISOString(),
      });

      onGenerated?.();
    } catch (err) {
      console.error('Pickup slip generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.875rem',
    border: `1px solid ${T.border}`, borderRadius: '8px',
    background: '#ffffff', color: T.text, outline: 'none',
  };

  const iconBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '0.25rem', display: 'flex', alignItems: 'center',
  };

  return (
    <div style={{ ...card, marginTop: '0.5rem' }}>
      <div style={{ ...sectionLabel, marginBottom: '1.25rem' }}>
        Client Pickup Slip
      </div>

      <div style={{ marginBottom: '0.75rem', fontSize: '0.8125rem', color: T.textSecondary }}>
        Items being picked up:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="text"
              value={item}
              onChange={e => updateItem(i, e.target.value)}
              placeholder={`Item ${i + 1} description`}
              style={inputStyle}
            />
            {items.length > 1 && (
              <button style={iconBtnStyle} onClick={() => removeItem(i)} title="Remove item">
                <X size={16} style={{ color: T.textMuted }} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={addItem}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            fontSize: '0.8125rem', fontWeight: 500, color: T.accent,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <Plus size={14} />
          Add Item
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={generate}
          disabled={generating || items.every(i => !i.trim())}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.875rem', fontWeight: 600, color: '#ffffff',
            background: generating ? T.textMuted : T.accentDark,
            border: 'none', borderRadius: '8px', padding: '0.5rem 1rem',
            cursor: generating ? 'not-allowed' : 'pointer',
          }}
        >
          <Printer size={16} />
          {generating ? 'Generating...' : 'Generate & Print Pickup Slip'}
        </button>
      </div>
    </div>
  );
}
