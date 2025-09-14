import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Map component types
export type MapSpot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type?: string;
};

type MapProps = {
  spots: MapSpot[];
  onSelect?: (id: string) => void;
};

// Loading component for map
function MapSkeleton() {
  return (
    <div className="size-full bg-neutral-100 animate-pulse flex items-center justify-center rounded-lg">
      <div className="flex flex-col items-center space-y-2 text-neutral-500">
        <div className="size-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">地図を読み込み中...</p>
      </div>
    </div>
  );
}

// Dynamic import of Map component
const MapComponent = dynamic(() => import('./Map'), {
  loading: () => <MapSkeleton />,
  ssr: false, // Disable SSR for maplibre-gl
}) as ComponentType<MapProps>;

export default MapComponent;
export { MapSkeleton };