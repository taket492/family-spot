import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ className = '', interactive = false, ...props }: CardProps) {
  const interactiveCls = interactive ? 'hover:shadow-md transition-shadow' : '';
  return <div className={`rounded-2xl bg-white shadow-card ${interactiveCls} ${className}`} {...props} />;
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

