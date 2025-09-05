import { useRouter } from 'next/router';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function NewSpot() {
  const router = useRouter();
  const [type, setType] = useState<'spot' | 'restaurant'>('spot');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function uploadToBlobIfNeeded(): Promise<string[]> {
    if (!file) return [];
    const url = `/api/blob/upload?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'image/jpeg')}`;
    const resp = await fetch(url, { method: 'POST', body: file });
    if (!resp.ok) throw new Error('upload_failed');
    const data = await resp.json();
    return [data.url];
  }

  async function submit() {
    if (!name || !city || !lat || !lng) {
      alert('名称・市区・緯度・経度は必須です');
      return;
    }
    setSubmitting(true);
    try {
      const images = await uploadToBlobIfNeeded();
      const resp = await fetch('/api/spots/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, city, address, lat: Number(lat), lng: Number(lng), tags, images }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'create_failed');
      router.replace(`/spots/${data.id}`);
    } catch (e) {
      console.error(e);
      alert('登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container py-4">
      <Button variant="secondary" onClick={() => router.push('/')}>← トップへ</Button>
      <h1 className="text-xl font-bold mt-3">スポット登録</h1>
      <Card className="mt-3">
        <CardContent>
          <div className="grid gap-3">
            <div className="flex gap-2">
              <label className="text-sm text-gray-700 self-center">種類</label>
              <select className="border border-gray-300 rounded-xl px-3 py-2" value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="spot">スポット</option>
                <option value="restaurant">レストラン</option>
              </select>
            </div>
            <input className="border border-gray-300 rounded-xl px-3 py-3" placeholder="名称" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className="border border-gray-300 rounded-xl px-3 py-3" placeholder="市区" value={city} onChange={(e) => setCity(e.target.value)} />
              <input className="border border-gray-300 rounded-xl px-3 py-3" placeholder="住所（任意）" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="border border-gray-300 rounded-xl px-3 py-3" placeholder="緯度 (例 35.1)" value={lat} onChange={(e) => setLat(e.target.value)} />
              <input className="border border-gray-300 rounded-xl px-3 py-3" placeholder="経度 (例 138.9)" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
            <input className="border border-gray-300 rounded-xl px-3 py-3" placeholder="タグ（読点/カンマ区切り）" value={tags} onChange={(e) => setTags(e.target.value)} />
            <input className="border border-gray-300 rounded-xl px-3 py-3" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <div>
              <Button disabled={submitting} onClick={submit}>アップロードして登録</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

