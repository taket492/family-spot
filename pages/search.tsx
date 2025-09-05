import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Map from '@/components/Map';

type Spot = {
  id: string;
  name: string;
  type: string;
  city: string;
  lat: number;
  lng: number;
  rating: number;
  tags: string[];
  images: string[];
};

export default function SearchPage() {
  const router = useRouter();
  const q = (router.query.q as string) || '';
  const [items, setItems] = useState<Spot[]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [sortMode, setSortMode] = useState<'default' | 'distance'>('default');

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      if (q == null) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/spots?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data.items;
        setItems(arr || []);
        setTotal(Array.isArray(data) ? arr.length : data.total || arr.length);
      } catch (e) {
        if ((e as any).name !== 'AbortError') console.error(e);
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [q]);

  const mapSpots = useMemo(
    () => items.map(({ id, name, lat, lng, type }) => ({ id, name, lat, lng, type })),
    [items]
  );

  function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371e3; // meters
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c; // meters
  }

  const sorted = useMemo(() => {
    if (sortMode !== 'distance' || !geo) return items;
    return [...items]
      .map((s) => ({ s, d: haversine(geo, { lat: s.lat, lng: s.lng }) }))
      .sort((a, b) => a.d - b.d)
      .map(({ s }) => s);
  }, [items, sortMode, geo]);

  return (
    <div className="max-w-[980px] mx-auto p-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          className="flex-1 border border-gray-300 rounded-md px-3 py-3 text-base"
          defaultValue={q}
          placeholder="検索ワードを入力"
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              router.push(`/search?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
          }}
        />
        <div className="flex gap-2">
          <button
            className="bg-gray-900 text-white rounded-md px-4 py-3 min-h-[44px] min-w-[44px]"
            onClick={() => {
              const el = document.querySelector<HTMLInputElement>('input[placeholder="検索ワードを入力"]');
              router.push(`/search?q=${encodeURIComponent(el?.value || '')}`);
            }}
          >
            検索
          </button>
          <button
            className={`rounded-md px-4 py-3 min-h-[44px] min-w-[44px] border ${
              sortMode === 'distance' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-900 border-gray-300'
            }`}
            onClick={() => {
              if (sortMode === 'distance') {
                setSortMode('default');
                return;
              }
              if (!navigator.geolocation) return alert('位置情報が利用できません');
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  setSortMode('distance');
                },
                () => alert('現在地を取得できませんでした'),
                { enableHighAccuracy: true, maximumAge: 60_000 }
              );
            }}
          >
            現在地から近い順
          </button>
        </div>
      </div>
      <p className="text-gray-500 mt-2">検索結果: {loading ? '読み込み中…' : `${total}件`}</p>
      <div className="flex gap-2 mt-2">
        <button
          className={`px-3 py-2 rounded-md border min-h-[44px] min-w-[44px] ${
            tab === 'list' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300'
          }`}
          onClick={() => setTab('list')}
        >
          リスト
        </button>
        <button
          className={`px-3 py-2 rounded-md border min-h-[44px] min-w-[44px] ${
            tab === 'map' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-300'
          }`}
          onClick={() => setTab('map')}
        >
          地図
        </button>
      </div>
      {tab === 'list' ? (
        <div className="mt-3">
          {sorted.map((s) => {
            const distance = geo ? Math.round(haversine(geo, { lat: s.lat, lng: s.lng }) / 100) / 10 : null; // km
            return (
              <div className="border border-gray-200 rounded-lg p-3 my-2" key={s.id}>
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-gray-500">{s.city} ・ ⭐ {s.rating?.toFixed?.(1) ?? 0}</div>
                    <div className="text-gray-500">{s.tags?.join(', ')}</div>
                    {distance != null && <div className="text-gray-500">約 {distance} km</div>}
                  </div>
                  <div className="shrink-0">
                    <button
                      className="bg-gray-900 text-white rounded-md px-4 py-3 min-h-[44px] min-w-[44px]"
                      onClick={() => router.push(`/spots/${s.id}`)}
                    >
                      詳細
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3">
          <Map
            spots={mapSpots}
            onSelect={(id) => {
              router.push(`/spots/${id}`);
            }}
          />
        </div>
      )}
    </div>
  );
}
