import { useEffect, useMemo, useRef } from 'react';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export type MapSpot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type?: string; // 'spot' | 'restaurant'
};

type Props = {
  spots: MapSpot[];
  onSelect?: (id: string) => void;
};

export default function Map({ spots, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<MapLibreMap | null>(null);
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  const geojson = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: spots.map((s) => ({
        type: 'Feature',
        properties: { id: s.id, name: s.name, type: s.type || 'spot' },
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      })),
    } as any;
  }, [spots]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (instanceRef.current) return; // init once
    const style = maptilerKey
      ? // Use MapTiler vector style when key provided
        `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`
      : // Fallback to OSM raster tiles with demo glyphs
        {
          version: 8,
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        } as any;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style,
      center: [138.3831, 34.9769], // Shizuoka approx
      zoom: 8.5,
    });
    instanceRef.current = map;

    function onLoad() {
      if (!instanceRef.current) return;
      const m = instanceRef.current;
      // Source with clustering
      if (!m.getSource('spots')) {
        m.addSource('spots', {
          type: 'geojson',
          data: geojson as any,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 60,
        });
      }

      // Cluster circles (brand green scale)
      if (!m.getLayer('clusters')) {
        m.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'spots',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#C8E6C9',
              10,
              '#81C784',
              30,
              '#4CAF50',
              100,
              '#388E3C',
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              18,
              10,
              22,
              30,
              28,
              100,
              34,
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });
      }

      // Cluster count labels
      if (!m.getLayer('cluster-count')) {
        m.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'spots',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            // Prefer fonts available in MapTiler or demo glyphs
            'text-font': ['Noto Sans Bold', 'Open Sans Bold'],
            'text-size': 12,
          },
          paint: {
            'text-color': '#ffffff',
          },
        });
      }

      // Unclustered points (spot=primary green, restaurant=orange)
      if (!m.getLayer('unclustered-point')) {
        m.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'spots',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'match',
              ['get', 'type'],
              'restaurant', '#FF9800',
              'event', '#7E57C2',
              'spot', '#4CAF50',
              /* default */ '#4CAF50',
            ],
            'circle-radius': 10,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
      }

      // Click handlers
      m.on('click', 'clusters', (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        const source: any = m.getSource('spots');
        if (!clusterId || !source) return;
        source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          const [lng, lat] = (features[0].geometry as any).coordinates as [number, number];
          m.easeTo({ center: [lng, lat], zoom });
        });
      });

      m.on('click', 'unclustered-point', (e) => {
        const feature = e.features?.[0];
        const id = feature?.properties?.id as string | undefined;
        if (id) onSelect?.(id);
      });

      m.on('mouseenter', 'clusters', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'clusters', () => (m.getCanvas().style.cursor = ''));
      m.on('mouseenter', 'unclustered-point', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'unclustered-point', () => (m.getCanvas().style.cursor = ''));

      // Add layer for current position (hidden initially)
      if (!m.getSource('me')) {
        m.addSource('me', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        } as any);
        m.addLayer({
          id: 'me-point',
          type: 'circle',
          source: 'me',
          paint: {
            'circle-color': '#1E88E5',
            'circle-radius': 8,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });
      }
    }

    if (map.loaded()) onLoad();
    else map.on('load', onLoad);
    return () => {
      map.remove();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = instanceRef.current;
    if (!map) return;
    const src: any = map.getSource('spots');
    if (src) src.setData(geojson as any);
  }, [geojson]);

  function locateMe() {
    const m = instanceRef.current;
    if (!m || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const src: any = m.getSource('me');
        if (src) {
          src.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: { type: 'Point', coordinates: [longitude, latitude] },
              },
            ],
          });
        }
        m.easeTo({ center: [longitude, latitude], zoom: Math.max(m.getZoom(), 13) });
      },
      () => {
        // ignore
      },
      { enableHighAccuracy: true, maximumAge: 60_000 }
    );
  }

  return (
    <div className="relative">
      <div ref={mapRef} className="map" />
      {/* Controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-2">
        <button
          className="rounded-lg bg-white border border-gray-300 shadow px-3 py-2 text-sm hover:bg-gray-50"
          onClick={locateMe}
          aria-label="現在地を表示"
        >
          現在地
        </button>
      </div>
      {/* Legend */}
      <div className="absolute bottom-2 right-2 rounded-lg bg-white/95 border border-gray-200 shadow px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#4CAF50' }} />
          <span>スポット</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#FF9800' }} />
          <span>レストラン</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: '#7E57C2' }} />
          <span>イベント</span>
        </div>
      </div>
    </div>
  );
}
