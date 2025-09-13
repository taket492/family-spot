import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

type VisitData = {
  spots: Array<{
    id: string;
    status: string;
    visitedAt: string | null;
    notes: string | null;
    createdAt: string;
    spot: {
      id: string;
      name: string;
      city: string;
      tags: string[];
      images: string[];
      rating: number;
    };
  }>;
  events: Array<{
    id: string;
    status: string;
    attendedAt: string | null;
    notes: string | null;
    createdAt: string;
    event: {
      id: string;
      title: string;
      city: string;
      startAt: string;
      tags: string[];
      images: string[];
    };
  }>;
  stats: {
    totalSpots: number;
    totalEvents: number;
    visitedSpots: number;
    attendedEvents: number;
    favoriteSpots: number;
    interestedEvents: number;
  };
};

const SPOT_STATUS_CONFIG = {
  visited: { icon: '✅', label: '行った', color: 'bg-green-100 text-green-800' },
  want_to_visit: { icon: '📍', label: '行きたい', color: 'bg-blue-100 text-blue-800' },
  favorite: { icon: '⭐', label: 'お気に入り', color: 'bg-yellow-100 text-yellow-800' },
};

const EVENT_STATUS_CONFIG = {
  attended: { icon: '✅', label: '参加した', color: 'bg-green-100 text-green-800' },
  want_to_attend: { icon: '📅', label: '参加したい', color: 'bg-blue-100 text-blue-800' },
  interested: { icon: '👀', label: '興味あり', color: 'bg-purple-100 text-purple-800' },
};

export default function MyVisits() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [visitData, setVisitData] = useState<VisitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'spots' | 'events'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    loadVisitData();
  }, [isAuthenticated, isLoading, router]);

  async function loadVisitData() {
    try {
      const response = await fetch('/api/visits');
      if (response.ok) {
        const data = await response.json();
        setVisitData(data);
      }
    } catch (error) {
      console.error('Failed to load visit data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (isLoading || loading) {
    return (
      <div className="page-container py-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!visitData) {
    return (
      <div className="page-container py-4">
        <p className="text-gray-600">訪問記録の読み込みに失敗しました。</p>
      </div>
    );
  }

  const filteredSpots = statusFilter
    ? visitData.spots.filter(v => v.status === statusFilter)
    : visitData.spots;

  const filteredEvents = statusFilter
    ? visitData.events.filter(v => v.status === statusFilter)
    : visitData.events;

  return (
    <div className="page-container py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">マイ記録</h1>
        <Button variant="secondary" onClick={() => router.back()}>
          戻る
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{visitData.stats.visitedSpots}</div>
            <div className="text-sm text-gray-600">行った場所</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{visitData.stats.attendedEvents}</div>
            <div className="text-sm text-gray-600">参加イベント</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{visitData.stats.favoriteSpots}</div>
            <div className="text-sm text-gray-600">お気に入り</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-600">{visitData.stats.totalSpots + visitData.stats.totalEvents}</div>
            <div className="text-sm text-gray-600">総記録数</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          すべて
        </button>
        <button
          onClick={() => setActiveTab('spots')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'spots' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          スポット ({visitData.spots.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'events' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          イベント ({visitData.events.length})
        </button>
      </div>

      {/* Status Filter */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg"
        >
          <option value="">すべてのステータス</option>
          <option value="visited">行った</option>
          <option value="want_to_visit">行きたい</option>
          <option value="favorite">お気に入り</option>
          <option value="attended">参加した</option>
          <option value="want_to_attend">参加したい</option>
          <option value="interested">興味あり</option>
        </select>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Spots */}
        {(activeTab === 'all' || activeTab === 'spots') && filteredSpots.map((visit) => (
          <Card key={visit.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-4">
                {visit.spot.images?.[0] && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <OptimizedImage
                      src={visit.spot.images[0]}
                      alt={visit.spot.name}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/spots/${visit.spot.id}`} className="font-semibold hover:text-blue-600">
                        {visit.spot.name}
                      </Link>
                      <div className="text-sm text-gray-600">{visit.spot.city}</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${SPOT_STATUS_CONFIG[visit.status as keyof typeof SPOT_STATUS_CONFIG]?.color}`}>
                      {SPOT_STATUS_CONFIG[visit.status as keyof typeof SPOT_STATUS_CONFIG]?.icon} {SPOT_STATUS_CONFIG[visit.status as keyof typeof SPOT_STATUS_CONFIG]?.label}
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {visit.spot.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} label={tag} />
                    ))}
                  </div>
                  {visit.visitedAt && (
                    <div className="text-xs text-gray-500 mt-1">
                      訪問日: {new Date(visit.visitedAt).toLocaleDateString()}
                    </div>
                  )}
                  {visit.notes && (
                    <div className="text-sm text-gray-700 mt-1">{visit.notes}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Events */}
        {(activeTab === 'all' || activeTab === 'events') && filteredEvents.map((visit) => (
          <Card key={visit.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex gap-4">
                {visit.event.images?.[0] && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <OptimizedImage
                      src={visit.event.images[0]}
                      alt={visit.event.title}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/events/${visit.event.id}`} className="font-semibold hover:text-blue-600">
                        {visit.event.title}
                      </Link>
                      <div className="text-sm text-gray-600">{visit.event.city}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(visit.event.startAt).toLocaleString()}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${EVENT_STATUS_CONFIG[visit.status as keyof typeof EVENT_STATUS_CONFIG]?.color}`}>
                      {EVENT_STATUS_CONFIG[visit.status as keyof typeof EVENT_STATUS_CONFIG]?.icon} {EVENT_STATUS_CONFIG[visit.status as keyof typeof EVENT_STATUS_CONFIG]?.label}
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {visit.event.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} label={tag} />
                    ))}
                  </div>
                  {visit.attendedAt && (
                    <div className="text-xs text-gray-500 mt-1">
                      参加日: {new Date(visit.attendedAt).toLocaleDateString()}
                    </div>
                  )}
                  {visit.notes && (
                    <div className="text-sm text-gray-700 mt-1">{visit.notes}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {((activeTab === 'spots' && filteredSpots.length === 0) ||
          (activeTab === 'events' && filteredEvents.length === 0) ||
          (activeTab === 'all' && filteredSpots.length === 0 && filteredEvents.length === 0)) && (
          <div className="text-center py-8">
            <p className="text-gray-600">記録がありません</p>
            <p className="text-sm text-gray-500 mt-1">
              スポットやイベントページで「+ 記録する」ボタンを押して記録を始めましょう！
            </p>
          </div>
        )}
      </div>
    </div>
  );
}