/* eslint-disable no-console */
// Automatically fetch and add images for spots using Unsplash API
//
// Usage:
//   node scripts/auto-fetch-images.js [--spot-id <id>] [--batch-size <n>] [--dry-run]
//
// Environment:
//   UNSPLASH_ACCESS_KEY - Required Unsplash API access key
//
// Examples:
//   node scripts/auto-fetch-images.js --spot-id cmf6... 
//   node scripts/auto-fetch-images.js --batch-size 10
//   node scripts/auto-fetch-images.js --dry-run

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

// Unsplash API configuration
const UNSPLASH_API_URL = 'https://api.unsplash.com';
const DEFAULT_BATCH_SIZE = 5;
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

async function fetchFromUnsplash(query, accessKey) {
  const searchUrl = `${UNSPLASH_API_URL}/search/photos`;
  const params = new URLSearchParams({
    query: query,
    per_page: '3',
    orientation: 'landscape',
    order_by: 'relevant',
    client_id: accessKey
  });

  try {
    const response = await fetch(`${searchUrl}?${params}`, {
      headers: {
        'Accept-Version': 'v1',
        'User-Agent': 'family-weekend/1.0'
      }
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Unsplash API key invalid or rate limit exceeded');
      }
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Unsplash fetch error:', error.message);
    return [];
  }
}

async function downloadAndUploadImage(imageUrl, fileName, supabase) {
  try {
    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('images')
      .upload(`spots/${fileName}`, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('images')
      .getPublicUrl(`spots/${fileName}`);

    return publicData.publicUrl;
  } catch (error) {
    console.error('Image upload error:', error.message);
    return null;
  }
}

function buildSearchQuery(spot) {
  const parts = [];
  
  if (spot.name) {
    parts.push(spot.name);
  }
  
  if (spot.city) {
    parts.push(spot.city);
  }
  
  // Add Japan context for better results
  parts.push('日本');
  
  return parts.join(' ');
}

function generateFileName(spot, index = 0) {
  const timestamp = Date.now();
  const suffix = index > 0 ? `-${index}` : '';
  return `${spot.id}-${timestamp}${suffix}.jpg`;
}

async function processSpot(spot, accessKey, supabase, dryRun = false) {
  console.log(`Processing: ${spot.name} (${spot.city})`);
  
  // Check if spot already has images
  let existingImages = [];
  try {
    if (spot.images) {
      const parsed = JSON.parse(spot.images);
      if (Array.isArray(parsed)) {
        existingImages = parsed.filter(img => typeof img === 'string');
      }
    }
  } catch (e) {
    existingImages = [];
  }

  if (existingImages.length > 0) {
    console.log(`  → Skipping: already has ${existingImages.length} image(s)`);
    return { success: false, reason: 'already_has_images' };
  }

  // Build search query
  const query = buildSearchQuery(spot);
  console.log(`  → Searching: "${query}"`);

  // Fetch images from Unsplash
  const photos = await fetchFromUnsplash(query, accessKey);
  
  if (photos.length === 0) {
    console.log('  → No images found');
    return { success: false, reason: 'no_images_found' };
  }

  console.log(`  → Found ${photos.length} images`);

  if (dryRun) {
    console.log('  → Dry run: would upload images:');
    photos.forEach((photo, i) => {
      console.log(`    ${i + 1}. ${photo.urls.regular} (by ${photo.user.name})`);
    });
    return { success: true, reason: 'dry_run' };
  }

  // Download and upload images
  const uploadedUrls = [];
  for (let i = 0; i < Math.min(photos.length, 2); i++) {
    const photo = photos[i];
    const fileName = generateFileName(spot, i);
    
    console.log(`  → Uploading image ${i + 1}/${photos.length}...`);
    const uploadedUrl = await downloadAndUploadImage(
      photo.urls.regular,
      fileName,
      supabase
    );
    
    if (uploadedUrl) {
      uploadedUrls.push(uploadedUrl);
      console.log(`    ✓ Uploaded: ${uploadedUrl}`);
    } else {
      console.log(`    ✗ Failed to upload image ${i + 1}`);
    }
  }

  if (uploadedUrls.length === 0) {
    return { success: false, reason: 'upload_failed' };
  }

  // Update spot with new images
  const prisma = new PrismaClient();
  try {
    await prisma.spot.update({
      where: { id: spot.id },
      data: {
        images: JSON.stringify(uploadedUrls)
      }
    });
    
    console.log(`  ✓ Updated spot with ${uploadedUrls.length} image(s)`);
    return { success: true, imagesAdded: uploadedUrls.length };
  } catch (error) {
    console.error('  ✗ Database update failed:', error.message);
    return { success: false, reason: 'database_error' };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const spotId = (args.find(a => a.startsWith('--spot-id=')) || '').split('=')[1];
  const batchSize = parseInt((args.find(a => a.startsWith('--batch-size=')) || '').split('=')[1]) || DEFAULT_BATCH_SIZE;
  const dryRun = args.includes('--dry-run');

  // Validate environment
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.error('Error: UNSPLASH_ACCESS_KEY environment variable is required');
    console.error('Get your free API key at: https://unsplash.com/developers');
    process.exit(1);
  }

  // Initialize Supabase (only if not dry run)
  let supabase = null;
  if (!dryRun) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Error: Supabase environment variables are required');
      console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
  }

  const prisma = new PrismaClient();
  
  try {
    // Get spots to process
    let spots;
    if (spotId) {
      const spot = await prisma.spot.findUnique({ where: { id: spotId } });
      if (!spot) {
        console.error('Spot not found:', spotId);
        process.exit(1);
      }
      spots = [spot];
    } else {
      // Get spots without images
      spots = await prisma.spot.findMany({
        where: {
          OR: [
            { images: null },
            { images: '[]' },
            { images: '' }
          ]
        },
        take: batchSize,
        orderBy: { createdAt: 'desc' }
      });
    }

    console.log(`Found ${spots.length} spot(s) to process`);
    if (dryRun) {
      console.log('DRY RUN MODE - No actual changes will be made\n');
    }

    // Process each spot
    let successCount = 0;
    let errorCount = 0;
    
    for (const spot of spots) {
      const result = await processSpot(spot, accessKey, supabase, dryRun);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
      
      // Rate limiting
      if (spots.length > 1) {
        console.log('  → Waiting to respect rate limits...\n');
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }

    console.log('\nSummary:');
    console.log(`  ✓ Success: ${successCount}`);
    console.log(`  ✗ Errors: ${errorCount}`);
    console.log(`  📁 Total processed: ${successCount + errorCount}`);

  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Script error:', error);
  process.exit(1);
});