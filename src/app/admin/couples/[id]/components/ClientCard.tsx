'use client';

import { format, parseISO, differenceInDays } from 'date-fns';
import { DM_Serif_Display } from 'next/font/google';
import { T, card, sectionLabel, fieldLabel, pillBase, badge } from './designTokens';

const display = DM_Serif_Display({ weight: '400', subsets: ['latin'], display: 'swap' });

/* ── sub-components ─────────────────────────────────────── */

function SectionLabel({ children }: { children: string }) {
  return <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: T.accentDark, marginBottom: '0.75rem' }}>{children}</div>;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ ...fieldLabel, fontSize: '0.8125rem' }}>{label}</div>
      {value ? (
        <div style={{ fontSize: '0.875rem', color: T.text, marginTop: '1px' }}>{value}</div>
      ) : (
        <div style={{ fontSize: '0.875rem', color: T.textMuted, fontStyle: 'italic', marginTop: '1px' }}>Not specified</div>
      )}
    </div>
  );
}

function Badge({ children, v = 'default' }: { children: React.ReactNode; v?: keyof typeof badge }) {
  const c = badge[v];
  return (
    <span style={{ ...pillBase, backgroundColor: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>
      {children}
    </span>
  );
}

/* ── main component ─────────────────────────────────────── */

export interface ClientCardProps {
  couple: any;
  contract: any;
  extrasOrders: any[];
}

export function ClientCard({ couple, contract, extrasOrders }: ClientCardProps) {
  const today = new Date();
  const wedding = couple.wedding_date ? parseISO(couple.wedding_date) : null;
  const daysUntil = wedding ? differenceInDays(wedding, today) : 0;
  const isPast = daysUntil < 0;

  const weddingStr = wedding ? format(wedding, 'EEEE, MMMM d, yyyy') : 'Date TBD';
  const signedStr = contract?.signed_date ? format(parseISO(contract.signed_date), 'MMM d, yyyy') : null;
  const bookedStr = couple.booked_date ? format(parseISO(couple.booked_date), 'MMM d, yyyy') : null;

  const nP = contract?.num_photographers || 1;
  const nV = contract?.num_videographers || 0;

  let coverage: string | null = null;
  if (contract?.start_time && contract?.end_time) {
    const toMin = (t: string) => {
      const parts = t.split(':').map(Number);
      if (parts.length < 2 || parts.some(isNaN)) return NaN;
      return parts[0] * 60 + parts[1];
    };
    const fmtT = (t: string) => {
      const parts = t.split(':').map(Number);
      if (parts.length < 2 || parts.some(isNaN)) return 'TBD';
      const [h, m] = parts;
      return `${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    };
    const startMin = toMin(contract.start_time);
    const endMin = toMin(contract.end_time);
    const hrs = (endMin - startMin) / 60;
    const startFmt = fmtT(contract.start_time);
    const endFmt = fmtT(contract.end_time);
    if (isNaN(hrs) || startFmt === 'TBD' || endFmt === 'TBD') {
      coverage = startFmt !== 'TBD' && endFmt !== 'TBD' ? `${startFmt} – ${endFmt}` : 'TBD';
    } else {
      coverage = `${startFmt} – ${endFmt} (${hrs}h)`;
    }
  }

  const pkgLabel = couple.package_type
    ? couple.package_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : null;

  const status = (couple.status || 'booked').toLowerCase();

  const meta: string[] = [];
  if (signedStr) meta.push(`Signed ${signedStr}`);
  if (couple.lead_source) meta.push(`Source: ${couple.lead_source}`);
  if (bookedStr) meta.push(`Booked ${bookedStr}`);

  return (
    <div style={{ ...card, padding: '2rem 2.25rem' }}>
      {/* ── Name + Service Type ─────────────────────────────── */}
      <h1 className={display.className} style={{
        fontSize: '1.75rem', fontWeight: 400, color: T.text,
        lineHeight: 1.2, margin: '0 0 0.5rem',
      }}>
        {couple.couple_name} <span style={{ fontSize: '1.1rem', color: T.textSecondary }}>— {nV > 0 ? 'Photo & Video' : 'Photo Only'}</span>
      </h1>

      {/* ── Wedding date + meta ────────────────────────────── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.8125rem', color: T.text, marginBottom: '0.25rem' }}>
          {weddingStr}
          <span style={{ color: T.textSecondary, marginLeft: '0.75rem' }}>
            {isPast ? `${Math.abs(daysUntil)} days since wedding` : `${daysUntil} days until wedding`}
          </span>
        </div>
        {meta.length > 0 && (
          <div style={{ fontSize: '0.8125rem', color: T.textSecondary }}>{meta.join(' · ')}</div>
        )}
      </div>

      {/* ── 3-column grid ─────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1.75rem', borderTop: `1px solid ${T.border}`,
        paddingTop: '1.5rem', marginBottom: '1.5rem',
      }}>
        <div>
          <SectionLabel>Contact</SectionLabel>
          <Field label="Bride" value={[couple.bride_first_name, couple.bride_last_name].filter(Boolean).join(' ') || null} />
          <Field label="Groom" value={[couple.groom_first_name, couple.groom_last_name].filter(Boolean).join(' ') || null} />
          <Field label="Email" value={couple.email} />
          <Field label="Phone" value={couple.phone} />
        </div>
        <div>
          <SectionLabel>Venues</SectionLabel>
          <Field label="Ceremony" value={contract?.ceremony_location} />
          <Field label="Reception" value={contract?.reception_venue} />
          <Field label="Park" value={couple.park_location} />
          <Field label="Engagement" value={contract?.engagement_location || couple.engagement_location} />
        </div>
        <div>
          <SectionLabel>Package</SectionLabel>
          <Field label="Package" value={pkgLabel} />
          <Field label="Coverage" value={coverage} />
          <Field label="Photographers" value={String(nP)} />
          <Field label="Videographers" value={nV > 0 ? String(nV) : 'None'} />
        </div>
      </div>

      {/* ── Badges ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Badge v="accent">{status}</Badge>
        <Badge>{nV > 0 ? 'Photo + Video' : 'Photo Only'}</Badge>
        <Badge v="success">{isPast ? 'Post-Wedding' : 'Pre-Wedding'}</Badge>
        {extrasOrders.length > 0 && <Badge v="warning">Extras Purchased</Badge>}
      </div>

    </div>
  );
}
