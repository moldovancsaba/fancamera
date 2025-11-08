/**
 * Logos API - List and Create
 * Version: 1.0.0
 * 
 * GET: List all logos with pagination
 * POST: Create new logo (admin only)
 * 
 * Why logos exist:
 * - Separate from frames (logos are for branding, frames are for photo overlays)
 * - Support multiple logos per scenario with random selection
 * - Simplify logo management across events
 */

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { uploadImage } from '@/lib/imgbb/upload';
import { generateId } from '@/lib/db/schemas';
import {
  withErrorHandler,
  requireAdmin,
  parsePaginationParams,
  apiSuccess,
  apiCreated,
  apiBadRequest,
} from '@/lib/api';

/**
 * GET /api/logos
 * List all logos with optional pagination and filtering
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const { page, limit } = parsePaginationParams(searchParams);
  const active = searchParams.get('active');

  const db = await connectToDatabase();
    
  // Build query
  const query: any = {};
  if (active !== null) query.isActive = active === 'true';

  // Get total count
  const total = await db.collection('logos').countDocuments(query);

  // Get paginated results
  const logos = await db
    .collection('logos')
    .find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  // Serialize MongoDB ObjectId
  const serializedLogos = logos.map(logo => ({
    ...logo,
    _id: logo._id.toString(),
  }));

  return apiSuccess({
    logos: serializedLogos,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * POST /api/logos
 * Create a new logo (admin only)
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Check authentication and authorization - only admin users can create logos
  const session = await requireAdmin();

  // Parse form data
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const isActiveValue = formData.get('isActive');
  const isActive = isActiveValue === 'true';

  console.log('Logo upload - Form data received:', {
    hasFile: !!file,
    fileName: file?.name,
    fileType: file?.type,
    fileSize: file?.size,
    name,
    isActive,
  });

  if (!file || !name || name.trim() === '') {
    throw apiBadRequest('File and name are required');
  }

  // Check if file is actually a File object
  if (!(file instanceof File)) {
    throw apiBadRequest('Invalid file upload');
  }

  // Validate file type (support common logo formats)
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw apiBadRequest('Only PNG, JPG, SVG, and WebP files are allowed');
  }

  // Upload to imgbb
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const uploadResult = await uploadImage(base64, { name: `logo-${Date.now()}` });

  // Get image dimensions (for display calculations)
  // Note: We rely on imgbb metadata, but could add image-size library for validation
  const width = 0; // TODO: Extract from image if needed
  const height = 0; // TODO: Extract from image if needed

  // Save to database
  const db = await connectToDatabase();
  const logo = {
    logoId: generateId(),
    name,
    description,
    imageUrl: uploadResult.imageUrl,
    thumbnailUrl: uploadResult.thumbnailUrl,
    width,  // Placeholder - can be extracted from image
    height, // Placeholder - can be extracted from image
    fileSize: uploadResult.fileSize,
    mimeType: uploadResult.mimeType,
    isActive,
    usageCount: 0,
    createdBy: session.user.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await db.collection('logos').insertOne(logo);

  return apiCreated({
    logo: {
      _id: result.insertedId.toString(),
      ...logo,
    },
  });
});
