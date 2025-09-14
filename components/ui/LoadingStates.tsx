import { ReactNode } from 'react';

// Skeleton components for different content types
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-neutral-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-3/4" />
              <div className="h-3 bg-neutral-200 rounded w-1/2" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 bg-neutral-200 rounded" />
            <div className="h-3 bg-neutral-200 rounded w-5/6" />
            <div className="h-3 bg-neutral-200 rounded w-4/6" />
          </div>
        </div>
      ))}
    </>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg border animate-pulse">
          <div className="w-16 h-16 bg-neutral-200 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-neutral-200 rounded w-3/4" />
            <div className="h-3 bg-neutral-200 rounded w-1/2" />
            <div className="h-3 bg-neutral-200 rounded w-2/3" />
          </div>
          <div className="w-8 h-8 bg-neutral-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Header skeleton */}
      <div className="border-b bg-neutral-50 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-neutral-200 rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b last:border-b-0 p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-neutral-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => {
        const width = i === lines - 1 ? 'w-3/4' : 'w-full';
        return <div key={i} className={`h-4 bg-neutral-200 rounded ${width}`} />;
      })}
    </div>
  );
}

export function ButtonSkeleton({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  const bgColor = variant === 'primary' ? 'bg-primary-200' : 'bg-neutral-200';
  return <div className={`h-10 w-24 ${bgColor} rounded-md animate-pulse`} />;
}

// Shimmer effect for advanced loading
export function ShimmerEffect({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%] animate-shimmer ${className}`} />
  );
}

// Progressive loading wrapper
interface ProgressiveLoadingProps {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  error?: ReactNode;
  hasError?: boolean;
  className?: string;
}

export function ProgressiveLoading({
  isLoading,
  skeleton,
  children,
  error,
  hasError = false,
  className = ''
}: ProgressiveLoadingProps) {
  if (hasError && error) {
    return <div className={className}>{error}</div>;
  }

  if (isLoading) {
    return <div className={className}>{skeleton}</div>;
  }

  return <div className={className}>{children}</div>;
}

// Optimistic loading indicator
export function OptimisticIndicator({ isOptimistic }: { isOptimistic: boolean }) {
  if (!isOptimistic) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center space-x-2">
      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span>更新中...</span>
    </div>
  );
}

// Loading overlay for forms
export function LoadingOverlay({ isVisible, message = '保存中...' }: { isVisible: boolean; message?: string }) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-600">{message}</p>
      </div>
    </div>
  );
}

// Staggered list animation
export function StaggeredList({ children, delay = 50 }: { children: ReactNode[]; delay?: number }) {
  return (
    <>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-fadeInUp"
          style={{
            animationDelay: `${index * delay}ms`,
            animationFillMode: 'both'
          }}
        >
          {child}
        </div>
      ))}
    </>
  );
}