/**
 * Check Pseudo Users in MongoDB
 * Run with: node scripts/check-pseudo-users.js
 */

import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';

// Read .env.local
const envFile = readFileSync('.env.local', 'utf-8');
const MONGODB_URI = envFile.match(/MONGODB_URI=(.+)/)?.[1];
process.env.MONGODB_URI = MONGODB_URI;

async function checkPseudoUsers() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('camera'); // Use the camera database

    // Count total submissions
    const totalSubmissions = await db.collection('submissions').countDocuments();
    console.log(`Total submissions: ${totalSubmissions}`);

    // Count submissions with userInfo.email
    const withEmail = await db.collection('submissions').countDocuments({
      'userInfo.email': { $exists: true, $ne: null }
    });
    console.log(`Submissions with userInfo.email: ${withEmail}`);

    // Get a few samples
    const samples = await db.collection('submissions')
      .find({ 'userInfo.email': { $exists: true } })
      .limit(5)
      .toArray();

    console.log(`\nSample submissions with userInfo:`);
    samples.forEach((s, i) => {
      console.log(`${i + 1}. Name: ${s.userInfo?.name}, Email: ${s.userInfo?.email}, Event: ${s.eventName}`);
    });
    
    // Show full structure of first submission
    if (samples.length > 0) {
      console.log('\nFull structure of first submission with userInfo:');
      console.log(JSON.stringify(samples[0], null, 2));
    }

    // Check for "Happy Logan"
    const happyLogans = await db.collection('submissions').find({
      'userInfo.email': 'happy@log.an'
    }).toArray();
    console.log(`\nSubmissions for happy@log.an: ${happyLogans.length}`);

    // Check all submissions for AS ROMA event
    const asRomaEvent = await db.collection('events').findOne({
      name: { $regex: /roma|lupetto/i }
    });
    
    if (asRomaEvent) {
      console.log(`\nAS ROMA Event found: ${asRomaEvent.name} (${asRomaEvent._id})`);
      console.log(`Event ID (UUID): ${asRomaEvent.eventId}`);
      
      const asRomaSubmissions = await db.collection('submissions').countDocuments({
        eventId: asRomaEvent.eventId
      });
      console.log(`Total submissions for this event: ${asRomaSubmissions}`);
      
      const asRomaWithUserInfo = await db.collection('submissions').countDocuments({
        eventId: asRomaEvent.eventId,
        'userInfo.email': { $exists: true }
      });
      console.log(`Submissions with userInfo: ${asRomaWithUserInfo}`);
    } else {
      console.log('\nAS ROMA event not found');
    }

  } finally {
    await client.close();
  }
}

checkPseudoUsers().catch(console.error);
