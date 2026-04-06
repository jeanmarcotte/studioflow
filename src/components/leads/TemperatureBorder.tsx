'use client';

interface TemperatureBorderProps {
  lastContactDate: string | null;
  children: React.ReactNode;
  className?: string;
}

export function TemperatureBorder({ lastContactDate, children, className = '' }: TemperatureBorderProps) {
  let borderColor = 'border-transparent';

  if (lastContactDate) {
    const lastContact = new Date(lastContactDate);
    const hoursSince = (Date.now() - lastContact.getTime()) / (60 * 60 * 1000);

    if (hoursSince < 24) {
      borderColor = 'border-green-500';
    } else if (hoursSince < 48) {
      borderColor = 'border-yellow-500';
    } else if (hoursSince < 72) {
      borderColor = 'border-orange-500';
    } else {
      borderColor = 'border-red-500';
    }
  }

  return (
    <div className={`border-l-4 ${borderColor} ${className}`}>
      {children}
    </div>
  );
}
