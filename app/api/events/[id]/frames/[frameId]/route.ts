/**
 * Event Frame Management API Route
 * Version: 1.1.0
 * 
 * DELETE /api/events/[id]/frames/[frameId] - Remove a frame from an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/schemas';
import { ObjectId } from 'mongodb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; frameId: string }> }
) {
  try {
    const { id, frameId } = await params;

    const db = await connectToDatabase();
    const eventsCollection = db.collection(COLLECTIONS.EVENTS);

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

    // Remove frame from event
    const frames = event.frames || [];
    const updatedFrames = frames.filter(
      (f: any) => f.frameId !== frameId
    );

    if (frames.length === updatedFrames.length) {
      return NextResponse.json(
        { error: 'Frame not found in this event' },
        { status: 404 }
      );
    }

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
      message: 'Frame removed successfully',
      frameId,
    });
  } catch (error) {
    console.error('Error removing frame from event:', error);
    return NextResponse.json(
      { error: 'Failed to remove frame' },
      { status: 500 }
    );
  }
}
