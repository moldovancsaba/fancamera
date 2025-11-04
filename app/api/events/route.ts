/**
 * Events API - List and Create
 * Version: 1.1.0
 * 
 * GET: List all events with pagination, search, and partner filtering
 * POST: Create new event (admin only, requires partnerId)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { getSession } from '@/lib/auth/session';
import { COLLECTIONS, generateId, generateTimestamp } from '@/lib/db/schemas';

/**
 * GET /api/events
 * List all events with optional pagination, search, and filtering
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - search: Search by event name
 * - partnerId: Filter by partner
 * - active: Filter by active status (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const partnerId = searchParams.get('partnerId');
    const active = searchParams.get('active');

    const db = await connectToDatabase();
    
    // Build query
    // Query filters narrow down events based on partner, name, or status
    const query: any = {};
    
    // Filter by partner
    if (partnerId) {
      query.partnerId = partnerId;
    }
    
    // Search by event name (case-insensitive)
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Filter by active status
    if (active !== null) {
      query.isActive = active === 'true';
    }

    // Get total count for pagination
    const total = await db.collection(COLLECTIONS.EVENTS).countDocuments(query);

    // Get paginated results sorted by event date (newest first) then creation date
    const events = await db
      .collection(COLLECTIONS.EVENTS)
      .find(query)
      .sort({ eventDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Create a new event (admin only)
 * 
 * Required fields in request body:
 * - name: Event name
 * - partnerId: Partner UUID
 * 
 * Optional fields:
 * - description: Event description
 * - eventDate: Event date (ISO 8601)
 * - location: Event location
 * - isActive: Active status (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    // Only admin users can create events
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin' && session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { name, partnerId, description, eventDate, location, isActive } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Event name is required' },
        { status: 400 }
      );
    }

    if (!partnerId || partnerId.trim() === '') {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();

    // Verify partner exists and get partner name
    // This ensures referential integrity and caches partner name for display
    const partner = await db
      .collection(COLLECTIONS.PARTNERS)
      .findOne({ partnerId: partnerId.trim() });

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Create event document
    // eventId is a UUID for consistent identification
    // partnerName is cached for efficient queries and display
    // frames array starts empty - frames are assigned separately
    const now = generateTimestamp();
    const event = {
      eventId: generateId(),
      name: name.trim(),
      description: description?.trim() || undefined,
      partnerId: partner.partnerId,
      partnerName: partner.name,
      eventDate: eventDate?.trim() || undefined,
      location: location?.trim() || undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      frames: [],
      submissionCount: 0,
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTIONS.EVENTS).insertOne(event);

    return NextResponse.json({
      success: true,
      event: {
        _id: result.insertedId,
        ...event,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
