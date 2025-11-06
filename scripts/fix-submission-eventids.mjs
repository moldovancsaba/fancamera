/**
 * Fix Submission EventIds
 * Updates all submissions to use UUID eventId instead of MongoDB _id
 */

import { MongoClient, ObjectId } from 'mongodb';

const uri = 'mongodb+srv://moldovancsaba_db_user:wMP6z5B3ft5mmyI0@camaraclastar.koyedpi.mongodb.net/?appName=camaraclastar';
const dbName = 'camera';

const client = new MongoClient(uri);

try {
  console.log('🔌 Connecting to MongoDB...');
  await client.connect();
  const db = client.db(dbName);
  
  // Get all events to create a mapping
  console.log('\n📋 Building event mapping (MongoDB _id → UUID eventId)...');
  const events = await db.collection('events').find({}).toArray();
  const eventMapping = {};
  
  events.forEach(event => {
    const mongoId = event._id.toString();
    const uuid = event.eventId;
    eventMapping[mongoId] = uuid;
    console.log(`  ${mongoId} → ${uuid} (${event.name})`);
  });
  
  // Get all submissions
  console.log('\n📸 Processing submissions...');
  const submissions = await db.collection('submissions').find({}).toArray();
  console.log(`  Found ${submissions.length} submissions`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const submission of submissions) {
    const currentEventId = submission.eventId;
    
    // Check if it's a MongoDB _id format (24 char hex)
    if (currentEventId && currentEventId.length === 24 && /^[a-f0-9]+$/.test(currentEventId)) {
      const correctUuid = eventMapping[currentEventId];
      
      if (correctUuid) {
        console.log(`  ✅ Updating submission ${submission._id.toString()}`);
        console.log(`     Old eventId: ${currentEventId}`);
        console.log(`     New eventId: ${correctUuid}`);
        
        await db.collection('submissions').updateOne(
          { _id: submission._id },
          { 
            $set: { 
              eventId: correctUuid,
              updatedAt: new Date().toISOString()
            } 
          }
        );
        updated++;
      } else {
        console.log(`  ⚠️  No mapping found for eventId: ${currentEventId}`);
      }
    } else {
      console.log(`  ⏭️  Skipping ${submission._id.toString()} - already has UUID or no eventId`);
      skipped++;
    }
  }
  
  console.log(`\n✅ Migration complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await client.close();
  console.log('\n🔌 Database connection closed');
}
