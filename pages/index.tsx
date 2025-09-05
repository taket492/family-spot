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

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [featured, setFeatured] = useState<Spot[]>([]);

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
    </div>
  );
}
