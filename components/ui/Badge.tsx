import React from 'react';

type BadgeColor = 'green' | 'orange' | 'blue' | 'gray' | 'success' | 'warning' | 'error' | 'info';
type BadgeVariant = 'solid' | 'soft' | 'outline';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  color?: BadgeColor;
  variant?: BadgeVariant;
  label: string;
};

function colorClass(color: BadgeColor, variant: BadgeVariant) {
  const colors = {
    solid: {
      green: 'bg-primary-500 text-white',
      orange: 'bg-secondary-500 text-white',
      blue: 'bg-accent-500 text-white',
      gray: 'bg-neutral-500 text-white',
      success: 'bg-success text-white',
      warning: 'bg-warning text-white',
      error: 'bg-error text-white',
      info: 'bg-info text-white',
    },
    soft: {
      green: 'bg-primary-100 text-primary-800',
      orange: 'bg-secondary-100 text-secondary-800',
      blue: 'bg-accent-100 text-accent-800',
      gray: 'bg-neutral-100 text-neutral-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800',
    },
    outline: {
      green: 'border border-primary-300 text-primary-700 bg-transparent',
      orange: 'border border-secondary-300 text-secondary-700 bg-transparent',
      blue: 'border border-accent-300 text-accent-700 bg-transparent',
      gray: 'border border-neutral-300 text-neutral-700 bg-transparent',
      success: 'border border-green-300 text-green-700 bg-transparent',
      warning: 'border border-yellow-300 text-yellow-700 bg-transparent',
      error: 'border border-red-300 text-red-700 bg-transparent',
      info: 'border border-blue-300 text-blue-700 bg-transparent',
    },
  };
  
  return colors[variant][color] || colors[variant].gray;
}

// Simple mapping for Japanese tags in seed data
function inferColorFromLabel(label: string): BadgeColor {
  if (/駐車/.test(label)) return 'green';
  if (/キッズ|メニュー/.test(label)) return 'orange';
  if (/授乳|オムツ|トイレ/.test(label)) return 'blue';
  if (/禁煙|喫煙不可/.test(label)) return 'gray';
  return 'gray';
}

export function Badge({ 
  label, 
  color, 
  variant = 'soft', 
  className = '', 
  ...props 
}: BadgeProps) {
  const resolved: BadgeColor = color ?? inferColorFromLabel(label);
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 ${colorClass(resolved, variant)} ${className}`}
      {...props}
    >
      {label}
    </span>
  );
}

export default Badge;
