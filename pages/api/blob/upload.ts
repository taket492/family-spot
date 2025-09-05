import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    // Lazy import to avoid type issues if package versions differ
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { put } = require('@vercel/blob');
    const filename = (req.query.filename as string) || `upload-${Date.now()}`;
    const contentType = (req.query.contentType as string) || 'application/octet-stream';
    const key = `spots/${Date.now()}-${filename}`;
    const blob = await put(key, req, { access: 'public', contentType });
    return res.status(200).json({ url: blob.url, pathname: blob.pathname, contentType: blob.contentType });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'upload_failed', message: String(e?.message || e) });
  }
}

