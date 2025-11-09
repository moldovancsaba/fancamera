/**
 * Grant app-level permission in SSO database
 * Creates or updates appPermissions record for Camera app
 */

import { MongoClient } from 'mongodb';

const SSO_URI = 'mongodb+srv://thanperfect:CuW54NNNFKnGQtt6@doneisbetter.49s2z.mongodb.net';
const userId = process.argv[2] || '5143beb1-9bb6-47e7-a099-e9eeb2d89e93';
const clientId = '1e59b6a1-3c18-4141-9139-7a3dd0da62bf'; // Camera app client ID
const role = process.argv[3] || 'admin';

async function grantAppPermission() {
  const client = new MongoClient(SSO_URI);
  
  try {
    await client.connect();
    console.log('✓ Connected to SSO database');
    
    const db = client.db('sso');
    
    // Find user first
    const user = await db.collection('publicUsers').findOne({ id: userId });
    
    if (!user) {
      console.error(`✗ User not found: ${userId}`);
      process.exit(1);
    }
    
    console.log('\nUser found:', {
      id: user.id,
      email: user.email,
      name: user.name
    });
    
    // Check if appPermissions collection exists and has records
    const existingPermission = await db.collection('appPermissions').findOne({
      userId: userId,
      clientId: clientId
    });
    
    if (existingPermission) {
      console.log('\nExisting permission found:', existingPermission);
    }
    
    // Create or update permission
    const permission = {
      userId: userId,
      clientId: clientId,
      appName: 'camera',
      hasAccess: true,
      status: 'approved',
      role: role,
      grantedAt: new Date().toISOString(),
      grantedBy: 'system',
      lastAccessedAt: new Date().toISOString(),
      requestedAt: new Date().toISOString(),
    };
    
    const result = await db.collection('appPermissions').updateOne(
      { userId: userId, clientId: clientId },
      { $set: permission },
      { upsert: true }
    );
    
    if (result.upsertedCount > 0) {
      console.log('\n✓ App permission created');
    } else if (result.modifiedCount > 0) {
      console.log('\n✓ App permission updated');
    } else {
      console.log('\n⚠ No changes made');
    }
    
    console.log('\nPermission:', permission);
    console.log('\nPlease logout and login again for changes to take effect');
    
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

grantAppPermission();
