/**
 * Frames API - List and Create
 * Version: 1.1.0
 * 
 * GET: List all frames with pagination
 * POST: Create new frame (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { getSession } from '@/lib/auth/session';
import { uploadImage } from '@/lib/imgbb/upload';

/**
 * GET /api/frames
 * List all frames with optional pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    const db = await connectToDatabase();
    
    // Build query
    const query: any = {};
    if (category) query.category = category;
    if (active !== null) query.isActive = active === 'true';

    // Get total count
    const total = await db.collection('frames').countDocuments(query);

    // Get paginated results
    const frames = await db
      .collection('frames')
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      frames,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching frames:', error);
    return NextResponse.json(
      { error: 'Failed to fetch frames' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/frames
 * Create a new frame (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'admin' && session.user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const isActive = formData.get('isActive') === 'true';

    console.log('Form data received:', {
      hasFile: !!file,
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      name,
      category,
      isActive,
    });

    if (!file || !name || name.trim() === '') {
      return NextResponse.json(
        { 
          error: 'File and name are required',
          debug: {
            hasFile: !!file,
            hasName: !!name && name.trim() !== '',
            fileName: file?.name,
            nameValue: name,
          }
        },
        { status: 400 }
      );
    }

    // Check if file is actually a File object
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Invalid file upload' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PNG and SVG files are allowed' },
        { status: 400 }
      );
    }

    // Upload to imgbb
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const uploadResult = await uploadImage(base64, { name: `frame-${Date.now()}` });

    // Save to database
    const db = await connectToDatabase();
    const frame = {
      name,
      description,
      category: category || 'general',
      imageUrl: uploadResult.imageUrl,
      thumbnailUrl: uploadResult.thumbnailUrl,
      deleteUrl: uploadResult.deleteUrl,
      imageId: uploadResult.imageId,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
      isActive,
      createdBy: session.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection('frames').insertOne(frame);

    return NextResponse.json({
      success: true,
      frame: {
        _id: result.insertedId,
        ...frame,
      },
    });
  } catch (error) {
    console.error('Error creating frame:', error);
    return NextResponse.json(
      { error: 'Failed to create frame' },
      { status: 500 }
    );
  }
}
