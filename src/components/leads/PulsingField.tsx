'use client';

interface PulsingFieldProps {
  isEmpty: boolean;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function PulsingField({ isEmpty, required = false, children, className = '' }: PulsingFieldProps) {
  const pulseClass = isEmpty && required
    ? 'ring-2 ring-red-500 ring-opacity-50 animate-pulse'
    : '';

  return (
    <div className={`${pulseClass} rounded ${className}`}>
      {children}
    </div>
  );
}
