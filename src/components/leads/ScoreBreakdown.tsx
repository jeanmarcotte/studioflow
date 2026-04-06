// src/components/leads/ScoreBreakdown.tsx

'use client';

import { ScoreBreakdown as ScoreBreakdownType } from '@/lib/scoring';

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType | null;
}

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  if (!breakdown) {
    return (
      <div className="text-sm text-muted-foreground">
        Score not calculated yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Algorithm Score</span>
        <span className="text-2xl font-bold">{breakdown.totalScore}</span>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">
          Base: {breakdown.baseScore}
        </div>

        {breakdown.factors.map((factor, i) => (
          <div
            key={i}
            className={`text-xs flex justify-between ${
              factor.points > 0 ? 'text-green-600' : factor.points < 0 ? 'text-red-600' : ''
            }`}
          >
            <span>{factor.name}</span>
            <span>{factor.points > 0 ? '+' : ''}{factor.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
