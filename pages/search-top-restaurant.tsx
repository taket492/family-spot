import { useRouter } from 'next/router';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

const featureTags = [
  { name: '座敷', icon: '🪑', description: 'お座敷でゆったり', color: 'from-amber-400 to-orange-500' },
  { name: '個室', icon: '🚪', description: 'プライベート空間', color: 'from-blue-400 to-cyan-500' },
  { name: 'ベビーカー可', icon: '🚼', description: 'ベビーカーOK', color: 'from-green-400 to-emerald-500' },
  { name: '授乳室', icon: '🤱', description: '授乳室完備', color: 'from-pink-400 to-rose-500' },
  { name: 'キッズメニュー', icon: '👶', description: 'お子様向け料理', color: 'from-purple-400 to-violet-500' },
  { name: '禁煙', icon: '🚭', description: '全席禁煙', color: 'from-teal-400 to-cyan-500' },
];

export default function SearchTopRestaurant() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function goSearch(v?: string) {
    const qq = (v ?? q).trim();
    router.push(qq ? `/search?q=${encodeURIComponent(qq)}` : '/search');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-neutral-50 to-primary-50">
      <div className="page-container py-8">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-secondary shadow-lg mb-6 animate-bounce-soft">
            <span className="text-3xl">🍽️</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-secondary-600 to-primary-600 bg-clip-text text-transparent mb-4">
            ファミリーレストラン
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            お子様連れでも安心して食事を楽しめるレストランを特徴から探しましょう
          </p>
        </div>

        {/* Location Info */}
        <Card className="mb-8 animate-slide-up">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-secondary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">静岡県</span>
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>ファミリー向けレストラン</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Box */}
        <Card className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-neutral-800 mb-4">レストラン名・キーワード検索</h2>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-xl text-base placeholder:text-neutral-400 focus:border-secondary-400 focus:ring-2 focus:ring-secondary-400 focus:ring-offset-2 transition-all"
                  placeholder="レストラン名や料理のジャンルを入力"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && goSearch()}
                />
              </div>
              <Button onClick={() => goSearch()} variant="secondary" size="lg" className="px-8">
                検索
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Categories */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-2xl font-bold text-neutral-800 text-center mb-6">
            特徴から探す
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featureTags.map((feature, index) => (
              <Card
                key={feature.name}
                interactive
                className="group cursor-pointer animate-scale-in hover:scale-105 transition-all duration-200"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                onClick={() => goSearch(feature.name)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg mb-4 text-3xl group-hover:scale-110 transition-transform duration-200`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800 group-hover:text-secondary-600 transition-colors duration-200 mb-1">
                    {feature.name}
                  </h3>
                  <p className="text-sm text-neutral-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Popular Search Terms */}
        <Card className="mt-8 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">人気の検索キーワード</h3>
            <div className="flex flex-wrap gap-2">
              {['ファミレス', '和食', 'イタリアン', '焼肉', '寿司', '中華', 'カフェ', 'ハンバーガー'].map((keyword) => (
                <Button
                  key={keyword}
                  variant="outline"
                  size="sm"
                  onClick={() => goSearch(keyword)}
                  className="hover:scale-105 transition-transform duration-200"
                >
                  {keyword}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA */}
        <div className="text-center mt-12 animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <p className="text-neutral-600 mb-4">お探しのレストランが見つからない場合</p>
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

