import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db('camera');
  
  const eventId = '690a72d084eb48114aa84ef5';
  
  // Check what's in the database
  const allSubmissions = await db.collection('submissions').find({}).limit(3).toArray();
  console.log('\n📊 Sample submission structure:');
  console.log(JSON.stringify(allSubmissions[0], null, 2));
  
  // Check submissions with old eventId field
  const oldFormat = await db.collection('submissions').countDocuments({ eventId: { $exists: true } });
  console.log(`\n❌ Old format (eventId): ${oldFormat}`);
  
  // Check submissions with new eventIds array
  const newFormat = await db.collection('submissions').countDocuments({ eventIds: { $exists: true } });
  console.log(`✓ New format (eventIds): ${newFormat}`);
  
  // Check for this specific event
  const forThisEvent = await db.collection('submissions').countDocuments({ eventIds: eventId });
  console.log(`\n✓ Submissions for event ${eventId}: ${forThisEvent}`);
  
  // Check with all filters (what the query actually uses)
  const withFilters = await db.collection('submissions').countDocuments({
    eventIds: eventId,
    isArchived: false,
    hiddenFromEvents: { $ne: eventId }
  });
  console.log(`✓ With filters (isArchived: false, not hidden): ${withFilters}`);
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
} finally {
  await client.close();
}
