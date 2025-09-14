import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

type VisitStatus = 'visited' | 'want_to_visit' | 'favorite' | null;
type EventVisitStatus = 'attended' | 'want_to_attend' | 'interested' | null;

interface VisitStatusButtonProps {
  type: 'spot' | 'event';
  itemId: string;
  itemName: string;
  className?: string;
}

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

export default function VisitStatusButton({ type, itemId, itemName, className = '' }: VisitStatusButtonProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<VisitStatus | EventVisitStatus>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSharingOptions, setShowSharingOptions] = useState(false);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [sharingLevel, setSharingLevel] = useState<'private' | 'family'>('private');

  const statusConfig = type === 'spot' ? SPOT_STATUS_CONFIG : EVENT_STATUS_CONFIG;
  const statusOptions = Object.keys(statusConfig) as (keyof typeof statusConfig)[];

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    loadCurrentStatus();
    loadFamilies();
  }, [isAuthenticated, isLoading, itemId]);

  async function loadFamilies() {
    try {
      const response = await fetch('/api/families');
      if (response.ok) {
        const data = await response.json();
        setFamilies(data);
        if (data.length > 0) {
          setSelectedFamily(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load families:', error);
    }
  }

  async function loadCurrentStatus() {
    try {
      const response = await fetch(`/api/visits/${type}s/${itemId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentStatus(data.visit?.status || null);
      }
    } catch (error) {
      console.error('Failed to load visit status:', error);
    }
  }

  function selectStatusForUpdate(status: string) {
    setCurrentStatus(status as VisitStatus | EventVisitStatus);
    setShowMenu(false);
    setShowSharingOptions(true);
  }

  async function updateStatus(status: string, sharing: 'private' | 'family' = 'private', familyId?: string) {
    setIsUpdating(true);
    console.log('Updating visit status:', { type, itemId, status, sharing, familyId });
    try {
      const response = await fetch(`/api/visits/${type}s/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          sharingLevel: sharing,
          familyId: sharing === 'family' ? familyId : null,
          ...(status === 'visited' && { visitedAt: new Date().toISOString() }),
          ...(status === 'attended' && { attendedAt: new Date().toISOString() }),
        }),
      });

      console.log('Update response:', response.status, response.ok);
      if (response.ok) {
        const data = await response.json();
        console.log('Update response data:', data);
        setCurrentStatus(status as VisitStatus | EventVisitStatus);
        setShowMenu(false);
        setShowSharingOptions(false);
        setSharingLevel('private');
      } else {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        alert('ステータスの更新に失敗しました: ' + (errorData.error || '不明なエラー'));
      }
    } catch (error) {
      console.error('Failed to update visit status:', error);
      alert('ステータスの更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  }

  function confirmStatusUpdate() {
    if (!currentStatus) return;

    const familyId = sharingLevel === 'family' ? selectedFamily : undefined;
    updateStatus(currentStatus as string, sharingLevel, familyId);
  }

  async function removeStatus() {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/visits/${type}s/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCurrentStatus(null);
        setShowMenu(false);
      } else {
        alert('ステータスの削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to remove visit status:', error);
      alert('ステータスの削除に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isUpdating}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          currentStatus
            ? (statusConfig as any)[currentStatus]?.color || 'bg-gray-100 text-gray-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
      >
        {isUpdating ? (
          '更新中...'
        ) : currentStatus ? (
          <>
            {(statusConfig as any)[currentStatus]?.icon}{' '}
            {(statusConfig as any)[currentStatus]?.label}
          </>
        ) : (
          '+ 記録する'
        )}
      </button>

      {showMenu && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px]">
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => selectStatusForUpdate(status)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg"
            >
              {(statusConfig as any)[status].icon} {(statusConfig as any)[status].label}
            </button>
          ))}
          {currentStatus && (
            <>
              <div className="border-t border-gray-200" />
              <button
                onClick={removeStatus}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                🗑️ 削除
              </button>
            </>
          )}
          <div className="border-t border-gray-200" />
          <button
            onClick={() => setShowMenu(false)}
            className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 rounded-b-lg"
          >
            キャンセル
          </button>
        </div>
      )}

      {showSharingOptions && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[280px]">
          <div className="p-4">
            <h3 className="font-medium text-sm mb-3">記録の共有設定</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="sharingLevel"
                  value="private"
                  checked={sharingLevel === 'private'}
                  onChange={(e) => setSharingLevel(e.target.value as 'private' | 'family')}
                  className="mr-2"
                />
                <span className="text-sm">🔒 個人のみ</span>
              </label>
              {families.length > 0 && (
                <div>
                  <label className="flex items-start">
                    <input
                      type="radio"
                      name="sharingLevel"
                      value="family"
                      checked={sharingLevel === 'family'}
                      onChange={(e) => setSharingLevel(e.target.value as 'private' | 'family')}
                      className="mr-2 mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-sm">👨‍👩‍👧‍👦 家族と共有</span>
                      {sharingLevel === 'family' && (
                        <select
                          value={selectedFamily}
                          onChange={(e) => setSelectedFamily(e.target.value)}
                          className="block w-full mt-1 text-xs border border-gray-300 rounded px-2 py-1"
                        >
                          {families.map((family) => (
                            <option key={family.id} value={family.id}>
                              {family.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={confirmStatusUpdate}
                disabled={isUpdating || (sharingLevel === 'family' && !selectedFamily)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isUpdating ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => {
                  setShowSharingOptions(false);
                  setSharingLevel('private');
                }}
                className="px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}