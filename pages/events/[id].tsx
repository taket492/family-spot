import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

type EventItem = {
  id: string;
  title: string;
  description?: string | null;
  city: string;
  venue?: string | null;
  address?: string | null;
  lat: number;
  lng: number;
  startAt: string;
  endAt?: string | null;
  url?: string | null;
  tags: string[];
  images: string[];
};

export default function EventDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [ev, setEv] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!id) return;
    const ctl = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${id}`, { signal: ctl.signal });
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        setEv(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    return () => ctl.abort();
  }, [id]);

  const gmapsUrl = useMemo(() => {
    if (!ev) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${ev.lat},${ev.lng}`;
  }, [ev]);

  const dateStr = useMemo(() => {
    if (!ev) return '';
    const start = new Date(ev.startAt);
    const end = ev.endAt ? new Date(ev.endAt) : null;
    return end ? `${start.toLocaleString()} - ${end.toLocaleString()}` : start.toLocaleString();
  }, [ev]);

  async function handleDelete() {
    if (!id || !isAdmin) return;

    const confirmed = confirm('このイベントを削除しますか？この操作は取り消せません。');
    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      alert('イベントを削除しました');
      router.push('/');
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : '削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-container py-4">
      <Button variant="secondary" onClick={() => router.back()}>&larr; 戻る</Button>
      {loading && <p className="mt-3">読み込み中…</p>}
      {ev && (
        <div className="mt-4">
          {ev.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ev.images[0]}
              alt={ev.title}
              className="rounded-2xl w-full h-auto object-cover aspect-[4/3] bg-neutralLight"
            />
          ) : (
            <div className="rounded-2xl overflow-hidden bg-neutralLight aspect-[4/3]"></div>
          )}

          <div className="mt-4">
            <h1 className="text-2xl font-bold">{ev.title}</h1>
            <div className="text-gray-600 mt-1">
              {ev.city} {ev.venue ? `・ ${ev.venue}` : ''}
            </div>
            <div className="text-gray-700 mt-1">{dateStr}</div>
            {ev.address && <p className="text-gray-700 mt-1">{ev.address}</p>}
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {ev.tags?.map((t: string) => (
              <Badge key={t} label={t} />
            ))}
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            <a href={gmapsUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">地図を開く</Button>
            </a>
            {ev.url && (
              <a href={ev.url} target="_blank" rel="noopener noreferrer">
                <Button>公式ページ</Button>
              </a>
            )}
            {isAdmin && (
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400"
              >
                {deleting ? '削除中...' : 'イベントを削除'}
              </Button>
            )}
          </div>

          {ev.description && (
            <Card className="my-4">
              <CardContent>
                <div className="whitespace-pre-wrap">{ev.description}</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

