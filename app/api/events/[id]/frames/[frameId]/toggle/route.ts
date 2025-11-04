/**
 * Event Frame Toggle API Route
 * Version: 1.1.0
 * 
 * PATCH /api/events/[id]/frames/[frameId]/toggle - Toggle frame active status at event level
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/schemas';
import { ObjectId } from 'mongodb';

export async function PATCH(
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

    // Find and toggle frame
    const frames = event.frames || [];
    const frameIndex = frames.findIndex((f: any) => f.frameId === frameId);

    if (frameIndex === -1) {
      return NextResponse.json(
        { error: 'Frame not found in this event' },
        { status: 404 }
      );
    }

    // Toggle isActive status
    const updatedFrames = [...frames];
    updatedFrames[frameIndex] = {
      ...updatedFrames[frameIndex],
      isActive: !updatedFrames[frameIndex].isActive,
    };

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
      message: 'Frame status toggled successfully',
      frameId,
      isActive: updatedFrames[frameIndex].isActive,
    });
  } catch (error) {
    console.error('Error toggling frame status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle frame status' },
      { status: 500 }
    );
  }
}
