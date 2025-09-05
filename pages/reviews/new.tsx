import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
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

  const canSubmit = useMemo(() => {
    return !!(spotId && name.trim() && age && stars >= 1 && text.trim());
  }, [spotId, name, age, stars, text]);

  return (
    <div className="page-container py-4">
      <Button variant="secondary" onClick={() => router.back()}>&larr; 戻る</Button>
      <h1 className="text-xl font-bold mt-4">レビュー投稿</h1>
      {spotName && <p className="text-gray-600">対象: {spotName}</p>}
      <Card className="mt-3">
        <CardContent>
          <div className="grid gap-4">
            {/* Name */}
            <input
              className="border border-gray-300 rounded-xl px-3 py-3 text-base"
              placeholder="お名前（公開されます）"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {/* Stars */}
            <div>
              <div className="text-sm text-gray-700 mb-1">評価</div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                  <span
                    key={n}
                    onClick={() => setStars(n)}
                    className={`cursor-pointer text-3xl select-none ${n <= stars ? 'text-brandYellow' : 'text-gray-300'}`}
                    aria-label={`${n}つ星を選択`}
                  >
                    ★
                  </span>
                ))}
                <span className="text-gray-600 text-sm">{stars} / 5</span>
              </div>
            </div>

            {/* Age chips */}
            <div>
              <div className="text-sm text-gray-700 mb-1">お子様の年齢帯</div>
              <div className="flex flex-wrap gap-2">
                {['0-2歳', '3-5歳', '6-12歳'].map((a) => (
                  <button
                    key={a}
                    className={`px-4 py-2 rounded-full border text-sm ${
                      age === a ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 text-gray-700'
                    }`}
                    onClick={() => setAge(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Text */}
            <textarea
              className="border border-gray-300 rounded-xl px-3 py-3 text-base resize-y"
              placeholder="感想を入力"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <div>
              <Button disabled={posting || !canSubmit} onClick={submitReview}>送信</Button>
              {!canSubmit && (
                <span className="ml-3 text-sm text-gray-500">お名前・年齢帯・評価・感想を入力してください</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
