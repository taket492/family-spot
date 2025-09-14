// Advanced image optimization utilities

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  blur?: boolean;
  priority?: boolean;
}

export function generateOptimizedImageUrl(
  src: string,
  options: ImageOptimizationOptions = {}
): string {
  const {
    width,
    height,
    quality = 75,
    format = 'webp',
    blur = false
  } = options;

  // If it's a Supabase or external URL, use Next.js image optimization
  const params = new URLSearchParams();

  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', quality.toString());
  params.append('f', format);
  if (blur) params.append('blur', '1');

  return `/_next/image?url=${encodeURIComponent(src)}&${params.toString()}`;
}

export function generateSrcSet(
  src: string,
  options: ImageOptimizationOptions = {}
): string {
  const sizes = [320, 640, 768, 1024, 1280, 1920];

  return sizes
    .map(size => {
      const url = generateOptimizedImageUrl(src, { ...options, width: size });
      return `${url} ${size}w`;
    })
    .join(', ');
}

export function generateSizes(breakpoints?: string): string {
  if (breakpoints) return breakpoints;

  return [
    '(max-width: 320px) 280px',
    '(max-width: 640px) 600px',
    '(max-width: 768px) 728px',
    '(max-width: 1024px) 984px',
    '(max-width: 1280px) 1240px',
    '1880px'
  ].join(', ');
}

// Preload critical images
export function preloadImage(src: string, options: ImageOptimizationOptions = {}): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = generateOptimizedImageUrl(src, options);

  if (options.priority) {
    link.fetchPriority = 'high';
  }

  document.head.appendChild(link);
}

// Intersection Observer for lazy loading
export function createImageObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver | null {
  if (typeof window === 'undefined') return null;

  const defaultOptions: IntersectionObserverInit = {
    rootMargin: '50px 0px',
    threshold: 0.01,
    ...options
  };

  return new IntersectionObserver(callback, defaultOptions);
}

// Progressive image loading with blur placeholder
export function generateBlurDataURL(width: number = 8, height: number = 8): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Create a simple gradient blur placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.1);
}