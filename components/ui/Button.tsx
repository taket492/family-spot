import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
};

const base = `
  inline-flex items-center justify-center font-medium 
  transition-all duration-200 ease-in-out
  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 
  disabled:opacity-50 disabled:cursor-not-allowed
  active:scale-95 transform-gpu
  rounded-xl
`;

const variants = {
  primary: `
    bg-gradient-primary text-white shadow-button
    hover:shadow-button-hover hover:brightness-105
    focus-visible:ring-primary-400
  `,
  secondary: `
    bg-gradient-secondary text-white shadow-button
    hover:shadow-button-hover hover:brightness-105
    focus-visible:ring-secondary-400
  `,
  outline: `
    border border-primary-300 text-primary-600 bg-white
    hover:bg-primary-50 hover:border-primary-400 hover:shadow-sm
    focus-visible:ring-primary-400
  `,
  ghost: `
    text-primary-600 bg-transparent
    hover:bg-primary-50 hover:text-primary-700
    focus-visible:ring-primary-400
  `,
  gradient: `
    bg-gradient-accent text-white shadow-button
    hover:shadow-button-hover hover:brightness-105
    focus-visible:ring-accent-400
  `,
} as const;

const sizes = {
  sm: 'h-8 px-3 text-sm rounded-lg',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-base font-semibold',
  xl: 'h-14 px-8 text-lg font-semibold',
} as const;

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  className = '', 
  children, 
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <button 
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} 
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg 
          className="animate-spin -ml-1 mr-2 h-4 w-4" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

export default Button;

