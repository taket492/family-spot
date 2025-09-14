import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { clientCache } from '@/lib/cache';

type Family = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  members: Array<{
    id: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  _count: {
    spotVisits: number;
    eventVisits: number;
  };
};

export default function FamilyDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated, isLoading } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showInviteCode, setShowInviteCode] = useState(false);

  const loadFamily = useCallback(async (forceRefresh = false) => {
    if (!id || typeof id !== 'string') return;

    const cacheKey = `family-${id}`;

    if (!forceRefresh) {
      const cached = clientCache.get<Family>(cacheKey);
      if (cached) {
        setFamily(cached);
        setEditForm({ name: cached.name, description: cached.description || '' });
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/families/${id}?includeMembers=true`);
      if (response.ok) {
        const data = await response.json();
        console.log('Family loaded:', data);
        setFamily(data);
        setEditForm({ name: data.name, description: data.description || '' });
        clientCache.set(cacheKey, data, 30); // Cache for 30 seconds
      } else {
        console.error('Failed to load family');
        router.push('/families');
      }
    } catch (error) {
      console.error('Failed to load family:', error);
      router.push('/families');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (isLoading || !id) return;

    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    loadFamily();
  }, [isAuthenticated, isLoading, id, router, loadFamily]);

  const updateFamily = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim() || submitting || !id) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/families/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const updatedFamily = await response.json();
        setFamily(updatedFamily);
        setEditing(false);
        clientCache.set(`family-${id}`, updatedFamily, 30); // Update cache
        clientCache.delete('families-list'); // Invalidate families list cache
      } else {
        const error = await response.json();
        alert(error.error || '家族情報の更新に失敗しました');
      }
    } catch (error) {
      console.error('Failed to update family:', error);
      alert('家族情報の更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }, [editForm, submitting, id]);

  async function leaveFamily() {
    if (!user?.id || !id || !family) return;

    if (!confirm('この家族グループから退会しますか？')) return;

    try {
      const response = await fetch(`/api/families/${id}/members/${user.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        router.push('/families');
      } else {
        const error = await response.json();
        alert(error.error || '家族グループからの退会に失敗しました');
      }
    } catch (error) {
      console.error('Failed to leave family:', error);
      alert('家族グループからの退会に失敗しました');
    }
  }

  async function removeMember(memberId: string) {
    if (!id || !confirm('このメンバーを家族グループから削除しますか？')) return;

    try {
      const response = await fetch(`/api/families/${id}/members/${memberId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        clientCache.delete(`family-${id}`); // Invalidate family cache
        clientCache.delete('families-list'); // Invalidate families list cache
        loadFamily(true); // Force reload family data
      } else {
        const error = await response.json();
        alert(error.error || 'メンバーの削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('メンバーの削除に失敗しました');
    }
  }

  async function updateMemberRole(memberId: string, role: string) {
    if (!id) return;

    try {
      const response = await fetch(`/api/families/${id}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });

      if (response.ok) {
        clientCache.delete(`family-${id}`); // Invalidate family cache
        clientCache.delete('families-list'); // Invalidate families list cache
        loadFamily(true); // Force reload family data
      } else {
        const error = await response.json();
        alert(error.error || 'メンバー権限の変更に失敗しました');
      }
    } catch (error) {
      console.error('Failed to update member role:', error);
      alert('メンバー権限の変更に失敗しました');
    }
  }

  const copyInviteCode = useCallback(() => {
    if (family?.inviteCode) {
      navigator.clipboard.writeText(family.inviteCode);
      alert('招待コードをコピーしました！');
    }
  }, [family?.inviteCode]);

  const { currentUserMember, isCreator, isAdmin } = useMemo(() => {
    if (!family) return { currentUserMember: null, isCreator: false, isAdmin: false };
    const member = family.members.find(m => m.user.id === user?.id);
    const creator = family.createdBy === user?.id;
    const admin = member?.role === 'admin' || creator;
    return { currentUserMember: member, isCreator: creator, isAdmin: admin };
  }, [family, user?.id]);

  if (isLoading || loading) {
    return (
      <div className="page-container py-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="page-container py-4">
        <p className="text-gray-600">家族グループが見つかりません。</p>
      </div>
    );
  }

  return (
    <div className="page-container py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{family.name}</h1>
          {family.description && (
            <p className="text-gray-600 mt-1">{family.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/families/${family.id}/visits`}>
            <Button variant="primary">記録を見る</Button>
          </Link>
          <Link href="/families">
            <Button variant="secondary">戻る</Button>
          </Link>
        </div>
      </div>

      {/* Family Info */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">家族情報</h2>
            {editing ? (
              <form onSubmit={updateFamily} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    家族名
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? '保存中...' : '保存'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditing(false)}
                  >
                    キャンセル
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">作成者</span>
                  <p>{family.creator.name || family.creator.email}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">作成日</span>
                  <p>{new Date(family.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">メンバー数</span>
                  <p>{family.members.length} 人</p>
                </div>
                {isAdmin && (
                  <div className="pt-2">
                    <Button size="sm" onClick={() => setEditing(true)}>
                      編集
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">統計</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">スポット記録</span>
                <span className="font-semibold">{family._count.spotVisits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">イベント記録</span>
                <span className="font-semibold">{family._count.eventVisits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">総記録数</span>
                <span className="font-semibold text-blue-600">
                  {family._count.spotVisits + family._count.eventVisits}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Code */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">招待コード</h2>
              <p className="text-gray-600 text-sm">
                このコードを家族に共有して、グループに招待してください
              </p>
            </div>
            <div className="flex items-center gap-2">
              {showInviteCode ? (
                <span className="font-mono text-lg px-3 py-1 bg-gray-100 rounded">
                  {family.inviteCode}
                </span>
              ) : (
                <span className="text-gray-400">••••••••</span>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowInviteCode(!showInviteCode)}
              >
                {showInviteCode ? '隠す' : '表示'}
              </Button>
              {showInviteCode && (
                <Button size="sm" onClick={copyInviteCode}>
                  コピー
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">メンバー ({family.members.length})</h2>
          <div className="space-y-3">
            {family.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-10 bg-blue-100 rounded-full">
                    <span className="text-blue-600 font-semibold">
                      {(member.user.name || member.user.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {member.user.name || member.user.email}
                      {member.user.id === family.createdBy && (
                        <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                          作成者
                        </span>
                      )}
                      {member.role === 'admin' && member.user.id !== family.createdBy && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          管理者
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      参加日: {new Date(member.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCreator && member.user.id !== family.createdBy && (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.user.id, e.target.value)}
                        className="px-2 py-1 text-sm border rounded"
                      >
                        <option value="member">メンバー</option>
                        <option value="admin">管理者</option>
                      </select>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => removeMember(member.user.id)}
                      >
                        削除
                      </Button>
                    </>
                  )}
                  {member.user.id === user?.id && member.user.id !== family.createdBy && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={leaveFamily}
                    >
                      退会
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}