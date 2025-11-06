#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read .env.local
const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const mongoUri = envContent.match(/MONGODB_URI=(.+)/)?.[1];

if (!mongoUri) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

const MONGODB_URI = mongoUri.trim();
const EVENT_ID = '690a72d084eb48114aa84ef5';

async function auditPlayCounts() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('camera');
    const submissions = await db.collection('submissions')
      .find({ eventId: EVENT_ID })
      .sort({ playCount: 1, createdAt: 1 })
      .toArray();
    
    console.log(`\n📊 Total Images: ${submissions.length}\n`);
    
    // Group by play count ranges
    const ranges = {
      '0-9': [],
      '10-49': [],
      '50+': [],
      'undefined': []
    };
    
    const aspectRatios = {
      '16:9': 0,
      '1:1': 0,
      '9:16': 0,
      'unknown': 0,
      'undefined': 0
    };
    
    submissions.forEach(sub => {
      const count = sub.playCount || 0;
      const ar = sub.metadata?.aspectRatio || 'undefined';
      
      if (count === undefined || count === null) {
        ranges['undefined'].push(sub);
      } else if (count <= 9) {
        ranges['0-9'].push(sub);
      } else if (count <= 49) {
        ranges['10-49'].push(sub);
      } else {
        ranges['50+'].push(sub);
      }
      
      if (ar === '16:9') aspectRatios['16:9']++;
      else if (ar === '1:1') aspectRatios['1:1']++;
      else if (ar === '9:16') aspectRatios['9:16']++;
      else if (ar === 'unknown') aspectRatios['unknown']++;
      else aspectRatios['undefined']++;
    });
    
    console.log('🎯 PLAY COUNT DISTRIBUTION:');
    console.log(`  0-9 plays:     ${ranges['0-9'].length} images`);
    console.log(`  10-49 plays:   ${ranges['10-49'].length} images`);
    console.log(`  50+ plays:     ${ranges['50+'].length} images`);
    console.log(`  undefined:     ${ranges['undefined'].length} images`);
    
    console.log('\n📐 ASPECT RATIO DISTRIBUTION:');
    console.log(`  16:9 (landscape): ${aspectRatios['16:9']} images`);
    console.log(`  1:1 (square):     ${aspectRatios['1:1']} images`);
    console.log(`  9:16 (portrait):  ${aspectRatios['9:16']} images`);
    console.log(`  unknown:          ${aspectRatios['unknown']} images`);
    console.log(`  undefined:        ${aspectRatios['undefined']} images`);
    
    console.log('\n🔍 LEAST PLAYED IMAGES (should appear first in playlist):');
    ranges['0-9'].slice(0, 15).forEach((sub, i) => {
      const ar = sub.metadata?.aspectRatio || 'undefined';
      const width = sub.metadata?.finalWidth || sub.metadata?.originalWidth || '?';
      const height = sub.metadata?.finalHeight || sub.metadata?.originalHeight || '?';
      console.log(`  ${i+1}. ${sub._id} - playCount: ${sub.playCount || 0}, AR: ${ar}, ${width}x${height}`);
    });
    
    console.log('\n🔥 MOST PLAYED IMAGES (should NOT appear unless all others exhausted):');
    ranges['50+'].slice(0, 10).forEach((sub, i) => {
      const ar = sub.metadata?.aspectRatio || 'undefined';
      const width = sub.metadata?.finalWidth || sub.metadata?.originalWidth || '?';
      const height = sub.metadata?.finalHeight || sub.metadata?.originalHeight || '?';
      console.log(`  ${i+1}. ${sub._id} - playCount: ${sub.playCount}, AR: ${ar}, ${width}x${height}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

auditPlayCounts();
