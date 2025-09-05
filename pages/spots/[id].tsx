import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

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
  const [posting, setPosting] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');

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

  async function submitReview() {
    if (!id) return;
    setPosting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotId: id, name, stars, age, text }),
      });
      if (!res.ok) throw new Error('post failed');
      // reload spot
      const sres = await fetch(`/api/spots/${id}`);
      const data = await sres.json();
      setSpot(data);
      setName('');
      setAge('');
      setStars(5);
      setText('');
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="max-w-[980px] mx-auto p-4">
      <button
        className="bg-gray-900 text-white rounded-md px-4 py-3 min-h-[44px] min-w-[44px]"
        onClick={() => router.back()}
      >
        &larr; 戻る
      </button>
      {loading && <p className="mt-3">読み込み中…</p>}
      {spot && (
        <div className="mt-4">
          <h1 className="text-2xl font-bold">{spot.name}</h1>
          <p className="text-gray-500">{spot.city} ・ ⭐ {spot.rating?.toFixed?.(1) ?? 0}</p>
          {spot.address && <p>{spot.address}</p>}
          {spot.tags?.length ? <p className="text-gray-500">{spot.tags.join(', ')}</p> : null}

          <h2 className="mt-6 font-semibold">レビュー</h2>
          {spot.reviews?.length ? (
            <div>
              {spot.reviews.map((r) => (
                <div className="border border-gray-200 rounded-lg p-3 my-2" key={r.id}>
                  <div className="font-semibold">⭐ {r.stars} / 子年齢: {r.childAge}</div>
                  <div className="whitespace-pre-wrap">{r.text}</div>
                  <div className="text-gray-500 text-xs">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">まだレビューはありません</p>
          )}

          <h3 className="mt-6 font-semibold">レビューを投稿</h3>
          <div className="border border-gray-200 rounded-lg p-3 mt-2">
            <div className="grid gap-2">
              <input
                className="border border-gray-300 rounded-md px-3 py-3 text-base"
                placeholder="お名前"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="border border-gray-300 rounded-md px-3 py-3 text-base"
                placeholder="お子様の年齢例: 3歳"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
              <label className="text-sm text-gray-700">
                星: {stars}
                <input
                  className="w-full"
                  type="range"
                  min={1}
                  max={5}
                  value={stars}
                  onChange={(e) => setStars(Number(e.target.value))}
                />
              </label>
              <textarea
                className="border border-gray-300 rounded-md px-3 py-3 text-base resize-y"
                placeholder="感想を入力"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button
                className="bg-gray-900 text-white rounded-md px-4 py-3 min-h-[44px] min-w-[44px]"
                disabled={posting}
                onClick={submitReview}
              >
                送信
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
