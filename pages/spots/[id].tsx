import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

type Review = { id: string; stars: number; childAge: string; text: string; createdAt: string };
type Spot = {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  lat: number;
  lng: number;
  rating: number;
  tags: string[];
  reviews: Review[];
};

export default function SpotDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [spot, setSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(false);
  // review is posted in /reviews/new

  useEffect(() => {
    if (!id) return;
    const ctl = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/spots/${id}`, { signal: ctl.signal });
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        setSpot(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    return () => ctl.abort();
  }, [id]);

  function goReview() {
    if (!id) return;
    router.push(`/reviews/new?spotId=${id}`);
  }

  return (
    <div className="page-container py-4">
      <Button variant="secondary" onClick={() => router.back()}>&larr; 戻る</Button>
      {loading && <p className="mt-3">読み込み中…</p>}
      {spot && (
        <div className="mt-4">
          <h1 className="text-2xl font-bold">{spot.name}</h1>
          <p className="text-gray-500">{spot.city} ・ ⭐ {spot.rating?.toFixed?.(1) ?? 0}</p>
          {spot.address && <p className="text-gray-700 mt-1">{spot.address}</p>}
          <div className="flex flex-wrap gap-1 mt-2">
            {spot.tags?.map((t: string) => (
              <Badge key={t} label={t} />
            ))}
          </div>

          <h2 className="mt-6 font-semibold">レビュー</h2>
          {spot.reviews?.length ? (
            <div>
              {spot.reviews.map((r) => (
                <Card className="my-2" key={r.id}>
                  <CardContent>
                    <div className="font-semibold">⭐ {r.stars} / 子年齢: {r.childAge}</div>
                    <div className="whitespace-pre-wrap">{r.text}</div>
                    <div className="text-gray-500 text-xs">{new Date(r.createdAt).toLocaleString()}</div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <p className="text-gray-500">まだレビューはありません</p>
        )}
          <div className="mt-4">
            <Button onClick={goReview}>レビューを書く</Button>
          </div>
        </div>
      )}
    </div>
  );
}
