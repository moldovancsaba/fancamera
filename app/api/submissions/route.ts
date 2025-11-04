/**
 * Submissions API
 * Version: 1.3.0
 * 
 * POST: Save photo submission with frame to imgbb and MongoDB
 * GET: List user's submissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { getSession } from '@/lib/auth/session';
import { uploadImage } from '@/lib/imgbb/upload';

/**
 * POST /api/submissions
 * Save a new photo submission
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { imageData, frameId } = body;

    if (!imageData || !frameId) {
      return NextResponse.json(
        { error: 'Image data and frame ID are required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer and upload to imgbb
    const base64Data = imageData.split(',')[1]; // Remove data:image/png;base64, prefix
    const uploadResult = await uploadImage(base64Data, {
      name: `submission-${Date.now()}`,
    });

    // Get frame details from database
    const db = await connectToDatabase();
    const frame = await db.collection('frames').findOne({ _id: frameId });

    if (!frame) {
      return NextResponse.json({ error: 'Frame not found' }, { status: 404 });
    }

    // Save submission to database
    const submission = {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name || session.user.email,
      frameId: frame._id,
      frameName: frame.name,
      frameCategory: frame.category,
      imageUrl: uploadResult.imageUrl,
      thumbnailUrl: uploadResult.thumbnailUrl,
      deleteUrl: uploadResult.deleteUrl,
      imageId: uploadResult.imageId,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      metadata: {
        device: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      },
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection('submissions').insertOne(submission);

    return NextResponse.json({
      success: true,
      submission: {
        _id: result.insertedId,
        ...submission,
      },
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { error: 'Failed to save submission' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/submissions
 * Get user's submissions with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const db = await connectToDatabase();

    // Get total count
    const total = await db
      .collection('submissions')
      .countDocuments({ userId: session.user.id });

    // Get paginated results
    const submissions = await db
      .collection('submissions')
      .find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
