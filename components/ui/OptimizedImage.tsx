import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  fallbackSrc?: string;
  onLoadingComplete?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  fill = false,
  sizes,
  priority = false,
  fallbackSrc,
  onLoadingComplete,
  onError,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Show placeholder if error and no fallback
  if (hasError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
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
          onError={handleError}
          onLoadingComplete={handleLoadingComplete}
        />
        {isLoading && (
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
    <div className={`relative ${className}`}>
      <Image
        src={imgSrc}
        alt={alt}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        priority={priority}
        onError={handleError}
        onLoadingComplete={handleLoadingComplete}
      />
      {isLoading && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center`}>
          <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        </div>
      )}
    </div>
  );
}
