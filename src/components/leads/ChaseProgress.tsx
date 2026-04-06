'use client';

interface ChaseProgressProps {
  touchCount: number;
  maxTouches?: number;
}

export function ChaseProgress({ touchCount, maxTouches = 6 }: ChaseProgressProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxTouches }).map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full ${
            i < touchCount
              ? 'bg-primary'
              : 'bg-muted border border-border'
          } ${i === touchCount ? 'ring-2 ring-primary ring-offset-1' : ''}`}
          title={`Touch ${i + 1}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-2">
        {touchCount}/{maxTouches}
      </span>
    </div>
  );
}
