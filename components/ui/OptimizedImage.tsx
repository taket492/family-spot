import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  fallbackSrc?: string;
  lazy?: boolean;
  blurDataURL?: string;
  placeholder?: 'blur' | 'empty';
  onLoadingComplete?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  fill = false,
  sizes = '(max-width: 640px) 100vw, (max-width: 768px) 80vw, (max-width: 1024px) 50vw, (max-width: 1280px) 40vw, 33vw',
  priority = false,
  fallbackSrc,
  lazy = true,
  blurDataURL,
  placeholder = 'blur',
  onLoadingComplete,
  onError,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldLoad, setShouldLoad] = useState(!lazy || priority);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image enters the viewport
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, priority, shouldLoad]);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    
    // Try fallback image if provided
    if (fallbackSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
      return;
    }
    
    onError?.();
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
    setHasError(false);
    onLoadingComplete?.();
  };

  // Generate optimized blur placeholder
  const getBlurDataURL = () => {
    if (blurDataURL) return blurDataURL;
    
    // Create a minimal blur placeholder
    const svg = `<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <defs>
        <linearGradient id="g">
          <stop offset="0%" stop-color="#e5e7eb"/>
          <stop offset="100%" stop-color="#f9fafb"/>
        </linearGradient>
      </defs>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  };

  // Show placeholder if error and no fallback
  if (hasError) {
    return (
      <div 
        ref={containerRef}
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={width && height ? { width, height } : {}}
        aria-label={`画像が読み込めませんでした: ${alt}`}
      >
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-8 w-8 mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
          <span className="text-xs">画像なし</span>
        </div>
      </div>
    );
  }

  // Show placeholder while waiting to load (lazy loading)
  if (!shouldLoad) {
    return (
      <div 
        ref={containerRef}
        className={`bg-gray-100 animate-pulse flex items-center justify-center ${className}`}
        style={width && height ? { width, height } : {}}
        aria-label={`画像を読み込み中: ${alt}`}
      >
        <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </div>
    );
  }

  // When using `fill`, rely on the parent container to be `relative` and sized.
  if (fill) {
    return (
      <>
        <Image
          src={imgSrc}
          alt={alt}
          fill
          sizes={sizes}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          priority={priority}
          placeholder={placeholder}
          blurDataURL={getBlurDataURL()}
          onError={handleError}
          onLoadingComplete={handleLoadingComplete}
        />
        {isLoading && placeholder === 'empty' && (
          <div className={`absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse ${className}`}>
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          </div>
        )}
      </>
    );
  }

  // Non-fill usage keeps a wrapper for layout.
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={getBlurDataURL()}
        onError={handleError}
        onLoadingComplete={handleLoadingComplete}
      />
      {isLoading && placeholder === 'empty' && (
        <div className={`absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse`}>
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        </div>
      )}
    </div>
  );
}
