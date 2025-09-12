import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
};

export function Card({ 
  className = '', 
  interactive = false, 
  variant = 'default',
  ...props 
}: CardProps) {
  const baseClasses = 'rounded-2xl transition-all duration-200 ease-in-out';
  
  const variants = {
    default: 'bg-white shadow-card',
    elevated: 'bg-white shadow-lg',
    outlined: 'bg-white border border-neutral-200',
    glass: 'glass shadow-lg',
  };
  
  const interactiveClasses = interactive 
    ? 'hover:shadow-card-hover hover:-translate-y-1 cursor-pointer transform-gpu' 
    : '';
  
  return (
    <div 
      className={`${baseClasses} ${variants[variant]} ${interactiveClasses} ${className}`} 
      {...props} 
    />
  );
}

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
export function CardHeader({ className = '', ...props }: CardHeaderProps) {
  return <div className={`p-4 pb-0 ${className}`} {...props} />;
}

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;
export function CardTitle({ className = '', ...props }: CardTitleProps) {
  return <h3 className={`text-base font-semibold ${className}`} {...props} />;
}

type CardContentProps = React.HTMLAttributes<HTMLDivElement>;
export function CardContent({ className = '', ...props }: CardContentProps) {
  return <div className={`p-4 ${className}`} {...props} />;
}

type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;
export function CardFooter({ className = '', ...props }: CardFooterProps) {
  return <div className={`p-4 pt-0 ${className}`} {...props} />;
}

export default Card;

