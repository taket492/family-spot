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
      // Check if we're coming from restaurant search page
      if (window.location.pathname.includes('restaurant') || 
          window.document.referrer.includes('restaurant')) {
        params.set('restaurant', 'true');
      }
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
          // Check if we're coming from restaurant search page
          if (window.location.pathname.includes('restaurant') || 
              window.document.referrer.includes('restaurant')) {
            params.set('restaurant', 'true');
          }
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
    <div className="min-h-screen bg-neutral-50">
      <div className="page-container py-6">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/')}
            className="mb-4 -ml-2"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            トップへ戻る
          </Button>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              スポット検索
            </h1>
            <p className="mt-2 text-neutral-600">お探しのスポットを見つけましょう</p>
          </div>
        </div>

        {/* Search Section */}
        <Card className="p-6 mb-6 animate-fade-in">
          {/* Main Search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-xl text-base placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 transition-all"
                defaultValue={q}
                placeholder="キーワードを入力（例：公園、授乳室、屋内）"
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    performSearch((e.target as HTMLInputElement).value);
                }}
              />
            </div>
            <Button
              onClick={() => {
                const el = document.querySelector<HTMLInputElement>('input[placeholder*="キーワードを入力"]');
                performSearch(el?.value || '');
              }}
              size="lg"
              className="px-8"
            >
              検索
            </Button>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={sortMode === 'distance' ? 'primary' : 'outline'}
              size="sm"
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
            >
              📍 {locating ? '現在地取得中…' : '現在地から近い順'}
            </Button>
            <Button
              variant={sortMode === 'rating' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSortMode(sortMode === 'rating' ? 'default' : 'rating')}
            >
              ⭐ 評価が高い順
            </Button>
          </div>
        </Card>

        {/* Results Info */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-neutral-600" aria-live="polite">
            検索結果: {loading ? 
              <span className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                読み込み中…
              </span> : 
              <span className="font-semibold text-primary-600">{total}件</span>
            }
          </p>
          
          {/* View Toggle */}
          <div className="flex gap-2">
            <Button variant={tab === 'list' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('list')}>
              📋 リスト表示
            </Button>
            <Button variant={tab === 'map' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('map')}>
              🗺️ 地図表示
            </Button>
          </div>
        </div>

        {/* Info Messages */}
        {info ? (
          <Card className="mb-4 border-warning/20 bg-warning/5 animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center text-warning-700">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {info}
              </div>
            </CardContent>
          </Card>
        ) : sortMode !== 'distance' && !geo ? (
          <Card className="mb-4 border-info/20 bg-info/5">
            <CardContent className="p-3">
              <div className="flex items-center text-info-700 text-sm">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                現在地の許可で「近い順」が使えます
              </div>
            </CardContent>
          </Card>
        ) : null}
        {/* Results Section */}
        {tab === 'list' ? (
          <div>
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-2/3 mb-3" />
                      <Skeleton className="h-4 w-1/3 mb-3" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sortedSpots.length === 0 ? (
              <Card className="text-center p-12 animate-fade-in">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
                    <svg className="w-8 h-8 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-800 mb-2">
                    条件に合うスポットが見つかりませんでした
                  </h3>
                  <p className="text-neutral-600 mb-6">別のキーワードで検索してみてください</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {['屋内', '授乳室', '雨の日OK', 'ベビーカー', '駐車場あり'].map((t) => (
                    <Button
                      key={t}
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/search?q=${encodeURIComponent(t)}`)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </Card>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {sortedSpots.map((s) => {
                  const distance = geo ? Math.round(haversine(geo, { lat: s.lat, lng: s.lng }) / 100) / 10 : null; // km
                  return (
                    <Link key={s.id} href={`/spots/${s.id}`} className="block group" prefetch={false}>
                      <Card interactive className="hover:scale-[1.01] transition-all duration-200">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start gap-4">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-lg text-neutral-900 group-hover:text-primary-600 transition-colors duration-200 truncate">
                                {s.name}
                              </h3>
                              <div className="flex items-center gap-2 text-neutral-600 text-sm mt-1 mb-3">
                                <span>📍 {s.city}</span>
                                <span>⭐ {s.rating?.toFixed?.(1) ?? 0}</span>
                                {distance != null && <span>🚗 約 {distance} km</span>}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {s.tags?.slice(0, 6).map((t) => (
                                  <Badge key={t} label={t} variant="soft" />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center text-primary-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              詳細を見る
                              <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
            {/* Load More Button */}
            {nextOffset != null && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={loadingMore}
                  loading={loadingMore}
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
                >
                  {loadingMore ? '読み込み中...' : 'さらに表示する'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          {/* Map View */}
          <Card className="p-4">
            <Map
              spots={mapSpots}
              onSelect={(id) => {
                router.push(`/spots/${id}`);
              }}
            />
          </Card>
        )}
      </div>
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
