/**
 * Partners API - List and Create
 * Version: 1.1.0
 * 
 * GET: List all partners with pagination and search
 * POST: Create new partner (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { getSession } from '@/lib/auth/session';
import { COLLECTIONS, generateId, generateTimestamp } from '@/lib/db/schemas';

/**
 * GET /api/partners
 * List all partners with optional pagination, search, and filtering
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - search: Search by partner name
 * - active: Filter by active status (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const active = searchParams.get('active');

    const db = await connectToDatabase();
    
    // Build query
    // Query filters are used to narrow down the result set based on user input
    const query: any = {};
    
    // Search by partner name (case-insensitive)
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // Filter by active status
    if (active !== null) {
      query.isActive = active === 'true';
    }

    // Get total count for pagination
    const total = await db.collection(COLLECTIONS.PARTNERS).countDocuments(query);

    // Get paginated results sorted by creation date (newest first)
    const partners = await db
      .collection(COLLECTIONS.PARTNERS)
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      partners,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/partners
 * Create a new partner (admin only)
 * 
 * Required fields in request body:
 * - name: Partner name
 * 
 * Optional fields:
 * - description: Partner description
 * - contactEmail: Contact email
 * - contactName: Contact person name
 * - logoUrl: Partner logo URL
 * - isActive: Active status (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    // Only admin users can create partners
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin' && session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description, contactEmail, contactName, logoUrl, isActive } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Partner name is required' },
        { status: 400 }
      );
    }

    // Create partner document
    // partnerId is a UUID for consistent identification across systems
    // Timestamps are in ISO 8601 format with milliseconds UTC
    const db = await connectToDatabase();
    const now = generateTimestamp();
    const partner = {
      partnerId: generateId(),
      name: name.trim(),
      description: description?.trim() || undefined,
      contactEmail: contactEmail?.trim() || undefined,
      contactName: contactName?.trim() || undefined,
      logoUrl: logoUrl?.trim() || undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      eventCount: 0,
      frameCount: 0,
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTIONS.PARTNERS).insertOne(partner);

    return NextResponse.json({
      success: true,
      partner: {
        _id: result.insertedId,
        ...partner,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating partner:', error);
    return NextResponse.json(
      { error: 'Failed to create partner' },
      { status: 500 }
    );
  }
}
