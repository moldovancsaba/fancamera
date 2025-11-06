/**
 * Slideshow Play Count Tracking API
 * Version: 1.0.0
 * 
 * POST: Update play counts for submissions that were displayed
 * Increments playCount and updates lastPlayedAt timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS, generateTimestamp } from '@/lib/db/schemas';

/**
 * POST /api/slideshows/[slideshowId]/played
 * Update play counts for displayed submissions
 * 
 * Body: { submissionIds: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slideshowId: string }> }
) {
  try {
    const { slideshowId } = await params;
    const body = await request.json();
    const { submissionIds } = body;

    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json(
        { error: 'submissionIds array is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();

    // Verify slideshow exists
    const slideshow = await db
      .collection(COLLECTIONS.SLIDESHOWS)
      .findOne({ slideshowId });

    if (!slideshow) {
      return NextResponse.json({ error: 'Slideshow not found' }, { status: 404 });
    }

    // Convert string IDs to ObjectId
    const objectIds = submissionIds
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    if (objectIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid submission IDs provided' },
        { status: 400 }
      );
    }

    // Update play counts for all displayed submissions
    const result = await db
      .collection(COLLECTIONS.SUBMISSIONS)
      .updateMany(
        { _id: { $in: objectIds } },
        {
          $inc: { playCount: 1 },
          $set: { lastPlayedAt: generateTimestamp() },
        }
      );

    return NextResponse.json({
      success: true,
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error updating play counts:', error);
    return NextResponse.json(
      { error: 'Failed to update play counts' },
      { status: 500 }
    );
  }
}
