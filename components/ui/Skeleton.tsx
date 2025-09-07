import React from 'react';

type Props = {
  className?: string;
};

export function Skeleton({ className = '' }: Props) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-200/80 ${className}`}
      aria-hidden="true"
    />
  );
}

export default Skeleton;

