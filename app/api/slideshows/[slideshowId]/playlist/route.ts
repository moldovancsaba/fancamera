/**
 * Slideshow Playlist API
 * Version: 1.0.0
 * 
 * GET: Generate next 5 slides for a slideshow with smart playlist logic
 * Returns slides with mosaic layouts for 1:1 and 9:16 images
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/schemas';
import { generatePlaylist } from '@/lib/slideshow/playlist';

/**
 * GET /api/slideshows/[slideshowId]/playlist?limit=N
 * Generate slides with least-played logic
 * 
 * Query params:
 * - limit: Number of slides to return (default: slideshow.bufferSize or 10)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slideshowId: string }> }
) {
  try {
    const { slideshowId } = await params;
    const { searchParams } = request.nextUrl;
    const limitParam = searchParams.get('limit');

    const db = await connectToDatabase();

    // Get slideshow details
    const slideshow = await db
      .collection(COLLECTIONS.SLIDESHOWS)
      .findOne({ slideshowId });

    if (!slideshow) {
      return NextResponse.json({ error: 'Slideshow not found' }, { status: 404 });
    }

    // Determine how many slides to generate
    const limit = limitParam ? parseInt(limitParam) : (slideshow.bufferSize || 10);

    // Get submissions for the event, sorted by playCount (least played first)
    // Then by createdAt (oldest first) for tie-breaking
    const submissions = await db
      .collection(COLLECTIONS.SUBMISSIONS)
      .find({ eventId: slideshow.eventId })
      .sort({ playCount: 1, createdAt: 1 })
      .toArray();

    if (submissions.length === 0) {
      return NextResponse.json({
        slideshow: {
          _id: slideshow._id,
          name: slideshow.name,
          eventName: slideshow.eventName,
        },
        playlist: [],
        message: 'No submissions available for this event',
      });
    }

    // Generate playlist with mosaic logic
    const playlist = generatePlaylist(submissions, limit);

    return NextResponse.json({
      slideshow: {
        _id: slideshow._id,
        name: slideshow.name,
        eventName: slideshow.eventName,
        transitionDurationMs: slideshow.transitionDurationMs,
        fadeDurationMs: slideshow.fadeDurationMs,
        bufferSize: slideshow.bufferSize || 10,
        refreshStrategy: slideshow.refreshStrategy || 'continuous',
      },
      playlist,
      totalSubmissions: submissions.length,
    });
  } catch (error) {
    console.error('Error generating playlist:', error);
    return NextResponse.json(
      { error: 'Failed to generate playlist' },
      { status: 500 }
    );
  }
}
