import dynamic from 'next/dynamic';
import React, { ComponentType } from 'react';

// Generic lazy loading wrapper
export function createLazyComponent<T = {}>(
  importFn: () => Promise<{ default: ComponentType<T> } | ComponentType<T>>,
  options: {
    loading?: ComponentType;
    ssr?: boolean;
    fallback?: ComponentType<T>;
  } = {}
) {
  const {
    loading = () => React.createElement('div', { className: 'animate-pulse bg-gray-200 rounded h-20' }),
    ssr = false,
    fallback
  } = options;

  return dynamic(
    async () => {
      try {
        const module = await importFn();
        return 'default' in module ? module : { default: module as ComponentType<T> };
      } catch (error) {
        console.warn('Failed to load component:', error);
        if (fallback) {
          return { default: fallback };
        }
        throw error;
      }
    },
    {
      loading,
      ssr
    }
  );
}

// Predefined skeleton loaders
export const skeletonLoaders = {
  card: () => React.createElement('div', { className: 'bg-white p-6 rounded-lg border animate-pulse' },
    React.createElement('div', { className: 'h-6 bg-gray-200 rounded mb-4' }),
    React.createElement('div', { className: 'space-y-2' },
      React.createElement('div', { className: 'h-4 bg-gray-200 rounded' }),
      React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-3/4' })
    )
  ),
  list: () => React.createElement('div', { className: 'space-y-3' },
    Array.from({ length: 3 }).map((_, i) =>
      React.createElement('div', { key: i, className: 'flex items-center space-x-4 p-4 bg-white rounded-lg border animate-pulse' },
        React.createElement('div', { className: 'w-12 h-12 bg-gray-200 rounded' }),
        React.createElement('div', { className: 'flex-1 space-y-2' },
          React.createElement('div', { className: 'h-4 bg-gray-200 rounded w-3/4' }),
          React.createElement('div', { className: 'h-3 bg-gray-200 rounded w-1/2' })
        )
      )
    )
  ),
  image: () => React.createElement('div', { className: 'w-full h-48 bg-gray-200 rounded-lg animate-pulse' }),
  button: () => React.createElement('div', { className: 'h-10 w-24 bg-gray-200 rounded animate-pulse' }),
  form: () => React.createElement('div', { className: 'space-y-4 animate-pulse' },
    React.createElement('div', { className: 'h-10 bg-gray-200 rounded' }),
    React.createElement('div', { className: 'h-10 bg-gray-200 rounded' }),
    React.createElement('div', { className: 'h-32 bg-gray-200 rounded' }),
    React.createElement('div', { className: 'h-10 bg-gray-200 rounded w-24' })
  )
};

// Common lazy components
export const LazyOptimizedImage = createLazyComponent(
  () => import('@/components/ui/OptimizedImage').then(mod => mod.OptimizedImage),
  { loading: skeletonLoaders.image, ssr: false }
);

export const LazyLoadingStates = createLazyComponent(
  () => import('@/components/ui/LoadingStates'),
  { loading: skeletonLoaders.card, ssr: false }
);

// Component that defers rendering until it's needed
export function DeferredComponent<T>({
  component: Component,
  fallback,
  defer = true,
  ...props
}: {
  component: ComponentType<T>;
  fallback?: ComponentType;
  defer?: boolean;
} & T) {
  if (!defer) {
    return React.createElement(Component, props);
  }

  const LazyComponent = createLazyComponent(
    () => Promise.resolve(Component),
    { loading: fallback, ssr: false }
  );

  return React.createElement(LazyComponent, props);
}