'use client';

/* ── design tokens (match ClientCard) ───────────────────── */

const T = {
  text: '#1e293b',
  muted: '#94a3b8',
  border: '#e2e8f0',
} as const;

/* ── sub-components ─────────────────────────────────────── */

function RoleCard({ role, name }: { role: string; name: string | null }) {
  const assigned = !!name;
  return (
    <div style={{
      flex: '1 1 0', minWidth: '140px',
      padding: '1rem 1.25rem', borderRadius: '10px',
      border: `1px solid ${T.border}`,
      background: assigned ? '#fff' : '#f8fafc',
      opacity: assigned ? 1 : 0.65,
    }}>
      <div style={{
        fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.03em',
        textTransform: 'uppercase', color: T.muted, marginBottom: '0.25rem',
      }}>
        {role}
      </div>
      {assigned ? (
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: T.text }}>{name}</div>
      ) : (
        <div style={{ fontSize: '0.875rem', color: T.muted, fontStyle: 'italic' }}>Not assigned</div>
      )}
    </div>
  );
}

/* ── main component ─────────────────────────────────────── */

export interface TeamSectionProps {
  assignment: any;
  contract: any;
}

export function TeamSection({ assignment, contract }: TeamSectionProps) {
  const photo1 = assignment?.photo_1 || contract?.photographer || null;
  const photo2 = assignment?.photo_2 || null;
  const video1 = assignment?.video_1 || contract?.videographer || null;
  const status = assignment?.status || null;

  const nP = contract?.num_photographers || 1;
  const nV = contract?.num_videographers || 0;

  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.border}`, borderRadius: '16px',
      padding: '1.5rem 1.75rem', marginBottom: '1.25rem',
    }}>
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{
          fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: T.muted,
        }}>
          Team
        </div>
        {status === 'confirmed' && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '0.1875rem 0.625rem',
            borderRadius: '9999px', fontSize: '0.6875rem', fontWeight: 500,
            letterSpacing: '0.02em', backgroundColor: '#f0fdf4',
            color: '#166534', border: '1px solid #bbf7d0',
          }}>
            Confirmed
          </span>
        )}
      </div>

      {/* ── Role cards ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <RoleCard role="Lead Photographer" name={photo1} />
        {(nP > 1 || photo2) && <RoleCard role="Second Photographer" name={photo2} />}
        {(nV > 0 || video1) && <RoleCard role="Videographer" name={video1} />}
      </div>

      {/* ── Contract spec ─────────────────────────────────── */}
      <div style={{
        fontSize: '0.75rem', color: T.muted, borderTop: `1px solid ${T.border}`,
        paddingTop: '0.75rem',
      }}>
        Contract specifies {nP} photographer{nP !== 1 ? 's' : ''}
        {nV > 0 ? ` + ${nV} videographer${nV !== 1 ? 's' : ''}` : ''}
      </div>
    </div>
  );
}
