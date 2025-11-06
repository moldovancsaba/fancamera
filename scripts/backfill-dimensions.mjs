import { MongoClient } from 'mongodb';
import https from 'https';

const MONGODB_URI = process.env.MONGODB_URI;

async function getImageDimensions(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      let totalLength = 0;
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
        totalLength += chunk.length;
        
        // Only need first few KB to get dimensions
        if (totalLength > 50000) {
          response.destroy();
          const buffer = Buffer.concat(chunks);
          const dimensions = parseImageDimensions(buffer);
          resolve(dimensions);
        }
      });
      
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const dimensions = parseImageDimensions(buffer);
        resolve(dimensions);
      });
      
      response.on('error', reject);
    }).on('error', reject);
  });
}

function parseImageDimensions(buffer) {
  // Check for JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return parseJPEGDimensions(buffer);
  }
  // Check for PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return parsePNGDimensions(buffer);
  }
  return null;
}

function parseJPEGDimensions(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xFF) break;
    const marker = buffer[offset + 1];
    
    if (marker === 0xC0 || marker === 0xC2) {
      const height = (buffer[offset + 5] << 8) | buffer[offset + 6];
      const width = (buffer[offset + 7] << 8) | buffer[offset + 8];
      return { width, height };
    }
    
    const length = (buffer[offset + 2] << 8) | buffer[offset + 3];
    offset += length + 2;
  }
  return null;
}

function parsePNGDimensions(buffer) {
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

async function backfillDimensions() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('camera');
    
    // Find all submissions without finalWidth
    const submissions = await db.collection('submissions')
      .find({
        $or: [
          { 'metadata.finalWidth': { $exists: false } },
          { 'metadata.finalWidth': null }
        ]
      })
      .toArray();
    
    console.log(`Found ${submissions.length} submissions needing dimension backfill\n`);
    
    let updated = 0;
    let failed = 0;
    
    for (const sub of submissions) {
      try {
        console.log(`Processing ${sub._id.toString().substring(0, 8)}...`);
        
        const dimensions = await getImageDimensions(sub.imageUrl);
        
        if (dimensions) {
          await db.collection('submissions').updateOne(
            { _id: sub._id },
            {
              $set: {
                'metadata.finalWidth': dimensions.width,
                'metadata.finalHeight': dimensions.height,
              }
            }
          );
          console.log(`  ✓ Updated: ${dimensions.width}x${dimensions.height}`);
          updated++;
        } else {
          console.log(`  ✗ Could not determine dimensions`);
          failed++;
        }
      } catch (error) {
        console.log(`  ✗ Error: ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${submissions.length}`);
    
  } finally {
    await client.close();
  }
}

backfillDimensions().catch(console.error);
