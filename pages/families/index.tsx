import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { clientCache } from '@/lib/cache';
import { useOptimisticList } from '@/hooks/useOptimisticUpdate';
import { OptimisticIndicator, CardSkeleton } from '@/components/ui/LoadingStates';
import { FamilyLink } from '@/components/ui/PrefetchLink';

type Family = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    members: number;
    spotVisits: number;
    eventVisits: number;
  };
};

export default function Families() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const optimisticFamilies = useOptimisticList<Family>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadFamilies = useCallback(async (forceRefresh = false) => {
    const cacheKey = 'families-list';

    if (!forceRefresh) {
      const cached = clientCache.get<Family[]>(cacheKey);
      if (cached) {
        optimisticFamilies.setData(cached);
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/families');
      if (response.ok) {
        const data = await response.json();
        console.log('Families loaded:', data);
        optimisticFamilies.setData(data);
        clientCache.set(cacheKey, data, 60); // Cache for 1 minute
      } else {
        console.error('Failed to load families');
      }
    } catch (error) {
      console.error('Failed to load families:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    loadFamilies();
  }, [isAuthenticated, isLoading, router, loadFamilies]);

  const createFamily = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || submitting) return;

    setSubmitting(true);

    // Create optimistic family data
    const optimisticFamily: Family = {
      id: `temp-${Date.now()}`,
      name: createForm.name,
      description: createForm.description || null,
      createdAt: new Date().toISOString(),
      creator: {
        id: 'current-user',
        name: 'あなた',
        email: 'current@user.email'
      },
      _count: {
        members: 1,
        spotVisits: 0,
        eventVisits: 0
      }
    };

    try {
      await optimisticFamilies.addItem(
        optimisticFamily,
        async () => {
          const response = await fetch('/api/families', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createForm)
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '家族の作成に失敗しました');
          }

          return await response.json();
        },
        {
          onSuccess: () => {
            setCreateForm({ name: '', description: '' });
            setShowCreateForm(false);
            clientCache.delete('families-list');
          },
          onError: (error) => {
            alert(error.message);
          },
          cacheKey: 'families-list'
        }
      );
    } catch (error) {
      console.error('Failed to create family:', error);
    } finally {
      setSubmitting(false);
    }
  }, [createForm, submitting, optimisticFamilies]);

  const joinFamily = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || submitting) return;

    setSubmitting(true);

    // Create optimistic family data for joining
    const optimisticFamily: Family = {
      id: `joining-${Date.now()}`,
      name: '参加中...',
      description: null,
      createdAt: new Date().toISOString(),
      creator: {
        id: 'unknown',
        name: '招待者',
        email: 'unknown@email.com'
      },
      _count: {
        members: 1,
        spotVisits: 0,
        eventVisits: 0
      }
    };

    try {
      await optimisticFamilies.addItem(
        optimisticFamily,
        async () => {
          const response = await fetch('/api/families/join-by-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteCode: inviteCode.trim() })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '家族への参加に失敗しました');
          }

          const result = await response.json();
          return result.member.family;
        },
        {
          onSuccess: (familyList) => {
            const joinedFamily = familyList[familyList.length - 1];
            setInviteCode('');
            setShowJoinForm(false);
            clientCache.delete('families-list');
            alert(`${joinedFamily.name} に参加しました！`);
          },
          onError: (error) => {
            alert(error.message);
          },
          cacheKey: 'families-list'
        }
      );
    } catch (error) {
      console.error('Failed to join family:', error);
    } finally {
      setSubmitting(false);
    }
  }, [inviteCode, submitting, optimisticFamilies]);

  const memoizedFamiliesList = useMemo(() => {
    const families = optimisticFamilies.data || [];
    if (families.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            家族グループがありません
          </h3>
          <p className="text-gray-600 mb-6">
            家族で訪問記録を共有するため、まずは家族グループを作成するか、既存のグループに参加してください。
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => setShowCreateForm(true)}>
              家族を作る
            </Button>
            <Button variant="secondary" onClick={() => setShowJoinForm(true)}>
              家族に参加
            </Button>
          </div>
        </div>
      );
    }

    return families.map((family) => (
      <Card key={family.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{family.name}</h3>
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  {family._count.members} メンバー
                </span>
              </div>

              {family.description && (
                <p className="text-gray-600 mb-3">{family.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                <span>作成者: {family.creator.name || family.creator.email}</span>
                <span>作成日: {new Date(family.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>スポット記録: {family._count.spotVisits}</span>
                <span>イベント記録: {family._count.eventVisits}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <FamilyLink familyId={family.id} page="/visits">
                <Button size="sm" variant="primary">
                  記録を見る
                </Button>
              </FamilyLink>
              <FamilyLink familyId={family.id}>
                <Button size="sm" variant="secondary">
                  管理
                </Button>
              </FamilyLink>
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  }, [optimisticFamilies.data]);

  if (isLoading || loading) {
    return (
      <div className="page-container py-4">
        <div className="flex items-center justify-between mb-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32"></div>
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded w-24"></div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div className="space-y-4">
          <CardSkeleton count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-4">
      <OptimisticIndicator isOptimistic={optimisticFamilies.isOptimistic} />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">家族グループ</h1>
          <Link href="/">
            <Button variant="outline" size="sm">← トップ</Button>
          </Link>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCreateForm(true)}
            variant="primary"
          >
            家族を作る
          </Button>
          <Button
            onClick={() => setShowJoinForm(true)}
            variant="secondary"
          >
            家族に参加
          </Button>
        </div>
      </div>

      {/* Create Family Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">新しい家族グループを作成</h2>
            <form onSubmit={createFamily} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  家族名 *
                </label>
                <input
                  type="text"
                  id="name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 田中家"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  説明（任意）
                </label>
                <textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="家族グループの説明"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || !createForm.name.trim()}>
                  {submitting ? '作成中...' : '作成'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateForm(false)}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Join Family Form */}
      {showJoinForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">家族グループに参加</h2>
            <form onSubmit={joinFamily} className="space-y-4">
              <div>
                <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
                  招待コード *
                </label>
                <input
                  type="text"
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="家族から共有された招待コードを入力"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  家族のメンバーから招待コードを教えてもらってください
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting || !inviteCode.trim()}>
                  {submitting ? '参加中...' : '参加'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowJoinForm(false)}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Families List */}
      <div className="space-y-4">
        {memoizedFamiliesList}
      </div>
    </div>
  );
}