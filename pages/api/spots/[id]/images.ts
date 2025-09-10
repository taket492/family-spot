import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const { id } = req.query as { id: string };
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'invalid_image_url' });
    }

    // スポットが存在するかチェック
    const existingSpot = await prisma.spot.findUnique({
      where: { id },
      select: { id: true, images: true }
    });

    if (!existingSpot) {
      return res.status(404).json({ error: 'spot_not_found' });
    }

    // 既存の画像配列を取得
    let currentImages: string[] = [];
    try {
      if (existingSpot.images) {
        const parsed = JSON.parse(existingSpot.images as string);
        if (Array.isArray(parsed)) {
          currentImages = parsed.filter(img => typeof img === 'string');
        }
      }
    } catch (e) {
      // JSON parse error, start with empty array
      currentImages = [];
    }

    // 新しい画像を配列の先頭に追加（既存画像がある場合は置き換え、ない場合は追加）
    const updatedImages = [imageUrl, ...currentImages.filter(img => img !== imageUrl)];

    // データベースを更新
    await prisma.spot.update({
      where: { id },
      data: {
        images: JSON.stringify(updatedImages)
      }
    });

    res.status(200).json({ 
      success: true, 
      imageUrl,
      totalImages: updatedImages.length 
    });
  } catch (e) {
    console.error('Error updating spot image:', e);
    res.status(500).json({ error: 'internal_error' });
  }
}