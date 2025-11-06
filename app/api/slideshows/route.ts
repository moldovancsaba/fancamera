/**
 * Slideshows API
 * Version: 1.0.0
 * 
 * POST: Create new slideshow for an event
 * GET: List all slideshows for an event (query param: eventId)
 * DELETE: Delete a slideshow
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS, generateId, generateTimestamp } from '@/lib/db/schemas';
import { getSession } from '@/lib/auth/session';

/**
 * POST /api/slideshows
 * Create a new slideshow for an event
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication - only admins can create slideshows
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      eventId, 
      name, 
      transitionDurationMs = 5000, 
      fadeDurationMs = 1000,
      bufferSize = 10,
      refreshStrategy = 'continuous'
    } = body;

    if (!eventId || !name) {
      return NextResponse.json(
        { error: 'Event ID and slideshow name are required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();

    // Validate that event exists
    const event = await db
      .collection(COLLECTIONS.EVENTS)
      .findOne({ _id: new ObjectId(eventId) });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Create slideshow document
    const slideshow = {
      slideshowId: generateId(),
      eventId,
      eventName: event.name,
      name,
      isActive: true,
      transitionDurationMs,
      fadeDurationMs,
      bufferSize,
      refreshStrategy,
      createdBy: session.user.id,
      createdAt: generateTimestamp(),
      updatedAt: generateTimestamp(),
    };

    const result = await db.collection(COLLECTIONS.SLIDESHOWS).insertOne(slideshow);

    return NextResponse.json({
      success: true,
      slideshow: {
        _id: result.insertedId,
        ...slideshow,
      },
    });
  } catch (error) {
    console.error('Error creating slideshow:', error);
    return NextResponse.json(
      { error: 'Failed to create slideshow' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/slideshows?eventId=...
 * List all slideshows for an event
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();

    const slideshows = await db
      .collection(COLLECTIONS.SLIDESHOWS)
      .find({ eventId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ slideshows });
  } catch (error) {
    console.error('Error fetching slideshows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch slideshows' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/slideshows?id=...
 * Delete a slideshow
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid slideshow ID is required' }, { status: 400 });
    }

    const db = await connectToDatabase();

    const result = await db
      .collection(COLLECTIONS.SLIDESHOWS)
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Slideshow not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting slideshow:', error);
    return NextResponse.json(
      { error: 'Failed to delete slideshow' },
      { status: 500 }
    );
  }
}
