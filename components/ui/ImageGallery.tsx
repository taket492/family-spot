import { useState, useCallback, useEffect } from 'react';
import { OptimizedImage } from './OptimizedImage';
import { cleanImageArray } from '@/lib/imageUtils';

interface ImageGalleryProps {
  images: string[] | string;
  alt: string;
  className?: string;
  maxImages?: number;
  priority?: boolean;
}

export function ImageGallery({ 
  images, 
  alt, 
  className = '',
  maxImages = 6,
  priority = false
}: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0])); // Always load first image

  // Clean and process images
  const cleanedImages = Array.isArray(images) 
    ? cleanImageArray(JSON.stringify(images))
    : cleanImageArray(images);

  const displayImages = cleanedImages.slice(0, maxImages);
  
  // Preload images as they come into view
  const handleThumbnailVisible = useCallback((index: number) => {
    if (!loadedImages.has(index)) {
      setLoadedImages(prev => new Set([...prev, index]));
    }
  }, [loadedImages]);
  
  if (displayImages.length === 0) {
    return (
      <div className={`bg-neutral-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-neutral-500">
          <svg className="mx-auto size-12 mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
          <p className="text-sm">画像がありません</p>
        </div>
      </div>
    );
  }

  // Single image display
  if (displayImages.length === 1) {
    return (
      <div className={`relative rounded-lg overflow-hidden ${className}`}>
        <OptimizedImage
          src={displayImages[0]}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 80vw, (max-width: 1024px) 60vw, 50vw"
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  // Multiple images gallery
  return (
    <div className={className}>
      {/* Main image */}
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-4">
        <OptimizedImage
          src={displayImages[selectedIndex]}
          alt={`${alt} - 画像 ${selectedIndex + 1}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 80vw, (max-width: 1024px) 60vw, 50vw"
          priority={priority}
          className="object-cover"
        />
        
        {/* Image counter */}
        <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-2 py-1 rounded">
          {selectedIndex + 1} / {displayImages.length}
        </div>
        
        {/* Navigation arrows for larger galleries */}
        {displayImages.length > 2 && (
          <>
            <button
              onClick={() => setSelectedIndex(prev => prev === 0 ? displayImages.length - 1 : prev - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="前の画像"
            >
              <svg className="size-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedIndex(prev => prev === displayImages.length - 1 ? 0 : prev + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="次の画像"
            >
              <svg className="size-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </>
        )}
      </div>
      
      {/* Thumbnail grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {displayImages.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            onMouseEnter={() => {
              if (!loadedImages.has(index)) {
                setLoadedImages(prev => new Set([...prev, index]));
              }
            }}
            className={`
              relative aspect-square rounded overflow-hidden transition-all duration-200
              ${selectedIndex === index 
                ? 'ring-2 ring-primary-500 scale-105' 
                : 'hover:scale-105 opacity-80 hover:opacity-100'
              }
            `}
            aria-label={`画像 ${index + 1} を表示`}
          >
            <OptimizedImage
              src={image}
              alt={`${alt} サムネイル ${index + 1}`}
              fill
              sizes="(max-width: 640px) 25vw, (max-width: 768px) 16vw, 12vw"
              lazy={!loadedImages.has(index)}
              className="object-cover"
            />
          </button>
        ))}
      </div>
      
      {/* Show more indicator */}
      {cleanedImages.length > maxImages && (
        <div className="mt-2 text-center text-sm text-neutral-600">
          他に {cleanedImages.length - maxImages} 枚の画像があります
        </div>
      )}
    </div>
  );
}