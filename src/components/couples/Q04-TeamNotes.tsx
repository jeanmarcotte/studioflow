/**
 * Q04 — Team + Notes
 *
 * @spec docs/QUADRANT-MAP-COUPLES.md
 * @status LOCKED
 * @updated 2026-04-01
 *
 * Data Sources:
 * - wedding_assignments table
 * - couples.notes
 * - contracts.appointment_notes
 *
 * Sub-sections:
 * - Left panel: TEAM box (Lead Photographer, 2nd Photographer, Videographer)
 * - Right panel: Notes (contract notes, couple notes, extras notes)
 *
 * Guards:
 * - Null check on assignment fields
 */

'use client';

import { T, card, sectionLabel, fieldLabel, pillBase, badge } from './designTokens';

/* ── Team Sub-component ─────────────────────────────────── */

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

function TeamPanel({ assignment, contract }: { assignment: any; contract: any }) {
  const photo1 = assignment?.photo_1 || contract?.photographer || null;
  const photo2 = assignment?.photo_2 || null;
  const video1 = assignment?.video_1 || contract?.videographer || null;
  const status = assignment?.status || null;

  const nP = contract?.num_photographers || 1;
  const nV = contract?.num_videographers || 0;

  return (
    <div style={card}>
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

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <RoleCard role="Lead Photographer" name={photo1} />
        {(nP > 1 || photo2) && <RoleCard role="Second Photographer" name={photo2} />}
        {(nV > 0 || video1) && <RoleCard role="Videographer" name={video1} />}
      </div>

      <div style={{
        fontSize: '0.8125rem', color: T.textSecondary, borderTop: `1px solid ${T.border}`,
        paddingTop: '0.75rem',
      }}>
        Contract specifies {nP} photographer{nP !== 1 ? 's' : ''}
        {nV > 0 ? ` + ${nV} videographer${nV !== 1 ? 's' : ''}` : ''}
      </div>
    </div>
  );
}

/* ── Notes Sub-component ────────────────────────────────── */

function NotesPanel({
  coupleNotes,
  contractNotes,
  extrasNotes,
  hasSocialMediaRestriction,
}: {
  coupleNotes: string | null;
  contractNotes: string | null;
  extrasNotes: string[];
  hasSocialMediaRestriction: boolean;
}) {
  const hasAnyNotes = coupleNotes || contractNotes || extrasNotes.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-4">Notes</h3>

      {hasSocialMediaRestriction && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-3">
          <strong>NO SOCIAL MEDIA</strong><br />
          Engagement & Wedding photos password protected!
        </div>
      )}

      {hasAnyNotes ? (
        <div className="space-y-3">
          {contractNotes && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">{contractNotes}</div>
          )}
          {coupleNotes && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">{coupleNotes}</div>
          )}
          {extrasNotes.map((note, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">{note}</div>
          ))}
        </div>
      ) : (
        <p className="text-slate-400 text-sm">No notes</p>
      )}
    </div>
  );
}

/* ── Main Export ─────────────────────────────────────────── */

export interface Q04TeamNotesProps {
  assignment: any;
  contract: any;
  coupleNotes: string | null;
  contractNotes: string | null;
  extrasNotes: string[];
  hasSocialMediaRestriction: boolean;
}

export function Q04TeamNotes({
  assignment,
  contract,
  coupleNotes,
  contractNotes,
  extrasNotes,
  hasSocialMediaRestriction,
}: Q04TeamNotesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <TeamPanel assignment={assignment} contract={contract} />
      <NotesPanel
        coupleNotes={coupleNotes}
        contractNotes={contractNotes}
        extrasNotes={extrasNotes}
        hasSocialMediaRestriction={hasSocialMediaRestriction}
      />
    </div>
  );
}
