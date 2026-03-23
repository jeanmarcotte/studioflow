'use client';

import { T, card, sectionLabel, fieldLabel, pillBase, badge } from './designTokens';

/* ── sub-components ─────────────────────────────────────── */

function RoleCard({ role, name }: { role: string; name: string | null }) {
  const assigned = !!name;
  return (
    <div style={{
      flex: '1 1 0', minWidth: '140px',
      padding: '1rem 1.25rem', borderRadius: '10px',
      border: `1px solid ${T.border}`,
      background: assigned ? T.cardBg : T.cardBgAlt,
      opacity: assigned ? 1 : 0.65,
    }}>
      <div style={{ ...fieldLabel, marginBottom: '0.25rem' }}>{role}</div>
      {assigned ? (
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: T.text }}>{name}</div>
      ) : (
        <div style={{ fontSize: '0.875rem', color: T.textMuted, fontStyle: 'italic' }}>Not assigned</div>
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
    <div style={card}>
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={sectionLabel}>Team</div>
        {status === 'confirmed' && (
          <span style={{
            ...pillBase,
            backgroundColor: badge.success.bg, color: badge.success.fg,
            border: `1px solid ${badge.success.bd}`,
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
        fontSize: '0.75rem', color: T.textSecondary, borderTop: `1px solid ${T.border}`,
        paddingTop: '0.75rem',
      }}>
        Contract specifies {nP} photographer{nP !== 1 ? 's' : ''}
        {nV > 0 ? ` + ${nV} videographer${nV !== 1 ? 's' : ''}` : ''}
      </div>
    </div>
  );
}
