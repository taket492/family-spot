import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { safeParseArray } from '@/lib/utils';
import AuthButton from '@/components/AuthButton';

type Spot = {
  id: string;
  name: string;
  city: string;
  type: string;
  rating: number;
  tags: string[];
  images: string[];
};

type EventItem = {
  id: string;
  title: string;
  city: string;
  startAt: string;
  endAt?: string | null;
  tags: string[];
  images: string[];
};

type HomeProps = { featured: Spot[] };

export default function Home({ featured }: HomeProps) {
  const router = useRouter();
  const [q, setQ] = useState('');
  // Feature flags: hide events/web search sections for now
  const SHOW_HOME_EVENTS = false;
  const SHOW_HOME_WEB = false;
  const [events, setEvents] = useState<EventItem[]>([]);
  const [webItems, setWebItems] = useState<{ title: string; link: string; snippet?: string; source?: string }[]>([]);

  function runSearch(query?: string) {
    const qq = query ?? q;
    const params = new URLSearchParams();
    if (qq) params.set('q', qq);
    router.push(`/search?${params.toString()}`);
  }

  // featured is provided server-side for faster TTFB

  useEffect(() => {
    if (!SHOW_HOME_EVENTS) return;
    const ctl = new AbortController();
    async function loadEvents() {
      try {
        const res = await fetch('/api/events', { signal: ctl.signal });
        const data = await res.json();
        const items: EventItem[] = Array.isArray(data) ? data : data.items || [];
        setEvents(items.slice(0, 4));
      } catch (_) {
        // ignore
      }
    }
    loadEvents();
    return () => ctl.abort();
  }, [SHOW_HOME_EVENTS]);

  function formatEventDate(e: EventItem) {
    const start = new Date(e.startAt);
    const end = e.endAt ? new Date(e.endAt) : null;
    if (end) return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    return start.toLocaleString();
  }

  useEffect(() => {
    if (!SHOW_HOME_WEB) return;
    const ctl = new AbortController();
    async function loadWeb() {
      try {
        const q = encodeURIComponent('静岡 イベント 今週末');
        const res = await fetch(`/api/websearch?q=${q}&count=5`, { signal: ctl.signal });
        if (!res.ok) return;
        const data = await res.json();
        setWebItems(data.items || []);
      } catch (_) {
        // ignore
      }
    }
    loadWeb();
    return () => ctl.abort();
  }, [SHOW_HOME_WEB]);

  return (
    <div className="page-container py-6">
      {/* Auth button */}
      <div className="flex justify-end mb-4">
        <AuthButton />
      </div>
      
      {/* Hero */}
      <div className="text-center py-8 animate-fade-in">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center size-20 mb-4 bg-gradient-primary rounded-3xl shadow-lg animate-bounce-soft">
            <svg width="48" height="48" viewBox="0 0 64 64" aria-hidden className="text-white">
              <circle cx="24" cy="26" r="3" fill="currentColor" />
              <circle cx="40" cy="26" r="3" fill="currentColor" />
              <path d="M22 40c4 4 16 4 20 0" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-en text-4xl sm:text-5xl font-extrabold leading-tight bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            <div>静岡県 子連れ向け</div>
            <div>検索サイト</div>
          </h1>
          <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
            家族での素敵な時間を過ごせる場所を見つけよう
          </p>
        </div>
      </div>

      {/* Search box */}
      <div className="mt-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-all duration-200 border border-neutral-100">
            <div className="flex-1 flex items-center px-4 py-3">
              <div className="mr-3 size-5 text-primary-500">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                className="w-full text-base bg-transparent outline-none placeholder:text-neutral-400"
                placeholder="キーワードで探す（例：公園、授乳室、屋内）"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              />
            </div>
            <Button 
              onClick={() => runSearch()}
              size="lg"
              className="shrink-0"
            >
              検索
            </Button>
          </div>
        </div>
      </div>

      {/* Quick filters */}
      <div className="mt-6">
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              size="md"
              className="rounded-2xl h-12 font-medium hover:scale-105 transition-transform"
              onClick={() => router.push('/search?age=0-2')}
            >
              👶 0〜2歳
            </Button>
            <Button
              variant="outline"
              size="md"
              className="rounded-2xl h-12 font-medium hover:scale-105 transition-transform"
              onClick={() => runSearch('屋内')}
            >
              🏠 屋内
            </Button>
            <Button
              variant="outline"
              size="md"
              className="rounded-2xl h-12 font-medium hover:scale-105 transition-transform"
              onClick={() => runSearch('授乳室')}
            >
              🤱 授乳室あり
            </Button>
          </div>
        </div>
      </div>

      {/* Entrypoints to category-first pages */}
      <div className="mt-10">
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="outline"
              size="xl"
              className="rounded-2xl h-16 text-base font-semibold group hover:scale-105 transition-all duration-200"
              onClick={() => router.push('/search-top')}
            >
              <span className="mr-2">🗺️</span>
              スポットをカテゴリから探す
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="rounded-2xl h-16 text-base font-semibold group hover:scale-105 transition-all duration-200"
              onClick={() => router.push('/search-top-restaurant')}
            >
              <span className="mr-2">🍽️</span>
              レストランを特徴から探す
            </Button>
          </div>
          <div className="mt-4">
            <Button
              variant="gradient"
              size="xl"
              className="w-full rounded-2xl h-16 text-base font-semibold hover:scale-105 transition-all duration-200"
              onClick={() => router.push('/spots/new')}
            >
              <span className="mr-2">✨</span>
              スポットを登録する
            </Button>
          </div>
        </div>
      </div>

      {/* Featured */}
      <div className="mt-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            注目のスポット
          </h2>
          <p className="mt-2 text-neutral-600">みんなにおすすめの人気スポット</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
          {featured.map((s) => (
            <Link key={s.id} href={`/spots/${s.id}`} className="block group" prefetch={false}>
              <Card interactive className="overflow-hidden">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                  {s.images?.[0] ? (
                    <OptimizedImage
                      src={s.images[0]}
                      alt={s.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      priority={false}
                    />
                  ) : (
                    <div className="flex items-center justify-center size-full bg-gradient-to-br from-neutral-200 to-neutral-300">
                      <svg className="w-12 h-12 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-neutral-900 group-hover:text-primary-600 transition-colors duration-200 mb-3">
                    {s.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {s.tags?.slice(0, 4).map((t) => (
                      <Badge key={t} label={t} variant="soft" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link href="/search">
            <Button variant="ghost" size="lg" className="font-semibold">
              もっと見る
              <svg className="ml-2 size-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Button>
          </Link>
        </div>
      </div>

      {/* Events (hidden) */}
      {SHOW_HOME_EVENTS && (
        <>
          <div className="mt-10 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-primary">開催中・これからのイベント</h2>
            <button className="text-secondary font-medium" onClick={() => router.push('/search?kind=events')}>もっと見る ＞</button>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {events.length === 0 ? (
              <div className="text-gray-500">イベント情報の準備中です。</div>
            ) : (
              events.map((e) => (
                <Card key={e.id} interactive className="cursor-pointer" onClick={() => router.push(`/events/${e.id}`)}>
                  {e.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.images[0]}
                      alt={e.title}
                      className="aspect-[4/3] w-full object-cover rounded-t-2xl bg-neutral-200"
                    />
                  ) : (
                    <div className="aspect-[4/3] w-full bg-neutral-200 rounded-t-2xl overflow-hidden" />
                  )}
                  <CardContent>
                    <div className="text-lg font-bold">{e.title}</div>
                    <div className="text-gray-500 text-sm mt-1">{e.city} ・ {formatEventDate(e)}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {e.tags?.slice(0, 4).map((t) => (
                        <Badge key={t} label={t} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Web search (hidden) */}
      {SHOW_HOME_WEB && (
        <>
          <div className="mt-10 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold text-primary">Webのイベント情報（静岡・今週末）</h2>
            <a className="text-secondary font-medium" href="https://www.google.com/search?q=%E9%9D%99%E5%B2%A1+%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88+%E4%BB%8A%E9%80%B1%E6%9C%AB" target="_blank" rel="noreferrer">Googleで見る ＞</a>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3">
            {webItems.length === 0 ? (
              <div className="text-gray-500">検索結果の取得準備中です。</div>
            ) : (
              webItems.map((w) => (
                <Card key={w.link} className="">
                  <CardContent>
                    <a href={w.link} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">
                      {w.title}
                    </a>
                    {w.source && <div className="text-gray-500 text-xs mt-1">{w.source}</div>}
                    {w.snippet && <div className="text-gray-700 text-sm mt-1">{w.snippet}</div>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async ({ res }) => {
  try {
    // Fetch top 4 featured spots server-side to avoid client roundtrip
    const { prisma } = await import('@/lib/db');
    const raw = await prisma.spot.findMany({ orderBy: { updatedAt: 'desc' }, take: 4 });
    const featured = raw.map((s: any) => ({
      ...s,
      tags: safeParseArray(s.tags),
      images: safeParseArray(s.images),
    }));
    // CDN/Browser caching hint (can be tuned or removed during dynamic content updates)
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return { props: { featured } };
  } catch {
    return { props: { featured: [] } };
  }
};
