import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

type Review = { id: string; stars: number; childAge: string; text: string; createdAt: string };
type Spot = {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  lat: number;
  lng: number;
  rating: number;
  tags: string[];
  images: string[];
  reviews: Review[];
};

export default function SpotDetail() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [spot, setSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // review is posted in /reviews/new

  useEffect(() => {
    if (!id) return;
    const ctl = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/spots/${id}`, { signal: ctl.signal });
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        setSpot(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    return () => ctl.abort();
  }, [id]);

  function goReview() {
    if (!id) return;
    router.push(`/reviews/new?spotId=${id}`);
  }

  async function handleImageUpload(file: File) {
    if (!id || !file) return;
    
    setUploading(true);
    try {
      // First upload to blob storage
      const uploadUrl = `/api/blob/upload?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'image/jpeg')}`;
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('画像のアップロードに失敗しました');
      }

      const uploadData = await uploadResponse.json();

      // Then update spot with new image URL
      const updateResponse = await fetch(`/api/spots/${id}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.url }),
      });

      if (!updateResponse.ok) {
        throw new Error('スポット情報の更新に失敗しました');
      }

      // Refresh spot data
      const refreshResponse = await fetch(`/api/spots/${id}`);
      if (refreshResponse.ok) {
        const refreshedSpot = await refreshResponse.json();
        setSpot(refreshedSpot);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert(error instanceof Error ? error.message : '画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }

  function handleImageClick() {
    if (uploading) return;
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Reset the input so the same file can be selected again
    event.target.value = '';
  }

  const gmapsUrl = useMemo(() => {
    if (!spot) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
  }, [spot]);

  return (
    <div className="page-container py-4">
      <Button variant="secondary" onClick={() => router.back()}>&larr; 戻る</Button>
      {loading && !spot && (
        <div className="mt-4">
          <Skeleton className="aspect-[4/3] w-full" />
          <Skeleton className="h-7 w-3/4 mt-4" />
          <Skeleton className="h-4 w-40 mt-2" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      )}
      {spot && (
        <div className="mt-4">
          {/* Image or placeholder */}
          <div className="relative rounded-2xl overflow-hidden bg-neutralLight aspect-[4/3]">
            {spot.images?.[0] ? (
              <OptimizedImage
                src={spot.images[0]}
                alt={spot.name}
                fill
                sizes="100vw"
                className="object-cover rounded-2xl"
                priority={true}
              />
            ) : (
              <div 
                className="aspect-[4/3] w-full bg-gray-200 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors"
                onClick={handleImageClick}
              >
                <div className="text-center text-gray-500">
                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <svg className="animate-spin h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm">アップロード中...</span>
                    </div>
                  ) : (
                    <div>
                      <svg className="mx-auto h-12 w-12 mb-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                      <span className="text-sm">画像をアップロード</span>
                      <div className="text-xs text-gray-400 mt-1">クリックしてファイルを選択</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Title + rating */}
          <div className="mt-4">
            <h1 className="text-2xl font-bold">{spot.name}</h1>
            <div className="text-gray-600 mt-1 flex items-center gap-2">
              <span>{spot.city}</span>
              <span className="mx-1">・</span>
              <span className="flex items-center">
                <span className="text-yellow-500 mr-1">★</span>
                {(spot.rating?.toFixed?.(1) ?? 0).toString()}
              </span>
            </div>
            {spot.address && <p className="text-gray-700 mt-1">{spot.address}</p>}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {spot.tags?.map((t: string) => (
              <Badge key={t} label={t} />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <a href={gmapsUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">地図を開く</Button>
            </a>
            <Button onClick={goReview}>レビューを書く</Button>
          </div>

          {/* Reviews */}
          <h2 className="mt-6 font-semibold">みんなのレビュー</h2>
          {spot.reviews?.length ? (
            <div>
              {spot.reviews.map((r) => (
                <Card className="my-2" key={r.id}>
                  <CardContent>
                    <div className="font-semibold">⭐ {r.stars} / 子年齢: {r.childAge}</div>
                    <div className="whitespace-pre-wrap">{r.text}</div>
                    <div className="text-gray-500 text-xs">{new Date(r.createdAt).toLocaleString()}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">まだレビューはありません</p>
          )}
        </div>
      )}
    </div>
  );
}
