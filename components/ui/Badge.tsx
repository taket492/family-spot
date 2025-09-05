import React from 'react';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  color?: 'green' | 'orange' | 'blue' | 'gray';
  label: string;
};

function colorClass(color: NonNullable<BadgeProps['color']>) {
  switch (color) {
    case 'green':
      return 'bg-primary text-white';
    case 'orange':
      return 'bg-secondary text-white';
    case 'blue':
      return 'bg-brandBlue text-white';
    case 'gray':
    default:
      return 'bg-gray-400 text-white';
  }
}

// Simple mapping for Japanese tags in seed data
function inferColorFromLabel(label: string): BadgeProps['color'] {
  if (/駐車/.test(label)) return 'green';
  if (/キッズ|メニュー/.test(label)) return 'orange';
  if (/授乳|オムツ|トイレ/.test(label)) return 'blue';
  if (/禁煙|喫煙不可/.test(label)) return 'gray';
  return 'gray';
}

export function Badge({ label, color, className = '', ...props }: BadgeProps) {
  const resolved = color ?? inferColorFromLabel(label);
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${colorClass(resolved)} ${className}`}
      {...props}
    >
      {label}
    </span>
  );
}

export default Badge;

