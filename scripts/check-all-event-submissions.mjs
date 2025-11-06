import { MongoClient, ObjectId } from 'mongodb';

const uri = 'mongodb+srv://moldovancsaba_db_user:wMP6z5B3ft5mmyI0@camaraclastar.koyedpi.mongodb.net/?appName=camaraclastar';
const dbName = 'camera';
const eventMongoId = '690a72d084eb48114aa84ef5';

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);
  
  const event = await db.collection('events').findOne({ _id: new ObjectId(eventMongoId) });
  console.log('Event MongoDB _id:', eventMongoId);
  console.log('Event UUID:', event.eventId);
  console.log('Event Name:', event.name);
  
  // Find ALL submissions that have EITHER the MongoDB _id OR the UUID
  const withMongoId = await db.collection('submissions').find({ eventId: eventMongoId }).toArray();
  const withUuid = await db.collection('submissions').find({ eventId: event.eventId }).toArray();
  
  console.log('\nSubmissions with MongoDB _id as eventId:', withMongoId.length);
  console.log('Submissions with UUID as eventId:', withUuid.length);
  console.log('Total:', withMongoId.length + withUuid.length);
  
  console.log('\nSubmission IDs with MongoDB _id:');
  withMongoId.forEach(s => console.log('  -', s._id.toString(), 'created:', s.createdAt));
  
  console.log('\nSubmission IDs with UUID:');
  withUuid.forEach(s => console.log('  -', s._id.toString(), 'created:', s.createdAt));
  
} finally {
  await client.close();
}
