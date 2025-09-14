import dynamic from 'next/dynamic';

// Dynamic image component with loading state
export const DynamicOptimizedImage = dynamic(
  () => import('@/components/ui/OptimizedImage').then(mod => ({ default: mod.OptimizedImage })),
  {
    loading: () => <div className="w-full h-32 bg-gray-200 rounded animate-pulse" />,
    ssr: false
  }
);

// Dynamic advanced optimized image with more features
export const DynamicAdvancedImage = dynamic(
  () => import('@/components/ui/AdvancedOptimizedImage').then(mod => ({ default: mod.AdvancedOptimizedImage })),
  {
    loading: () => <div className="w-full h-64 bg-gray-200 rounded-lg animate-pulse" />,
    ssr: false
  }
);

// Dynamic loading states component
export const DynamicLoadingStates = dynamic(
  () => import('@/components/ui/LoadingStates'),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-20 rounded" />,
    ssr: false
  }
);

// Dynamic stats visualization component (for future use)
export const DynamicStatsChart = dynamic(
  () => Promise.resolve(() => (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">統計情報</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">0</div>
          <div className="text-sm text-gray-600">訪問スポット</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">0</div>
          <div className="text-sm text-gray-600">参加イベント</div>
        </div>
      </div>
    </div>
  )),
  {
    loading: () => (
      <div className="bg-white p-6 rounded-lg border animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="h-8 bg-gray-200 rounded mb-2" />
            <div className="h-4 bg-gray-200 rounded" />
          </div>
          <div className="text-center">
            <div className="h-8 bg-gray-200 rounded mb-2" />
            <div className="h-4 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
);

// Dynamic form components for heavy forms
export const DynamicFormBuilder = dynamic(
  () => Promise.resolve(() => (
    <div className="space-y-4">
      <div className="text-sm text-gray-500">動的フォームコンポーネント</div>
    </div>
  )),
  {
    loading: () => <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-32 bg-gray-200 rounded" />
    </div>,
    ssr: false
  }
);

// Dynamic map component (for future geographical features)
export const DynamicMap = dynamic(
  () => Promise.resolve(() => (
    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">マップコンポーネント</div>
    </div>
  )),
  {
    loading: () => <div className="w-full h-64 bg-gray-200 rounded-lg animate-pulse" />,
    ssr: false
  }
);

// HOC for making any component dynamic
export function withDynamicLoading<T extends {}>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  loadingComponent?: React.ComponentType,
  options: { ssr?: boolean } = { ssr: false }
) {
  return dynamic(importFn, {
    loading: loadingComponent || (() => <div className="animate-pulse bg-gray-200 h-20 rounded" />),
    ssr: options.ssr
  });
}