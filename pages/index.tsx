import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

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

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [featured, setFeatured] = useState<Spot[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [webItems, setWebItems] = useState<{ title: string; link: string; snippet?: string; source?: string }[]>([]);

  function runSearch(query?: string) {
    const qq = query ?? q;
    const params = new URLSearchParams();
    if (qq) params.set('q', qq);
    router.push(`/search?${params.toString()}`);
  }

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch('/api/spots', { signal: controller.signal });
        const data = await res.json();
        const items: Spot[] = Array.isArray(data) ? data : data.items || [];
        setFeatured(items.slice(0, 4));
      } catch (_) {
        // ignore
      }
    }
    load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    async function loadEvents() {
      try {
        // APIはデフォルトで「今日〜14日」を返すのでパラメータ不要
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
  }, []);

  function formatEventDate(e: EventItem) {
    const start = new Date(e.startAt);
    const end = e.endAt ? new Date(e.endAt) : null;
    if (end) return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    return start.toLocaleString();
  }

  useEffect(() => {
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
  }, []);

  return (
    <div className="page-container py-6">
      {/* Hero */}
      <div className="flex items-start gap-4">
        <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden className="shrink-0">
          <circle cx="32" cy="32" r="30" fill="#E8F5E9" stroke="#4CAF50" strokeWidth="3" />
          <circle cx="24" cy="26" r="3" fill="#2e7d32" />
          <circle cx="40" cy="26" r="3" fill="#2e7d32" />
          <path d="M22 40c4 4 16 4 20 0" stroke="#2e7d32" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
        <div>
          <div className="font-en text-3xl sm:text-4xl font-extrabold leading-tight">
            <div>静岡県 子連れ向け</div>
            <div>検索サイト</div>
          </div>
        </div>
      </div>

      {/* Search box */}
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center rounded-2xl border-2 border-primary bg-[#F1FAF1] px-4 py-3">
            <span className="text-primary mr-2">🔍</span>
            <input
              className="w-full bg-transparent outline-none text-base"
              placeholder="キーワードで探す"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
          </div>
          <Button onClick={() => runSearch()}>検索</Button>
        </div>
      </div>

      {/* Quick filters */}
      <div className="mt-4 grid grid-cols-3 gap-3 max-w-xl">
        <button
          className="rounded-2xl bg-[#E8F0FF] text-[#1e40af] px-4 py-3 text-base font-medium"
          onClick={() => router.push('/search?age=0-2')}
        >
          0〜2歳
        </button>
        <button
          className="rounded-2xl bg-[#E8F0FF] text-[#1e40af] px-4 py-3 text-base font-medium"
          onClick={() => runSearch('屋内')}
        >
          屋内
        </button>
        <button
          className="rounded-2xl bg-[#E8F0FF] text-[#1e40af] px-4 py-3 text-base font-medium"
          onClick={() => runSearch('授乳室')}
        >
          授乳室あり
        </button>
      </div>

      {/* Entrypoints to category-first pages */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <Button
          variant="secondary"
          size="lg"
          className="rounded-full h-14 text-base"
          onClick={() => router.push('/search-top')}
        >
          スポットをカテゴリから探す
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="rounded-full h-14 text-base"
          onClick={() => router.push('/search-top-restaurant')}
        >
          レストランを特徴から探す
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="rounded-full h-14 text-base"
          onClick={() => router.push('/spots/new')}
        >
          スポットを登録する
        </Button>
      </div>

      {/* Featured */}
      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="text-2xl font-bold text-primary">注目のスポット</h2>
        <button className="text-secondary font-medium" onClick={() => router.push('/search')}>もっと見る ＞</button>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {featured.map((s) => (
          <Card key={s.id} interactive className="cursor-pointer" onClick={() => router.push(`/spots/${s.id}`)}>
            {s.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.images[0]}
                alt={s.name}
                className="aspect-[4/3] w-full object-cover rounded-t-2xl bg-neutralLight"
              />
            ) : (
              <div className="aspect-[4/3] w-full bg-neutralLight rounded-t-2xl overflow-hidden" />
            )}
            <CardContent>
              <div className="text-xl font-bold">{s.name}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {s.tags?.slice(0, 4).map((t) => (
                  <Badge key={t} label={t} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Events */}
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
                  className="aspect-[4/3] w-full object-cover rounded-t-2xl bg-neutralLight"
                />
              ) : (
                <div className="aspect-[4/3] w-full bg-neutralLight rounded-t-2xl overflow-hidden" />
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

      {/* Web search (fallback/overview) */}
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
    </div>
  );
}
