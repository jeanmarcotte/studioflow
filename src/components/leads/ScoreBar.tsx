'use client';

interface ScoreBarProps {
  score: number;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBar({ score, showBadge = true, size = 'md' }: ScoreBarProps) {
  let bgColor = 'bg-gray-400';
  let badge = '';

  if (score >= 85) {
    bgColor = 'bg-red-500';
    badge = 'HOT';
  } else if (score >= 70) {
    bgColor = 'bg-orange-500';
    badge = 'CALL NOW';
  } else if (score >= 50) {
    bgColor = 'bg-yellow-500';
    badge = 'NURTURE';
  } else if (score >= 30) {
    bgColor = 'bg-green-500';
    badge = 'EARLY';
  } else {
    bgColor = 'bg-gray-500';
    badge = 'COLD';
  }

  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="space-y-1">
      {showBadge && (
        <div className="flex justify-between items-center text-xs">
          <span className="font-medium">{badge}</span>
          <span className="text-muted-foreground">{score}/100</span>
        </div>
      )}
      <div className={`w-full bg-muted rounded-full ${heights[size]} overflow-hidden`}>
        <div
          className={`${heights[size]} ${bgColor} rounded-full transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
