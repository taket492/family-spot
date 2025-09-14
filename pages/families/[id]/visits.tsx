import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

type FamilyVisitData = {
  spots: Array<{
    id: string;
    status: string;
    visitedAt: string | null;
    notes: string | null;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
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
    user: {
      id: string;
      name: string;
      email: string;
    };
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
    wantToVisitSpots: number;
    favoriteSpots: number;
    attendedEvents: number;
    wantToAttendEvents: number;
    interestedEvents: number;
    uniqueMembers: number;
  };
  spotsByUser: Array<{
    user: { id: string; name: string; email: string };
    visits: any[];
  }>;
  eventsByUser: Array<{
    user: { id: string; name: string; email: string };
    visits: any[];
  }>;
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

export default function FamilyVisits() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, isLoading } = useAuth();
  const [visitData, setVisitData] = useState<FamilyVisitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'spots' | 'events' | 'members'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [family, setFamily] = useState<any>(null);

  useEffect(() => {
    if (isLoading || !id) return;

    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    loadFamilyAndVisits();
  }, [isAuthenticated, isLoading, id, router]);

  async function loadFamilyAndVisits() {
    if (!id || typeof id !== 'string') return;

    try {
      const [familyResponse, visitsResponse] = await Promise.all([
        fetch(`/api/families/${id}`),
        fetch(`/api/families/${id}/visits`)
      ]);

      if (familyResponse.ok && visitsResponse.ok) {
        const [familyData, visitsData] = await Promise.all([
          familyResponse.json(),
          visitsResponse.json()
        ]);

        console.log('Family visits data loaded:', visitsData);
        setFamily(familyData);
        setVisitData(visitsData);
      } else {
        console.error('Failed to load family data');
        router.push('/families');
      }
    } catch (error) {
      console.error('Failed to load family data:', error);
      router.push('/families');
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

  if (!visitData || !family) {
    return (
      <div className="page-container py-4">
        <p className="text-gray-600">家族記録の読み込みに失敗しました。</p>
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
        <div>
          <h1 className="text-2xl font-bold">{family.name} の記録</h1>
          <p className="text-gray-600 text-sm">{family.description}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/families/${id}`}>
            <Button variant="secondary">家族管理</Button>
          </Link>
          <Button variant="secondary" onClick={() => router.back()}>
            戻る
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {visitData.stats.visitedSpots + visitData.stats.attendedEvents}
            </div>
            <div className="text-sm text-gray-600">行った場所</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {visitData.stats.wantToVisitSpots + visitData.stats.wantToAttendEvents}
            </div>
            <div className="text-sm text-gray-600">行きたい場所</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {visitData.stats.favoriteSpots + visitData.stats.interestedEvents}
            </div>
            <div className="text-sm text-gray-600">お気に入り</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {visitData.stats.uniqueMembers}
            </div>
            <div className="text-sm text-gray-600">参加メンバー</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          すべて
        </button>
        <button
          onClick={() => setActiveTab('spots')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            activeTab === 'spots' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          スポット ({visitData.spots.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            activeTab === 'events' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          イベント ({visitData.events.length})
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            activeTab === 'members' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          メンバー別
        </button>
      </div>

      {/* Status Filter */}
      {activeTab !== 'members' && (
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
      )}

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'members' ? (
          <div className="space-y-6">
            {visitData.spotsByUser.map((userGroup) => (
              <div key={userGroup.user.id} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">
                  {userGroup.user.name || userGroup.user.email} のスポット記録
                </h3>
                <div className="space-y-2">
                  {userGroup.visits.map((visit) => (
                    <Card key={visit.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          {visit.spot.images?.[0] && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              <OptimizedImage
                                src={visit.spot.images[0]}
                                alt={visit.spot.name}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <Link href={`/spots/${visit.spot.id}`} className="font-semibold hover:text-blue-600 text-sm">
                                  {visit.spot.name}
                                </Link>
                                <div className="text-xs text-gray-600">{visit.spot.city}</div>
                              </div>
                              <div className={`px-2 py-1 rounded text-xs ${SPOT_STATUS_CONFIG[visit.status as keyof typeof SPOT_STATUS_CONFIG]?.color}`}>
                                {SPOT_STATUS_CONFIG[visit.status as keyof typeof SPOT_STATUS_CONFIG]?.icon} {SPOT_STATUS_CONFIG[visit.status as keyof typeof SPOT_STATUS_CONFIG]?.label}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            {visitData.eventsByUser.map((userGroup) => (
              <div key={userGroup.user.id} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">
                  {userGroup.user.name || userGroup.user.email} のイベント記録
                </h3>
                <div className="space-y-2">
                  {userGroup.visits.map((visit) => (
                    <Card key={visit.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          {visit.event.images?.[0] && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              <OptimizedImage
                                src={visit.event.images[0]}
                                alt={visit.event.title}
                                width={48}
                                height={48}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <Link href={`/events/${visit.event.id}`} className="font-semibold hover:text-blue-600 text-sm">
                                  {visit.event.title}
                                </Link>
                                <div className="text-xs text-gray-600">{visit.event.city}</div>
                              </div>
                              <div className={`px-2 py-1 rounded text-xs ${EVENT_STATUS_CONFIG[visit.status as keyof typeof EVENT_STATUS_CONFIG]?.color}`}>
                                {EVENT_STATUS_CONFIG[visit.status as keyof typeof EVENT_STATUS_CONFIG]?.icon} {EVENT_STATUS_CONFIG[visit.status as keyof typeof EVENT_STATUS_CONFIG]?.label}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
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
                          <div className="text-xs text-gray-500 mt-1">
                            記録者: {visit.user.name || visit.user.email}
                          </div>
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
                          <div className="text-xs text-gray-500 mt-1">
                            記録者: {visit.user.name || visit.user.email}
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
          </>
        )}

        {((activeTab === 'spots' && filteredSpots.length === 0) ||
          (activeTab === 'events' && filteredEvents.length === 0) ||
          (activeTab === 'all' && filteredSpots.length === 0 && filteredEvents.length === 0) ||
          (activeTab === 'members' && visitData.spotsByUser.length === 0 && visitData.eventsByUser.length === 0)) && (
          <div className="text-center py-8">
            <p className="text-gray-600">家族の記録がありません</p>
            <p className="text-sm text-gray-500 mt-1">
              家族で記録を共有するには、スポットやイベントページで「家族と共有」を選択してください！
            </p>
          </div>
        )}
      </div>
    </div>
  );
}