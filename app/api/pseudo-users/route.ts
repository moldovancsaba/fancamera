/**
 * Pseudo Users API
 * Version: 1.0.0
 * 
 * GET: List all pseudo users (event guests who provided name/email via custom pages)
 * 
 * Pseudo users are people who:
 * - Took photos at events
 * - Provided their name and email via 'who-are-you' custom pages
 * - Are not SSO authenticated users (event guests)
 * 
 * Why this exists:
 * - Track event participant engagement
 * - Enable marketing campaigns to event attendees
 * - Measure reach and participation across events
 */

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import {
  withErrorHandler,
  requireAuth,
  parsePaginationParams,
  apiSuccess,
} from '@/lib/api';

/**
 * GET /api/pseudo-users
 * List all pseudo users with their activity stats
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 * - search: Search by name or email
 * - eventId: Filter by specific event
 * - partnerId: Filter by specific partner
 * 
 * Returns:
 * - users: Array of pseudo users with stats
 * - pagination: Page info
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Require admin authentication
  await requireAuth();

  const { searchParams } = request.nextUrl;
  const { page, limit } = parsePaginationParams(searchParams);
  const search = searchParams.get('search') || '';
  const eventId = searchParams.get('eventId') || null;
  const partnerId = searchParams.get('partnerId') || null;

  const db = await connectToDatabase();

  // Build aggregation pipeline to group submissions by userInfo.email
  const matchStage: any = {
    'userInfo.email': { $exists: true, $ne: null }, // Only submissions with userInfo
  };

  // Apply filters
  if (eventId) {
    matchStage.eventId = eventId;
  }
  if (partnerId) {
    matchStage.partnerId = partnerId;
  }
  if (search) {
    matchStage.$or = [
      { 'userInfo.name': { $regex: search, $options: 'i' } },
      { 'userInfo.email': { $regex: search, $options: 'i' } },
    ];
  }

  // Aggregation pipeline to group by email and collect stats
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$userInfo.email', // Group by email
        name: { $first: '$userInfo.name' }, // Take first name (should be same)
        email: { $first: '$userInfo.email' }, // Email (for display)
        submissionCount: { $sum: 1 }, // Count submissions
        firstSeen: { $min: '$userInfo.collectedAt' }, // First submission
        lastSeen: { $max: '$userInfo.collectedAt' }, // Most recent submission
        // Collect unique events participated in
        events: {
          $addToSet: {
            eventId: '$eventId',
            eventName: '$eventName',
          },
        },
        // Collect unique partners
        partners: {
          $addToSet: {
            partnerId: '$partnerId',
            partnerName: '$partnerName',
          },
        },
        // Collect consents (flattened from all submissions)
        allConsents: { $push: '$consents' },
      },
    },
    {
      $project: {
        _id: 0,
        email: '$_id',
        name: 1,
        submissionCount: 1,
        firstSeen: 1,
        lastSeen: 1,
        events: {
          $filter: {
            input: '$events',
            as: 'event',
            cond: { $ne: ['$$event.eventId', null] }, // Remove null events
          },
        },
        partners: {
          $filter: {
            input: '$partners',
            as: 'partner',
            cond: { $ne: ['$$partner.partnerId', null] }, // Remove null partners
          },
        },
        // Flatten and dedupe consents
        consents: {
          $reduce: {
            input: '$allConsents',
            initialValue: [],
            in: { $concatArrays: ['$$value', '$$this'] },
          },
        },
      },
    },
    { $sort: { lastSeen: -1 } }, // Most recent first
  ];

  // Execute aggregation
  const allUsers = await db.collection('submissions').aggregate(pipeline).toArray();

  // Manual pagination (aggregation results are in memory)
  const total = allUsers.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const users = allUsers.slice(startIndex, endIndex);

  return apiSuccess({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});
