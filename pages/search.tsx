import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('@/components/Map'), { ssr: false });
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

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

type EventItem = {
  id: string;
  title: string;
  city: string;
  lat: number;
  lng: number;
  startAt: string;
  endAt?: string | null;
  tags: string[];
  images: string[];
};

export default function SearchPage() {
  const router = useRouter();
  const q = (router.query.q as string) || '';
  const [mode, setMode] = useState<'spots' | 'events'>('spots');
  const [items, setItems] = useState<Spot[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [sortMode, setSortMode] = useState<'default' | 'distance' | 'rating'>('default');

  // Initialize mode from query (e.g., /search?kind=events)
  useEffect(() => {
    const kind = (router.query.kind as string) || '';
    if (kind === 'events') setMode('events');
  }, [router.query.kind]);

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      if (q == null) return;
      setLoading(true);
      try {
        if (mode === 'spots') {
          const res = await fetch(`/api/spots?q=${encodeURIComponent(q)}`, { signal: controller.signal });
          const data = await res.json();
          const arr = Array.isArray(data) ? data : data.items;
          setItems(arr || []);
          setTotal(Array.isArray(data) ? arr.length : data.total || arr.length);
        } else {
          const params = new URLSearchParams();
          params.set('q', q || '');
          const from = new Date();
          const to = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          params.set('from', from.toISOString());
          params.set('to', to.toISOString());
          const res = await fetch(`/api/events?${params.toString()}`, { signal: controller.signal });
          const data = await res.json();
          const arr = Array.isArray(data) ? data : data.items;
          setEvents(arr || []);
          setTotal(Array.isArray(data) ? arr.length : data.total || arr.length);
        }
      } catch (e) {
        if ((e as any).name !== 'AbortError') console.error(e);
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [q, mode]);

  const mapSpots = useMemo(() => {
    if (mode === 'spots') return items.map(({ id, name, lat, lng, type }) => ({ id, name, lat, lng, type }));
    return events.map(({ id, title, lat, lng }) => ({ id, name: title, lat, lng, type: 'event' as const }));
  }, [items, events, mode]);

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

  const sortedSpots = useMemo(() => {
    if (sortMode === 'rating') return [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortMode === 'distance' && geo) {
      return [...items]
        .map((s) => ({ s, d: haversine(geo, { lat: s.lat, lng: s.lng }) }))
        .sort((a, b) => a.d - b.d)
        .map(({ s }) => s);
    }
    return items;
  }, [items, sortMode, geo]);

  const sortedEvents = useMemo(() => {
    if (sortMode === 'distance' && geo) {
      return [...events]
        .map((e) => ({ e, d: haversine(geo, { lat: e.lat, lng: e.lng }) }))
        .sort((a, b) => a.d - b.d)
        .map(({ e }) => e);
    }
    return events;
  }, [events, sortMode, geo]);

  return (
    <div className="page-container py-4">
      <div className="mb-2">
        <Button variant="secondary" onClick={() => router.push('/')}>← トップへ戻る</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          className="flex-1 border border-gray-300 rounded-xl px-3 py-3 text-base"
          defaultValue={q}
          placeholder="検索ワードを入力"
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              router.push(`/search?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
          }}
        />
        <div className="flex gap-2">
          <Button
            onClick={() => {
              const el = document.querySelector<HTMLInputElement>('input[placeholder="検索ワードを入力"]');
              router.push(`/search?q=${encodeURIComponent(el?.value || '')}`);
            }}
          >検索</Button>
          <Button
            variant={sortMode === 'distance' ? 'primary' : 'secondary'}
            disabled={locating}
            onClick={() => {
              if (sortMode === 'distance') {
                setSortMode('default');
                return;
              }
              if (!navigator.geolocation) {
                alert('位置情報が利用できません');
                return;
              }
              setLocating(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  setSortMode('distance');
                  setLocating(false);
                },
                () => {
                  alert('現在地を取得できませんでした');
                  setLocating(false);
                },
                { enableHighAccuracy: true, maximumAge: 60_000 }
              );
            }}
          >{locating ? '現在地取得中…' : '現在地から近い順'}</Button>
          <Button
            variant={sortMode === 'rating' ? 'primary' : 'secondary'}
            onClick={() => setSortMode(sortMode === 'rating' ? 'default' : 'rating')}
          >評価が高い順</Button>
        </div>
      </div>
      <p className="text-gray-500 mt-2">検索結果: {loading ? '読み込み中…' : `${total}件`}</p>
      <div className="flex gap-2 mt-2">
        <Button variant={mode === 'spots' ? 'primary' : 'secondary'} onClick={() => setMode('spots')}>スポット</Button>
        <Button variant={mode === 'events' ? 'primary' : 'secondary'} onClick={() => setMode('events')}>イベント</Button>
        <div className="flex-1" />
        <Button variant={tab === 'list' ? 'primary' : 'secondary'} onClick={() => setTab('list')}>リスト</Button>
        <Button variant={tab === 'map' ? 'primary' : 'secondary'} onClick={() => setTab('map')}>地図</Button>
      </div>
      {tab === 'list' ? (
        <div className="mt-3">
          {mode === 'spots' ? (
            sortedSpots.map((s) => {
              const distance = geo ? Math.round(haversine(geo, { lat: s.lat, lng: s.lng }) / 100) / 10 : null; // km
              return (
                <Card key={s.id} className="my-3">
                  <CardContent>
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{s.name}</div>
                        <div className="text-gray-500 text-sm">{s.city} ・ ⭐ {s.rating?.toFixed?.(1) ?? 0}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.tags?.slice(0, 6).map((t) => (
                            <Badge key={t} label={t} />
                          ))}
                        </div>
                        {distance != null && <div className="text-gray-500 text-xs mt-1">約 {distance} km</div>}
                      </div>
                      <div className="shrink-0 self-center">
                        <Button onClick={() => router.push(`/spots/${s.id}`)}>詳細</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            sortedEvents.map((e) => {
              const distance = geo ? Math.round(haversine(geo, { lat: e.lat, lng: e.lng }) / 100) / 10 : null; // km
              const start = new Date(e.startAt);
              const end = e.endAt ? new Date(e.endAt) : null;
              const dateStr = end
                ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
                : start.toLocaleString();
              return (
                <Card key={e.id} className="my-3">
                  <CardContent>
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{e.title}</div>
                        <div className="text-gray-500 text-sm">{e.city} ・ {dateStr}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {e.tags?.slice(0, 6).map((t) => (
                            <Badge key={t} label={t} />
                          ))}
                        </div>
                        {distance != null && <div className="text-gray-500 text-xs mt-1">約 {distance} km</div>}
                      </div>
                      <div className="shrink-0 self-center">
                        <Button onClick={() => router.push(`/events/${e.id}`)}>詳細</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        <div className="mt-3">
          <Map
            spots={mapSpots}
            onSelect={(id) => {
              if (mode === 'spots') router.push(`/spots/${id}`);
              else router.push(`/events/${id}`);
            }}
          />
        </div>
      )}
    </div>
  );
}
