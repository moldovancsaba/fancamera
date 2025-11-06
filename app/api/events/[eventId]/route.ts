/**
 * Event Detail API
 * Version: 1.0.0
 * 
 * GET: Retrieve single event details with assigned frames
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/schemas';
import { ObjectId } from 'mongodb';

/**
 * GET /api/events/[eventId]
 * Retrieve event details by MongoDB _id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    // Validate ObjectId format
    if (!ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID format' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();

    // Get event details
    const event = await db
      .collection(COLLECTIONS.EVENTS)
      .findOne({ _id: new ObjectId(eventId) });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Return event with serialized _id
    return NextResponse.json({
      event: {
        ...event,
        _id: event._id.toString(),
      }
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}
