/**
 * Submissions API
 * Version: 1.7.1
 * 
 * POST: Save photo submission with frame to imgbb and MongoDB
 * GET: List user's submissions
 */

import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db/mongodb';
import { uploadImage } from '@/lib/imgbb/upload';
import {
  withErrorHandler,
  requireAuth,
  optionalAuth,
  parsePaginationParams,
  validateRequiredFields,
  apiSuccess,
  apiCreated,
  apiNotFound,
  apiBadRequest,
} from '@/lib/api';

/**
 * POST /api/submissions
 * Save a new photo submission
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Check authentication (optional for event submissions)
  const session = await optionalAuth();

    // Parse request body
    const body = await request.json();
    const { imageData, frameId, eventId, eventName, partnerId, partnerName, imageWidth, imageHeight } = body;

  if (!imageData || !frameId) {
    throw apiBadRequest('Image data and frame ID are required');
  }

    // Convert base64 to buffer and upload to imgbb
    const base64Data = imageData.split(',')[1]; // Remove data:image/png;base64, prefix
    const uploadResult = await uploadImage(base64Data, {
      name: `submission-${Date.now()}`,
    });

    // Get frame details from database (using frameId UUID)
    const db = await connectToDatabase();
    const frame = await db.collection('frames').findOne({ frameId });

  if (!frame) {
    throw apiNotFound('Frame');
  }

    // Save submission to database
    const submission = {
      userId: session?.user?.id || 'anonymous',
      userEmail: session?.user?.email || 'anonymous@event',
      userName: session?.user?.name || session?.user?.email || 'Event Guest',
      frameId: frame.frameId,
      frameName: frame.name,
      frameCategory: frame.category,
      // Partner/Event context (for gallery filtering)
      partnerId: partnerId || null,
      partnerName: partnerName || null,
      eventId: eventId || null,
      eventName: eventName || null,
      imageUrl: uploadResult.imageUrl,
      deleteUrl: uploadResult.deleteUrl,
      imageId: uploadResult.imageId,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      metadata: {
        device: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        finalFileSize: uploadResult.fileSize,
        // Image dimensions for slideshow aspect ratio detection
        finalWidth: imageWidth || frame.width || 1920,
        finalHeight: imageHeight || frame.height || 1080,
      },
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection('submissions').insertOne(submission);

  return apiCreated({
    submission: {
      _id: result.insertedId,
      ...submission,
    },
  });
});

/**
 * GET /api/submissions
 * Get user's submissions with pagination
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Check authentication
  const session = await requireAuth();

  const { searchParams } = request.nextUrl;
  const { page, limit } = parsePaginationParams(searchParams);

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

  return apiSuccess({
    submissions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});
