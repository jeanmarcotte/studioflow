/**
 * Q02 — Navigation
 *
 * @spec docs/QUADRANT-MAP-COUPLES.md
 * @status LOCKED
 * @updated 2026-04-01
 *
 * Data Sources:
 * - Static
 *
 * Sub-sections:
 * - Back link to /admin/couples
 */

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function Q02Navigation() {
  return (
    <Link
      href="/admin/couples"
      className="inline-flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-4 text-sm"
    >
      <ArrowLeft className="w-4 h-4" />
      All Couples
    </Link>
  );
}
