import { useRouter } from 'next/router';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

const categories = [
  { name: '公園', icon: '🌳', color: 'from-green-400 to-emerald-500' },
  { name: '遊園地', icon: '🎢', color: 'from-pink-400 to-red-500' },
  { name: '動物園', icon: '🦁', color: 'from-orange-400 to-amber-500' },
  { name: '水族館', icon: '🐠', color: 'from-blue-400 to-cyan-500' },
  { name: '博物館', icon: '🏛️', color: 'from-purple-400 to-violet-500' },
  { name: '科学館', icon: '🧪', color: 'from-indigo-400 to-blue-500' },
  { name: '屋内遊び場', icon: '🏠', color: 'from-rose-400 to-pink-500' },
  { name: 'その他', icon: '✨', color: 'from-gray-400 to-slate-500' },
];

export default function SearchTop() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function goSearch(v?: string) {
    const qq = (v ?? q).trim();
    router.push(qq ? `/search?q=${encodeURIComponent(qq)}` : '/search');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-neutral-50 to-accent-50">
      <div className="page-container py-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center size-20 rounded-3xl bg-gradient-primary shadow-lg mb-6 animate-bounce-soft">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-4">
            こどもとおでかけ
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            お子様と一緒に楽しめるスポットをカテゴリから探してみましょう
          </p>
        </div>

        {/* Location Info */}
        <Card className="mb-8 animate-slide-up">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <div className="flex items-center">
                <svg className="size-4 mr-2 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">静岡県</span>
              </div>
              <div className="flex items-center">
                <svg className="size-4 mr-2 text-accent-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>お近くのスポットを表示</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Box */}
        <Card className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-neutral-800 mb-4">キーワード検索</h2>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg className="size-5 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-xl text-base placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 transition-all"
                  placeholder="お探しのスポット名やキーワードを入力"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && goSearch()}
                />
              </div>
              <Button onClick={() => goSearch()} size="lg" className="px-8">
                検索
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-2xl font-bold text-neutral-800 text-center mb-6">
            カテゴリから探す
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category, index) => (
              <Card
                key={category.name}
                interactive
                className="group cursor-pointer animate-scale-in hover:scale-105 transition-all duration-200"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                onClick={() => goSearch(category.name)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br ${category.color} shadow-lg mb-4 text-3xl group-hover:scale-110 transition-transform duration-200`}>
                    {category.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800 group-hover:text-primary-600 transition-colors duration-200">
                    {category.name}
                  </h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <p className="text-neutral-600 mb-4">お気に入りのスポットが見つからない場合</p>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => router.push('/')}
            className="hover:scale-105 transition-transform duration-200"
          >
            トップページに戻る
          </Button>
        </div>
      </div>
    </div>
  );
}

