import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
const Map = dynamic(() => import('@/components/Map'), { ssr: false });
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { safeParseArray } from '@/lib/utils';

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

type SearchProps = {
  initialQ?: string;
  initialItems?: Spot[];
  initialTotal?: number;
  initialNextOffset?: number | null;
};

export default function SearchPage({ initialQ, initialItems = [], initialTotal = 0, initialNextOffset = null }: SearchProps) {
  const router = useRouter();
  const q = (router.query.q as string) || '';
  const [mode, setMode] = useState<'spots' | 'events'>('spots');
  const [items, setItems] = useState<Spot[]>(initialQ === q ? initialItems : []);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(initialQ === q ? initialTotal : 0);
  const [tab, setTab] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [sortMode, setSortMode] = useState<'default' | 'distance' | 'rating'>('default');
  const [info, setInfo] = useState<string | null>(null);
  const usedInitial = useRef(false);
  const [nextOffset, setNextOffset] = useState<number | null>(initialQ === q ? initialNextOffset : null);
  // When we perform a client-side search, skip the immediate effect refetch
  const manualFetchQ = useRef<string | null>(null);

  async function performSearch(newQ: string) {
    const controller = new AbortController();
    try {
      manualFetchQ.current = newQ;
      setLoading(true);
      const params = new URLSearchParams();
      params.set('q', newQ);
      params.set('limit', '20');
      params.set('offset', '0');
      // Prefer full-text search path on API for speed
      params.set('fts', 'true');
      const res = await fetch(`/api/spots?${params.toString()}`, { signal: controller.signal });
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.items;
      setItems(arr || []);
      setTotal(Array.isArray(data) ? arr.length : data.total || arr.length);
      setNextOffset(data.nextOffset ?? null);
      // Shallow route update to reflect the URL without re-running GSSP
      router.replace({ pathname: '/search', query: { q: newQ } }, undefined, { shallow: true });
    } catch (e) {
      if ((e as any).name !== 'AbortError') console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Events search feature temporarily disabled: always use 'spots'

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      if (q == null) return;
      // If this navigation originated from performSearch, skip duplicate fetch
      if (manualFetchQ.current === q) {
        manualFetchQ.current = null;
        return;
      }
      setLoading(true);
      try {
        if (mode === 'spots') {
          // Serve initial SSR data without refetch
          if (!usedInitial.current && initialQ === q && initialItems.length) {
            usedInitial.current = true;
            setLoading(false);
            return;
          }
          const params = new URLSearchParams();
          params.set('q', q);
          params.set('limit', '20');
          params.set('offset', '0');
          // Prefer full-text search
          params.set('fts', 'true');
          const res = await fetch(`/api/spots?${params.toString()}`, { signal: controller.signal });
          const data = await res.json();
          const arr = Array.isArray(data) ? data : data.items;
          setItems(arr || []);
          setTotal(Array.isArray(data) ? arr.length : data.total || arr.length);
          setNextOffset(data.nextOffset ?? null);
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
              performSearch((e.target as HTMLInputElement).value);
          }}
        />
        <div className="flex gap-2">
          <Button
            onClick={() => {
              const el = document.querySelector<HTMLInputElement>('input[placeholder="検索ワードを入力"]');
              performSearch(el?.value || '');
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
                setInfo('位置情報が利用できません（ブラウザ設定をご確認ください）');
                return;
              }
              setLocating(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  setSortMode('distance');
                  setLocating(false);
                  setInfo(null);
                },
                () => {
                  setInfo('現在地を取得できませんでした');
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
      <p className="text-gray-500 mt-2" aria-live="polite">検索結果: {loading ? '読み込み中…' : `${total}件`}</p>
      {info ? (
        <div className="mt-2 text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          {info}
        </div>
      ) : sortMode !== 'distance' && !geo ? (
        <div className="mt-2 text-sm text-gray-500">現在地の許可で「近い順」が使えます</div>
      ) : null}
      <div className="flex gap-2 mt-2">
        <Button variant={'primary'} disabled>スポット</Button>
        <div className="flex-1" />
        <Button variant={tab === 'list' ? 'primary' : 'secondary'} onClick={() => setTab('list')}>リスト</Button>
        <Button variant={tab === 'map' ? 'primary' : 'secondary'} onClick={() => setTab('map')}>地図</Button>
      </div>
      {tab === 'list' ? (
        <div className="mt-3">
          {loading ? (
            <div>
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="my-3">
                  <CardContent>
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-32 mt-2" />
                    <div className="flex gap-2 mt-3">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedSpots.length === 0 ? (
            <div className="my-6 text-center">
              <div className="text-gray-600">条件に合うスポットが見つかりませんでした</div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {['屋内', '授乳室', '雨の日OK', 'ベビーカー', '駐車場あり'].map((t) => (
                  <button
                    key={t}
                    className="px-4 py-2 rounded-full border text-sm bg-white border-gray-300 text-gray-700"
                    onClick={() => router.push(`/search?q=${encodeURIComponent(t)}`)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            sortedSpots.map((s) => {
              const distance = geo ? Math.round(haversine(geo, { lat: s.lat, lng: s.lng }) / 100) / 10 : null; // km
              return (
                <Link key={s.id} href={`/spots/${s.id}`} className="block" prefetch={false}>
                  <Card className="my-3 cursor-pointer hover:shadow-md transition-shadow">
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
                      <div className="shrink-0 self-center text-primary font-medium">詳細</div>
                    </div>
                  </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
          {/* Load more */}
          {nextOffset != null && (
            <div className="my-4 flex justify-center">
              <Button
                variant="secondary"
                disabled={loadingMore}
                onClick={async () => {
                  if (loadingMore || nextOffset == null) return;
                  setLoadingMore(true);
                  try {
                    const params = new URLSearchParams();
                    params.set('q', q);
                    params.set('limit', '20');
                    params.set('offset', String(nextOffset));
                    const res = await fetch(`/api/spots?${params.toString()}`);
                    const data = await res.json();
                    const arr: Spot[] = Array.isArray(data) ? data : data.items || [];
                    setItems((prev) => [...prev, ...arr]);
                    setTotal(data.total ?? (arr.length + items.length));
                    setNextOffset(data.nextOffset ?? null);
                  } finally {
                    setLoadingMore(false);
                  }
                }}
              >{loadingMore ? '読み込み中…' : 'もっと見る'}</Button>
            </div>
          )}
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

export const getServerSideProps: GetServerSideProps<SearchProps> = async (ctx) => {
  const q = (ctx.query.q as string) || '';
  try {
    // Reuse server-side search util with Postgres full-text search for speed
    const { searchSpots } = await import('@/lib/search');
    const { items, total, nextOffset } = await searchSpots({ query: q, limit: 20, offset: 0, useFullTextSearch: true });
    // Allow CDN caching of SSR response for brief period
    ctx.res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=180, stale-while-revalidate=600');
    return { props: { initialQ: q, initialItems: items, initialTotal: total, initialNextOffset: nextOffset } };
  } catch {
    return { props: { initialQ: q, initialItems: [], initialTotal: 0, initialNextOffset: null } };
  }
};
