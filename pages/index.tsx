import { useRouter } from 'next/router';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

const quickTags = ['授乳室', 'オムツ替え', 'ベビーカーOK', '駐車場', 'キッズメニュー'];

const categories = [
  '公園',
  '遊園地',
  '動物園',
  '水族館',
  '博物館',
  '科学館',
  '屋内遊び場',
  'その他',
];

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [age, setAge] = useState('');

  function runSearch(query?: string) {
    const qq = query ?? q;
    const params = new URLSearchParams();
    if (qq) params.set('q', qq);
    if (age) params.set('age', age);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="page-container py-6">
      <h1 className="text-2xl font-bold">静岡 子連れスポット検索</h1>
      <p className="text-gray-600 mt-1">子連れにやさしい場所を、さっと見つけよう。</p>

      <Card className="mt-4">
        <CardContent>
          <div className="grid gap-3">
            <div className="flex gap-2 items-center">
              <input
                className="min-w-[240px] flex-1 border border-gray-300 rounded-xl px-3 py-3 text-base"
                placeholder="市区名/名称/タグ 例: 沼津 公園"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runSearch();
                }}
              />
              <Button onClick={() => runSearch()}>検索</Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickTags.map((t) => (
                <Badge
                  key={t}
                  label={t}
                  className="cursor-pointer"
                  onClick={() => runSearch(t)}
                />
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <label className="text-sm text-gray-700">お子さまの年齢</label>
              <select
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">指定なし</option>
                <option value="0-2">0–2歳</option>
                <option value="3-5">3–5歳</option>
                <option value="6-12">6–12歳</option>
              </select>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              {categories.map((c) => (
                <Button
                  key={c}
                  variant="secondary"
                  size="lg"
                  className="rounded-full justify-start h-14 text-base"
                  onClick={() => runSearch(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-sm text-gray-600">
        <p>検索後は「リスト/地図」を切り替えて探せます。詳細ページからレビュー投稿も可能です。</p>
      </div>
    </div>
  );
}
