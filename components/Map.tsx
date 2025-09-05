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
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
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

      // Cluster circles
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
              '#93c5fd',
              10,
              '#60a5fa',
              30,
              '#3b82f6',
              100,
              '#2563eb',
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
            'text-font': ['Noto Sans Regular'],
            'text-size': 12,
          },
          paint: {
            'text-color': '#ffffff',
          },
        });
      }

      // Unclustered points
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
              'restaurant',
              '#f59e0b',
              'spot',
              '#10b981',
              /* default */ '#10b981',
            ],
            'circle-radius': 9,
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

  return <div ref={mapRef} className="map" />;
}
