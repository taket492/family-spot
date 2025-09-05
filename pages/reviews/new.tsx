import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function NewReview() {
  const router = useRouter();
  const { spotId } = router.query as { spotId?: string };
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [stars, setStars] = useState(5);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [spotName, setSpotName] = useState('');

  useEffect(() => {
    if (!spotId) return;
    // Fetch spot name for context (best-effort)
    (async () => {
      try {
        const res = await fetch(`/api/spots/${spotId}`);
        if (res.ok) {
          const data = await res.json();
          setSpotName(data?.name || '');
        }
      } catch (_) {}
    })();
  }, [spotId]);

  async function submitReview() {
    if (!spotId) return;
    setPosting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotId, name, stars, age, text }),
      });
      if (!res.ok) throw new Error('post failed');
      router.replace(`/spots/${spotId}`);
    } catch (e) {
      alert('送信に失敗しました');
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="page-container py-4">
      <Button variant="secondary" onClick={() => router.back()}>&larr; 戻る</Button>
      <h1 className="text-xl font-bold mt-4">レビュー投稿</h1>
      {spotName && <p className="text-gray-600">対象: {spotName}</p>}
      <Card className="mt-3">
        <CardContent>
          <div className="grid gap-3">
            <input
              className="border border-gray-300 rounded-xl px-3 py-3 text-base"
              placeholder="お名前"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className="border border-gray-300 rounded-xl px-3 py-3 text-base"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            >
              <option value="">お子様の年齢帯</option>
              <option value="0-2歳">0–2歳</option>
              <option value="3-5歳">3–5歳</option>
              <option value="6-12歳">6–12歳</option>
            </select>
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
              className="border border-gray-300 rounded-xl px-3 py-3 text-base resize-y"
              placeholder="感想を入力"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div>
              <Button disabled={posting} onClick={submitReview}>送信</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

