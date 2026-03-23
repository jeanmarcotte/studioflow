'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { T, colors, card, sectionLabel, fieldLabel, fmt } from './designTokens';

/* ── sub-components ─────────────────────────────────────── */

function CircleBadge({ letter, bg, fg }: { letter: string; bg: string; fg: string }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: bg,
      color: fg, fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
    }}>
      {letter}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ ...fieldLabel, marginBottom: '1px' }}>{label}</div>
      <div style={{ fontSize: '0.875rem', color: T.text }}>{typeof value === 'number' ? fmt.format(value) : value}</div>
    </div>
  );
}

const rowCard: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '1rem',
  padding: '1rem 1.25rem', background: T.cardBg,
  border: `1px solid ${T.border}`, borderRadius: '12px',
};

const toggleBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: T.accent, fontSize: '0.8125rem', fontWeight: 500, padding: '0.25rem 0.5rem',
};

const disabledBtn: React.CSSProperties = {
  background: 'none', border: `1px solid ${T.border}`, borderRadius: '8px',
  color: T.textMuted, fontSize: '0.75rem', padding: '0.375rem 0.75rem',
  cursor: 'not-allowed', opacity: 0.5,
};

/* ── main component ─────────────────────────────────────── */

export interface DocumentsSectionProps {
  contract: any;
  extrasOrders: any[];
  clientExtras: any[];
}

export function DocumentsSection({ contract, extrasOrders, clientExtras }: DocumentsSectionProps) {
  const [expandContract, setExpandContract] = useState(false);
  const [expandFrames, setExpandFrames] = useState(false);
  const [expandExtras, setExpandExtras] = useState(false);

  const clientExtrasTotal = clientExtras.reduce((s: number, e: any) => s + parseFloat(e.total || '0'), 0);

  // Coverage hours helper
  const coverageStr = (c: any) => {
    if (!c?.start_time || !c?.end_time) return null;
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const fmtT = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return `${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    };
    const hrs = (toMin(c.end_time) - toMin(c.start_time)) / 60;
    return `${fmtT(c.start_time)} – ${fmtT(c.end_time)} (${hrs}h)`;
  };

  return (
    <div style={{ ...card, marginTop: '0.5rem' }}>
      <div style={{ ...sectionLabel, marginBottom: '1.25rem' }}>
        Documents
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* ── A. Wedding Contract ─────────────────────────── */}
        {contract && (
          <div>
            <div style={rowCard}>
              <CircleBadge letter="C" bg={colors.primary[50]} fg={colors.primary[700]} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: T.text }}>Wedding Contract</div>
                <div style={{ fontSize: '0.8125rem', color: T.textSecondary }}>
                  {contract.signed_date ? `Signed ${format(parseISO(contract.signed_date), 'MMM d, yyyy')}` : 'Not signed'}
                  {' — '}{fmt.format(parseFloat(contract.total || '0'))}
                </div>
              </div>
              <button style={toggleBtn} onClick={() => setExpandContract(!expandContract)}>
                {expandContract ? 'Hide' : 'View details'}
              </button>
              <button style={disabledBtn} title="Coming soon — WO-190" disabled>Upload signed copy</button>
            </div>
            {expandContract && (
              <div style={{ background: T.rowAlt, borderRadius: '0 0 12px 12px', padding: '1.25rem 1.25rem 1rem 4.5rem', marginTop: '-4px', border: `1px solid ${T.border}`, borderTop: 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div>
                    <div style={{ ...fieldLabel, marginBottom: '0.5rem', fontSize: '0.8125rem', letterSpacing: '0.04em' }}>Coverage</div>
                    <Detail label="Coverage" value={coverageStr(contract)} />
                    <Detail label="Day" value={contract.day_of_week} />
                    <Detail label="Guests" value={contract.num_guests ? String(contract.num_guests) : null} />
                  </div>
                  <div>
                    <div style={{ ...fieldLabel, marginBottom: '0.5rem', fontSize: '0.8125rem', letterSpacing: '0.04em' }}>Locations</div>
                    <Detail label="Ceremony" value={contract.ceremony_location} />
                    <Detail label="Reception" value={contract.reception_venue} />
                    {contract.engagement_session && <Detail label="Engagement" value={contract.engagement_location || 'TBD'} />}
                  </div>
                  <div>
                    <div style={{ ...fieldLabel, marginBottom: '0.5rem', fontSize: '0.8125rem', letterSpacing: '0.04em' }}>Team</div>
                    <Detail label="Photographers" value={String(contract.num_photographers || 1)} />
                    {(contract.num_videographers || 0) > 0 && <Detail label="Videographers" value={String(contract.num_videographers)} />}
                    {contract.drone_photography && <Detail label="Drone" value="Yes" />}
                    {(contract.parent_albums_qty || 0) > 0 && <Detail label="Parent Albums" value={`${contract.parent_albums_qty}× ${contract.parent_albums_size || ''}`} />}
                  </div>
                  <div>
                    <div style={{ ...fieldLabel, marginBottom: '0.5rem', fontSize: '0.8125rem', letterSpacing: '0.04em' }}>Financials</div>
                    <Detail label="Subtotal" value={parseFloat(contract.subtotal || '0')} />
                    <Detail label="HST" value={parseFloat(contract.tax || '0')} />
                    <Detail label="Total" value={parseFloat(contract.total || '0')} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── B. Frames & Albums ──────────────────────────── */}
        {extrasOrders.length > 0 && extrasOrders.map((order: any) => (
          <div key={order.id}>
            <div style={rowCard}>
              <CircleBadge letter="F" bg={colors.warning[50]} fg={colors.warning[700]} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: T.text }}>Frames & Albums Order</div>
                <div style={{ fontSize: '0.8125rem', color: T.textSecondary }}>
                  {order.order_date || order.created_at ? `Ordered ${format(new Date((order.order_date || order.created_at).includes('T') ? order.order_date || order.created_at : (order.order_date || order.created_at) + 'T12:00:00'), 'MMM d, yyyy')}` : 'Date unknown'}
                  {' — '}{fmt.format(parseFloat(order.extras_sale_amount || '0'))}
                </div>
              </div>
              <button style={toggleBtn} onClick={() => setExpandFrames(!expandFrames)}>
                {expandFrames ? 'Hide' : 'View details'}
              </button>
              <button style={disabledBtn} title="Coming soon — WO-190" disabled>Upload signed copy</button>
            </div>
            {expandFrames && (
              <div style={{ background: T.rowAlt, borderRadius: '0 0 12px 12px', padding: '1rem 1.25rem 1rem 4.5rem', marginTop: '-4px', border: `1px solid ${T.border}`, borderTop: 'none' }}>
                {order.items && typeof order.items === 'object' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {(Array.isArray(order.items) ? order.items : Object.entries(order.items)).map((item: any, i: number) => {
                      const desc = Array.isArray(order.items) ? (item.description || item.name || `Item ${i + 1}`) : item[0];
                      const amt = Array.isArray(order.items) ? (item.amount || item.total || '') : item[1];
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: T.text }}>
                          <span>{desc}</span>
                          {amt && <span style={{ color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{typeof amt === 'number' ? fmt.format(amt) : `$${amt}`}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {order.notes && <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: T.textSecondary, fontStyle: 'italic' }}>{order.notes}</div>}
              </div>
            )}
          </div>
        ))}

        {/* ── C. Extras ───────────────────────────────────── */}
        <div>
          <div style={rowCard}>
            <CircleBadge letter="E" bg={colors.neutral[100]} fg={colors.neutral[700]} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: T.text }}>Extras</div>
              <div style={{ fontSize: '0.8125rem', color: T.textSecondary }}>
                {clientExtras.length > 0
                  ? `${clientExtras.length} item${clientExtras.length !== 1 ? 's' : ''} — ${fmt.format(clientExtrasTotal)}`
                  : 'No extras purchased'}
              </div>
            </div>
            {clientExtras.length > 0 && (
              <button style={toggleBtn} onClick={() => setExpandExtras(!expandExtras)}>
                {expandExtras ? 'Hide' : 'View details'}
              </button>
            )}
          </div>
          {expandExtras && clientExtras.length > 0 && (
            <div style={{ background: T.rowAlt, borderRadius: '0 0 12px 12px', padding: '1rem 1.25rem 1rem 4.5rem', marginTop: '-4px', border: `1px solid ${T.border}`, borderTop: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {clientExtras.map((e: any) => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: T.text }}>
                    <span>{e.description || e.item_type || 'Extra'}</span>
                    <span style={{ color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{fmt.format(parseFloat(e.total || '0'))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
