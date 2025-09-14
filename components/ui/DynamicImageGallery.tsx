import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Image gallery component types
interface ImageGalleryProps {
  images: string[] | string;
  alt: string;
  className?: string;
  maxImages?: number;
  priority?: boolean;
}

// Loading component for image gallery
function ImageGallerySkeleton() {
  return (
    <div className="w-full h-64 bg-neutral-100 animate-pulse rounded-lg flex items-center justify-center">
      <div className="flex flex-col items-center space-y-2 text-neutral-500">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">画像を読み込み中...</p>
      </div>
    </div>
  );
}

// Dynamic import of ImageGallery component
const DynamicImageGallery = dynamic(() => import('./ImageGallery').then(mod => ({ default: mod.ImageGallery })), {
  loading: () => <ImageGallerySkeleton />,
  ssr: false, // Disable SSR for better performance
}) as ComponentType<ImageGalleryProps>;

export default DynamicImageGallery;
export { ImageGallerySkeleton };