/**
 * Hashtags API
 * Version: 1.1.0
 * 
 * GET: Get all unique hashtags or search for hashtags
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/schemas';

/**
 * GET /api/hashtags
 * Get all unique hashtags with optional search
 * 
 * Query params:
 * - q: Search query (case-insensitive substring match)
 * - limit: Maximum number of results (default: 50)
 * 
 * Returns array of unique hashtag strings sorted alphabetically
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '50');

    const db = await connectToDatabase();
    
    // Use MongoDB aggregation to get unique hashtags from all frames
    // This extracts hashtags array, unwinds it, groups by unique values
    const pipeline: any[] = [
      // Only include frames that have hashtags
      { $match: { hashtags: { $exists: true, $ne: [] } } },
      // Unwind the hashtags array to separate documents
      { $unwind: '$hashtags' },
      // Group by hashtag to get unique values
      { $group: { _id: '$hashtags' } },
      // Sort alphabetically
      { $sort: { _id: 1 } },
    ];

    // Add search filter if query provided
    if (query && query.trim() !== '') {
      // Case-insensitive regex search for hashtags containing the query
      pipeline.splice(1, 0, {
        $match: {
          hashtags: { $regex: query.trim(), $options: 'i' }
        }
      });
    }

    // Limit results
    pipeline.push({ $limit: limit });

    const results = await db
      .collection(COLLECTIONS.FRAMES)
      .aggregate(pipeline)
      .toArray();

    // Extract hashtag strings from _id field
    const hashtags = results.map((result) => result._id);

    return NextResponse.json({
      hashtags,
      count: hashtags.length,
    });
  } catch (error) {
    console.error('Error fetching hashtags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hashtags' },
      { status: 500 }
    );
  }
}
