'use client';

import { useState, useRef, useEffect } from 'react';
import {
  generateOptimizedImageUrl,
  generateSrcSet,
  generateSizes,
  createImageObserver,
  type ImageOptimizationOptions
} from '@/lib/imageOptimization';

interface AdvancedOptimizedImageProps extends ImageOptimizationOptions {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  threshold?: number;
}

export function AdvancedOptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  quality = 75,
  format = 'webp',
  sizes,
  placeholder = 'blur',
  priority = false,
  lazy = true,
  threshold = 0.1,
  onLoad,
  onError,
  ...props
}: AdvancedOptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    observerRef.current = createImageObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      { threshold }
    );

    if (imgRef.current && observerRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy, priority, isInView, threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const optimizedSrc = generateOptimizedImageUrl(src, {
    width,
    height,
    quality,
    format,
    blur: placeholder === 'blur' && !isLoaded
  });

  const srcSet = generateSrcSet(src, { quality, format });
  const imageSizes = generateSizes(sizes);

  // Error state
  if (hasError) {
    return (
      <div
        className={`bg-neutral-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <svg
          className="w-8 h-8 text-neutral-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder */}
      {placeholder === 'blur' && !isLoaded && (
        <div
          className="absolute inset-0 bg-neutral-200 animate-pulse"
          style={{ width, height }}
        />
      )}

      {/* Loading skeleton */}
      {!isInView && lazy && !priority && (
        <div
          ref={imgRef}
          className="bg-neutral-100 animate-pulse"
          style={{ width, height }}
        />
      )}

      {/* Main image */}
      {isInView && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={imageSizes}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`
            transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
            ${className}
          `}
          style={{
            objectFit: 'cover',
            objectPosition: 'center'
          }}
          {...props}
        />
      )}
    </div>
  );
}