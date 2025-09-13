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

  const statusConfig = type === 'spot' ? SPOT_STATUS_CONFIG : EVENT_STATUS_CONFIG;
  const statusOptions = Object.keys(statusConfig) as (keyof typeof statusConfig)[];

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    loadCurrentStatus();
  }, [isAuthenticated, isLoading, itemId]);

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

  async function updateStatus(status: string) {
    setIsUpdating(true);
    console.log('Updating visit status:', { type, itemId, status });
    try {
      const response = await fetch(`/api/visits/${type}s/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
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
      } else {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        alert('ステータスの更新に失敗しました');
      }
    } catch (error) {
      console.error('Failed to update visit status:', error);
      alert('ステータスの更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
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
              onClick={() => updateStatus(status)}
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
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
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
    </div>
  );
}