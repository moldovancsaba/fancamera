/**
 * Event API - Individual Operations
 * Version: 1.1.0
 * 
 * GET: Get single event details with frame assignments
 * PATCH: Update event
 * DELETE: Delete event
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db/mongodb';
import { getSession } from '@/lib/auth/session';
import { COLLECTIONS, generateTimestamp } from '@/lib/db/schemas';

/**
 * GET /api/events/[id]
 * Get single event details with assigned frames
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate MongoDB ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Get event document
    const event = await db
      .collection(COLLECTIONS.EVENTS)
      .findOne({ _id: new ObjectId(id) });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      event,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[id]
 * Update event details (admin only)
 * 
 * Updatable fields:
 * - name
 * - description
 * - eventDate
 * - location
 * - isActive
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and authorization
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin' && session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Validate MongoDB ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, eventDate, location, isActive } = body;

    // Build update object with only provided fields
    // This allows partial updates without overwriting unspecified fields
    const updates: any = {
      updatedAt: generateTimestamp(),
    };

    if (name !== undefined) {
      if (name.trim() === '') {
        return NextResponse.json(
          { error: 'Event name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (eventDate !== undefined) {
      updates.eventDate = eventDate?.trim() || null;
    }

    if (location !== undefined) {
      updates.location = location?.trim() || null;
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    const db = await connectToDatabase();
    
    // Update event document
    const result = await db
      .collection(COLLECTIONS.EVENTS)
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updates },
        { returnDocument: 'after' }
      );

    if (!result) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      event: result,
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 * Delete event (admin only)
 * 
 * Allows deletion without checking for submissions
 * This is intentional - events can be deleted even with historical data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and authorization
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin' && session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Validate MongoDB ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Get event to check existence
    const event = await db
      .collection(COLLECTIONS.EVENTS)
      .findOne({ _id: new ObjectId(id) });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Delete event
    // Note: Submissions referencing this event will remain for historical purposes
    // This is by design - we keep submission history even if event is deleted
    await db
      .collection(COLLECTIONS.EVENTS)
      .deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
