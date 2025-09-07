/**
 * Image utility functions for handling various image sources and formats
 */

// Common image validation
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    const validProtocols = ['http:', 'https:'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    
    // Check protocol
    if (!validProtocols.includes(parsed.protocol)) return false;
    
    // Check if it looks like an image URL (either has image extension or is from known image services)
    const pathname = parsed.pathname.toLowerCase();
    const hasImageExtension = imageExtensions.some(ext => pathname.includes(ext));
    const isImageService = isKnownImageService(parsed.hostname);
    
    return hasImageExtension || isImageService;
  } catch {
    return false;
  }
}

// Check if hostname is from known image services
function isKnownImageService(hostname: string): boolean {
  const imageServices = [
    'public.blob.vercel-storage.com',
    'supabase.co',
    'amazonaws.com', // S3
    'cloudfront.net', // CloudFront
    'googleusercontent.com',
    'imgur.com',
    'unsplash.com',
    'pexels.com',
  ];
  
  return imageServices.some(service => 
    hostname === service || hostname.endsWith('.' + service)
  );
}

// Clean and validate image array from database JSON
export function cleanImageArray(jsonString: string | null | undefined): string[] {
  if (!jsonString) return [];
  
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];
    
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map(url => url.trim())
      .filter(url => url.length > 0 && isValidImageUrl(url));
  } catch {
    return [];
  }
}

// Get the first valid image from an array
export function getFirstValidImage(images: string[]): string | null {
  return images.find(img => isValidImageUrl(img)) || null;
}

// Generate placeholder image data URL
export function generatePlaceholderDataUrl(width: number = 400, height: number = 300): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <g transform="translate(${width/2}, ${height/2})">
        <g transform="translate(-24, -24)">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="#9ca3af"/>
        </g>
      </g>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Log image loading issues for debugging
export function logImageError(url: string, error: string | Error, context: string = '') {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Image Error${context ? ` - ${context}` : ''}]:`, {
      url,
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    });
  }
}

// Attempt to fix common image URL issues
export function fixImageUrl(url: string): string {
  if (!url) return url;
  
  let fixed = url.trim();
  
  // Fix double slashes (except after protocol)
  fixed = fixed.replace(/([^:]\/)\/+/g, '$1');
  
  // Ensure https for known secure services
  if (fixed.startsWith('http://') && isKnownImageService(new URL(fixed).hostname)) {
    fixed = fixed.replace('http://', 'https://');
  }
  
  return fixed;
}