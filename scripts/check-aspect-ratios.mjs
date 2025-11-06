import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const slideshowId = '56d44e0b-90fa-4a62-9aac-463a362ab6ba';

async function checkAspectRatios() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('camera');
    
    // Get the slideshow to find the eventId
    const slideshow = await db.collection('slideshows').findOne({ slideshowId });
    
    if (!slideshow) {
      console.log('Slideshow not found');
      return;
    }
    
    console.log('Event ID:', slideshow.eventId);
    console.log('Event Name:', slideshow.eventName);
    console.log('\n--- Analyzing Submissions ---\n');
    
    // Get all submissions for this event
    const submissions = await db.collection('submissions')
      .find({ eventId: slideshow.eventId })
      .toArray();
    
    console.log(`Total submissions: ${submissions.length}\n`);
    
    const aspectRatios = {
      '16:9': [],
      '9:16': [],
      '1:1': [],
      'unknown': []
    };
    
    submissions.forEach(sub => {
      const width = sub.metadata?.finalWidth || sub.metadata?.originalWidth || 1920;
      const height = sub.metadata?.finalHeight || sub.metadata?.originalHeight || 1080;
      const ratio = width / height;
      
      let category = 'unknown';
      if (Math.abs(ratio - 16/9) < 0.1) category = '16:9';
      else if (Math.abs(ratio - 9/16) < 0.1) category = '9:16';
      else if (Math.abs(ratio - 1.0) < 0.1) category = '1:1';
      
      aspectRatios[category].push({
        id: sub._id.toString().substring(0, 8),
        width,
        height,
        ratio: ratio.toFixed(3),
        playCount: sub.playCount || 0
      });
    });
    
    console.log(`16:9 (Landscape): ${aspectRatios['16:9'].length} images`);
    aspectRatios['16:9'].slice(0, 5).forEach(img => {
      console.log(`  ${img.id}: ${img.width}x${img.height} (ratio: ${img.ratio}, plays: ${img.playCount})`);
    });
    if (aspectRatios['16:9'].length > 5) console.log(`  ... and ${aspectRatios['16:9'].length - 5} more`);
    
    console.log(`\n9:16 (Portrait): ${aspectRatios['9:16'].length} images`);
    aspectRatios['9:16'].forEach(img => {
      console.log(`  ${img.id}: ${img.width}x${img.height} (ratio: ${img.ratio}, plays: ${img.playCount})`);
    });
    
    console.log(`\n1:1 (Square): ${aspectRatios['1:1'].length} images`);
    aspectRatios['1:1'].forEach(img => {
      console.log(`  ${img.id}: ${img.width}x${img.height} (ratio: ${img.ratio}, plays: ${img.playCount})`);
    });
    
    console.log(`\nUnknown: ${aspectRatios['unknown'].length} images`);
    aspectRatios['unknown'].forEach(img => {
      console.log(`  ${img.id}: ${img.width}x${img.height} (ratio: ${img.ratio}, plays: ${img.playCount})`);
    });
    
    console.log('\n--- Mosaic Availability ---');
    console.log(`Can create portrait mosaics (need 3): ${aspectRatios['9:16'].length >= 3 ? 'YES ✓' : 'NO ✗'} (have ${aspectRatios['9:16'].length})`);
    console.log(`Can create square mosaics (need 2): ${aspectRatios['1:1'].length >= 2 ? 'YES ✓' : 'NO ✗'} (have ${aspectRatios['1:1'].length})`);
    
    if (aspectRatios['9:16'].length > 0 && aspectRatios['9:16'].length < 3) {
      console.log('\n⚠️  WARNING: You have portrait images but not enough for a mosaic!');
      console.log('   Portrait images will appear individually as single slides.');
    }
    
  } finally {
    await client.close();
  }
}

checkAspectRatios().catch(console.error);
