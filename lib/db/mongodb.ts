/**
 * MongoDB Connection Manager
 * Version: 1.0.0
 * 
 * Handles MongoDB Atlas connection with connection pooling for optimal performance.
 * Implements singleton pattern to reuse connections across serverless function invocations.
 * 
 * Why this approach:
 * - Next.js API routes are serverless functions that may be invoked frequently
 * - Creating a new connection for each request is expensive and slow
 * - Connection pooling reuses existing connections
 * - Singleton pattern ensures one connection pool per Node.js process
 */

import { MongoClient, Db } from 'mongodb';

// Environment variables validation
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

if (!process.env.MONGODB_DB) {
  throw new Error('MONGODB_DB environment variable is not defined');
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

// Connection options for optimal performance and reliability
// Increased timeouts for Vercel serverless cold starts
const options = {
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2, // Minimum number of connections to maintain
  maxIdleTimeMS: 60000, // Close idle connections after 60 seconds
  serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds (increased for cold starts)
  socketTimeoutMS: 45000, // Close socket after 45 seconds of inactivity
  connectTimeoutMS: 10000, // Initial connection timeout (increased for cold starts)
};

// Global variable to cache the connection (persists across serverless invocations)
interface CachedConnection {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<{ client: MongoClient; db: Db }> | null;
}

declare global {
  // This prevents TypeScript errors for the global variable
  var mongoConnection: CachedConnection | undefined;
}

const cached: CachedConnection = global.mongoConnection || {
  client: null,
  db: null,
  promise: null,
};

if (!global.mongoConnection) {
  global.mongoConnection = cached;
}

/**
 * Connect to MongoDB and return the database instance
 * 
 * This function implements a singleton pattern:
 * - First call: Creates new connection and caches it
 * - Subsequent calls: Returns cached connection
 * 
 * @returns Promise<Db> - MongoDB database instance
 */
export async function connectToDatabase(): Promise<Db> {
  // Return cached connection if available
  if (cached.client && cached.db) {
    return cached.db;
  }

  // If a connection is already being established, wait for it
  if (cached.promise) {
    const { db } = await cached.promise;
    return db;
  }

  // Create new connection
  cached.promise = MongoClient.connect(MONGODB_URI, options).then((client) => {
    const db = client.db(MONGODB_DB);
    return { client, db };
  });

  try {
    const { client, db } = await cached.promise;
    
    // Cache the connection for future use
    cached.client = client;
    cached.db = db;

    console.log(`✓ Connected to MongoDB database: ${MONGODB_DB}`);
    
    return db;
  } catch (error) {
    // Clear the promise on error so next call will retry
    cached.promise = null;
    console.error('✗ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get a specific collection from the database
 * 
 * @param collectionName - Name of the collection
 * @returns MongoDB collection instance
 */
export async function getCollection(collectionName: string) {
  const db = await connectToDatabase();
  return db.collection(collectionName);
}

/**
 * Close the MongoDB connection
 * Useful for graceful shutdown or testing
 */
export async function closeConnection(): Promise<void> {
  if (cached.client) {
    await cached.client.close();
    cached.client = null;
    cached.db = null;
    cached.promise = null;
    console.log('✓ MongoDB connection closed');
  }
}

/**
 * Test the MongoDB connection
 * Returns true if connection is successful, false otherwise
 */
export async function testConnection(): Promise<boolean> {
  try {
    const db = await connectToDatabase();
    await db.command({ ping: 1 });
    console.log('✓ MongoDB connection test successful');
    return true;
  } catch (error) {
    console.error('✗ MongoDB connection test failed:', error);
    return false;
  }
}
