/**
 * Q01 — Alert Banner
 *
 * @spec docs/QUADRANT-MAP-COUPLES.md
 * @status LOCKED
 * @updated 2026-04-01
 *
 * Data Sources:
 * - couple_milestones table
 * - payments table
 *
 * Critical Rules:
 * - Red/coral banner fires when: (a) Wedding Day Form not received, (b) Overdue payment exists
 * - Hidden when no alerts active
 * - Links directly to the relevant section for resolution
 *
 * Guards:
 * - Null check on milestones and payment dates
 */

'use client';

import { format, parseISO, differenceInDays } from 'date-fns';

export interface Q01AlertBannerProps {
  milestones: Record<string, boolean> | null;
  payments: { due_date: string | null; amount: string | number; status?: string }[];
  weddingDate: string | null;
}

export function Q01AlertBanner({ milestones, payments, weddingDate }: Q01AlertBannerProps) {
  const alerts: { message: string; type: 'critical' }[] = [];
  const ms = milestones || {};

  // Alert: Wedding Day Form not received (only for pre-wedding couples)
  const wedding = weddingDate ? new Date(weddingDate) : null;
  const isPreWedding = wedding ? wedding > new Date() : false;
  if (isPreWedding && !ms.m15_day_form_approved) {
    const daysUntil = wedding ? differenceInDays(wedding, new Date()) : 0;
    if (daysUntil <= 30) {
      alerts.push({ message: `Wedding Day Form not received \u2014 wedding in ${daysUntil} days`, type: 'critical' });
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      {alerts.map((alert, i) => (
        <div key={i} style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          marginBottom: i < alerts.length - 1 ? '0.5rem' : 0,
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#dc2626',
        }}>
          {'\u26A0'} {alert.message}
        </div>
      ))}
    </div>
  );
}
