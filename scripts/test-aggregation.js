import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf-8');
const MONGODB_URI = envFile.match(/MONGODB_URI=(.+)/)?.[1];

const client = new MongoClient(MONGODB_URI);

try {
  await client.connect();
  const db = client.db('camera');

  const matchStage = {
    'userInfo.email': { $exists: true, $ne: null },
  };

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$userInfo.email',
        name: { $first: '$userInfo.name' },
        email: { $first: '$userInfo.email' },
        submissionCount: { $sum: 1 },
        firstSeen: { $min: '$userInfo.collectedAt' },
        lastSeen: { $max: '$userInfo.collectedAt' },
        events: {
          $addToSet: {
            eventId: '$eventId',
            eventName: '$eventName',
          },
        },
        partners: {
          $addToSet: {
            partnerId: '$partnerId',
            partnerName: '$partnerName',
          },
        },
        allConsents: { $push: '$consents' },
      },
    },
    {
      $project: {
        _id: 0,
        email: '$_id',
        name: 1,
        submissionCount: 1,
        firstSeen: 1,
        lastSeen: 1,
        events: {
          $filter: {
            input: '$events',
            as: 'event',
            cond: { $ne: ['$$event.eventId', null] },
          },
        },
        partners: {
          $filter: {
            input: '$partners',
            as: 'partner',
            cond: { $ne: ['$$partner.partnerId', null] },
          },
        },
        consents: {
          $reduce: {
            input: '$allConsents',
            initialValue: [],
            in: { $concatArrays: ['$$value', '$$this'] },
          },
        },
      },
    },
    { $sort: { lastSeen: -1 } },
  ];

  const result = await db.collection('submissions').aggregate(pipeline).toArray();
  
  console.log(`Aggregation returned ${result.length} users`);
  console.log('\nFirst 3 users:');
  result.slice(0, 3).forEach((user, i) => {
    console.log(`${i + 1}. ${user.name} (${user.email}) - ${user.submissionCount} submissions`);
  });

} finally {
  await client.close();
}
