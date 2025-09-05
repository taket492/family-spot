import { useRouter } from 'next/router';
import { useState } from 'react';

const featureTags = ['座敷', '個室', 'ベビーカー可', 'その他'];

export default function SearchTopRestaurant() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function goSearch(v?: string) {
    const qq = (v ?? q).trim();
    router.push(qq ? `/search?q=${encodeURIComponent(qq)}` : '/search');
  }

  return (
    <div className="min-h-screen bg-[#F8E1BE]">
      <div className="page-container py-6">
        {/* Header pill */}
        <div className="rounded-[28px] bg-gradient-to-b from-white/70 to-white/50 px-6 py-5 text-3xl font-extrabold text-[#d47b2a] shadow-card">
          こどもとおでかけ <span className="align-middle">🔍</span>
        </div>

        {/* Location and distance chips */}
        <div className="mt-4 flex gap-3">
          <div className="rounded-[28px] bg-white/80 px-6 py-3 text-xl font-bold text-[#9c6b2d] shadow-card">静岡県</div>
          <div className="ml-auto rounded-[28px] bg-white/80 px-6 py-3 text-xl font-bold text-[#9c6b2d] shadow-card">10km以内</div>
        </div>

        {/* Title */}
        <h1 className="mt-8 text-4xl font-extrabold text-[#8c5a1a]">レストランを探す</h1>

        {/* Search box */}
        <div className="mt-4 rounded-[28px] bg-white/85 p-2 shadow-card flex items-stretch gap-2">
          <input
            className="flex-1 rounded-[20px] bg-transparent px-4 py-3 text-lg outline-none placeholder:text-gray-400"
            placeholder="キーワードを入力"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && goSearch()}
          />
          <button
            className="rounded-[20px] bg-[#F39A3C] px-5 py-2.5 text-white text-lg font-bold hover:brightness-95"
            onClick={() => goSearch()}
          >
            検索
          </button>
        </div>

        {/* Feature tags */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {featureTags.map((c) => (
            <button
              key={c}
              className="rounded-[28px] bg-white/85 px-6 py-6 text-2xl font-extrabold text-[#8c5a1a] shadow-card hover:bg-white"
              onClick={() => goSearch(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

