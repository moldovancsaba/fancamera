/**
 * Event Detail API
 * Version: 2.0.0
 * 
 * GET: Retrieve single event details with assigned frames and custom pages
 * PATCH: Update event details including customPages array (v2.0.0)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS, generateTimestamp, CustomPageType } from '@/lib/db/schemas';
import { ObjectId } from 'mongodb';
import { withErrorHandler, requireAdmin, apiSuccess, apiNotFound, apiBadRequest, validateRequiredFields } from '@/lib/api';

/**
 * GET /api/events/[eventId]
 * Retrieve event details by MongoDB _id
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) => {
  const { eventId } = await context.params;

  // Validate ObjectId format
  if (!ObjectId.isValid(eventId)) {
    throw apiBadRequest('Invalid event ID format');
  }

  const db = await connectToDatabase();

  // Get event details including custom pages (v2.0.0)
  const event = await db
    .collection(COLLECTIONS.EVENTS)
    .findOne({ _id: new ObjectId(eventId) });

  if (!event) {
    throw apiNotFound('Event');
  }

  // Return event with serialized _id
  // customPages array will be included automatically (v2.0.0)
  return apiSuccess({
    event: {
      ...event,
      _id: event._id.toString(),
    }
  });
});

/**
 * PATCH /api/events/[eventId]
 * Update event details including customPages array
 * 
 * Request body can include:
 * - name: Event name
 * - description: Event description
 * - eventDate: Event date (ISO 8601)
 * - location: Event location
 * - isActive: Active status
 * - customPages: Array of custom page configurations (v2.0.0)
 * 
 * Admin only
 */
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) => {
  // Check authentication and authorization - only admin users can update events
  await requireAdmin();

  const { eventId } = await context.params;

  // Validate ObjectId format
  if (!ObjectId.isValid(eventId)) {
    throw apiBadRequest('Invalid event ID format');
  }

  const db = await connectToDatabase();

  // Check event exists
  const event = await db
    .collection(COLLECTIONS.EVENTS)
    .findOne({ _id: new ObjectId(eventId) });

  if (!event) {
    throw apiNotFound('Event');
  }

  // Parse request body
  const body = await request.json();
  const { name, description, eventDate, location, loadingText, isActive, logoUrl, showLogo, customPages } = body;

  // Build update object with only provided fields
  const updateFields: any = {
    updatedAt: generateTimestamp(),
  };

  if (name !== undefined) {
    updateFields.name = name.trim();
  }
  if (description !== undefined) {
    updateFields.description = description.trim() || null;
  }
  if (eventDate !== undefined) {
    updateFields.eventDate = eventDate.trim() || null;
  }
  if (location !== undefined) {
    updateFields.location = location.trim() || null;
  }
  if (loadingText !== undefined) {
    updateFields.loadingText = loadingText.trim() || null;
  }
  if (logoUrl !== undefined) {
    updateFields.logoUrl = logoUrl?.trim() || null;
  }
  if (showLogo !== undefined) {
    updateFields.showLogo = Boolean(showLogo);
  }
  if (isActive !== undefined) {
    updateFields.isActive = Boolean(isActive);
  }

  // Handle customPages array (v2.0.0)
  // Validates page structure and ensures proper ordering
  if (customPages !== undefined) {
    if (!Array.isArray(customPages)) {
      throw apiBadRequest('customPages must be an array');
    }

    // Validate each page
    for (const page of customPages) {
      // Required fields
      validateRequiredFields(page, ['pageId', 'pageType', 'order', 'isActive', 'config']);
      
      // Validate pageType first
      const validTypes = Object.values(CustomPageType);
      if (!validTypes.includes(page.pageType)) {
        throw apiBadRequest(`Invalid pageType: ${page.pageType}. Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate config fields (take-photo type can have empty strings)
      if (page.pageType !== 'take-photo') {
        validateRequiredFields(page.config, ['title', 'description', 'buttonText']);
      } else {
        // take-photo only needs config object to exist
        if (!page.config || typeof page.config !== 'object') {
          throw apiBadRequest('take-photo pages must have config object');
        }
      }

      // Validate type-specific config
      if (page.pageType === 'who-are-you') {
        // who-are-you pages should have nameLabel and emailLabel
        if (!page.config.nameLabel || !page.config.emailLabel) {
          throw apiBadRequest('who-are-you pages must have nameLabel and emailLabel in config');
        }
      }

      if (page.pageType === 'accept') {
        // accept pages must have checkboxText
        if (!page.config.checkboxText) {
          throw apiBadRequest('accept pages must have checkboxText in config');
        }
      }
      
      // CTA pages: checkboxText is optional (used as URL to visit)
      // No validation needed as it's an optional field

      // Validate order is a number
      if (typeof page.order !== 'number') {
        throw apiBadRequest('page.order must be a number');
      }

      // Ensure timestamps exist
      if (!page.createdAt) {
        page.createdAt = generateTimestamp();
      }
      page.updatedAt = generateTimestamp();
    }

    updateFields.customPages = customPages;
  }

  // Update event in database
  const result = await db
    .collection(COLLECTIONS.EVENTS)
    .updateOne(
      { _id: new ObjectId(eventId) },
      { $set: updateFields }
    );

  if (result.matchedCount === 0) {
    throw apiNotFound('Event');
  }

  // Fetch updated event
  const updatedEvent = await db
    .collection(COLLECTIONS.EVENTS)
    .findOne({ _id: new ObjectId(eventId) });

  return apiSuccess({
    event: {
      ...updatedEvent,
      _id: updatedEvent!._id.toString(),
    }
  });
});
