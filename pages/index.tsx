import { useRouter } from 'next/router';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [q, setQ] = useState('');

  return (
    <div className="max-w-[980px] mx-auto p-4">
      <h1 className="text-2xl font-bold">静岡 子連れスポット検索</h1>
      <p className="text-gray-500">MapLibre + OSM / Next.js + Prisma MVP</p>
      <div className="flex gap-2 items-center mt-4">
        <input
          className="min-w-[240px] flex-1 border border-gray-300 rounded-md px-3 py-3 text-base"
          placeholder="市区名/名称/タグ 例: 沼津 公園"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') router.push(`/search?q=${encodeURIComponent(q)}`);
          }}
        />
        <button
          className="bg-gray-900 text-white rounded-md px-4 py-3 min-h-[44px] min-w-[44px]"
          onClick={() => router.push(`/search?q=${encodeURIComponent(q)}`)}
        >
          検索
        </button>
      </div>
      <div className="mt-6">
        <h2 className="font-semibold">使い方</h2>
        <ul className="list-disc ml-5 text-gray-600">
          <li>キーワードで検索し、リスト/地図から選択</li>
          <li>詳細ページでレビューを投稿</li>
        </ul>
      </div>
    </div>
  );
}
