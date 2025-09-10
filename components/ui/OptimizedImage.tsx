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
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
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

  // Generate blur placeholder if none provided
  const defaultBlurDataURL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZjNmNGY2Ii8+Cjwvc3ZnPgo=';

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
        <svg className="h-8 w-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
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
          blurDataURL={blurDataURL || defaultBlurDataURL}
          onError={handleError}
          onLoadingComplete={handleLoadingComplete}
        />
        {isLoading && placeholder === 'empty' && (
          <div className={`absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center ${className}`}>
            <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
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
        blurDataURL={blurDataURL || defaultBlurDataURL}
        onError={handleError}
        onLoadingComplete={handleLoadingComplete}
      />
      {isLoading && placeholder === 'empty' && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center`}>
          <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        </div>
      )}
    </div>
  );
}
