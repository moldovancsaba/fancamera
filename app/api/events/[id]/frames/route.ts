/**
 * Event Frames API Route
 * Version: 1.1.0
 * 
 * POST /api/events/[id]/frames - Assign a frame to an event
 * 
 * Three-tier frame visibility logic:
 * - Global frames: visible to all events
 * - Partner frames: visible only to events of the same partner
 * - Event frames: owned by specific event
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/schemas';
import { ObjectId } from 'mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { frameId, isActive = true } = body;

    if (!frameId) {
      return NextResponse.json(
        { error: 'frameId is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const eventsCollection = db.collection(COLLECTIONS.EVENTS);
    const framesCollection = db.collection(COLLECTIONS.FRAMES);

    // Fetch event
    const event = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Fetch frame to verify it exists
    const frame = await framesCollection.findOne({
      _id: new ObjectId(frameId),
    });

    if (!frame) {
      return NextResponse.json(
        { error: 'Frame not found' },
        { status: 404 }
      );
    }

    // Check if frame is already assigned to this event
    const frames = event.frames || [];
    const existingIndex = frames.findIndex(
      (f: any) => f.frameId === frameId
    );

    if (existingIndex !== -1) {
      return NextResponse.json(
        { error: 'Frame is already assigned to this event' },
        { status: 400 }
      );
    }

    // Add frame to event
    const updatedFrames = [
      ...frames,
      {
        frameId,
        isActive,
        assignedAt: new Date().toISOString(),
      },
    ];

    await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          frames: updatedFrames,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      message: 'Frame assigned successfully',
      frameId,
    });
  } catch (error) {
    console.error('Error assigning frame to event:', error);
    return NextResponse.json(
      { error: 'Failed to assign frame' },
      { status: 500 }
    );
  }
}
