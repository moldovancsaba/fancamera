/**
 * Remove Submission from Event API
 * Version: 1.0.0
 * 
 * DELETE /api/events/[eventId]/submissions/[submissionId]
 * 
 * Removes a submission from a specific event by removing the eventId from
 * the submission's eventIds array. The submission remains in the database
 * and can be re-added to the event later.
 * 
 * Auth: Requires admin session
 */

import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/schemas';
import { ObjectId } from 'mongodb';
import { withErrorHandler, requireAdmin, apiSuccess, apiBadRequest, apiNotFound } from '@/lib/api';

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params?: Promise<{ eventId: string; submissionId: string }> }
) => {
  // Auth: Admin only
  const session = await requireAdmin();

  const { eventId, submissionId } = await context!.params!;

  // Validate ObjectId format
  if (!ObjectId.isValid(submissionId)) {
    throw apiBadRequest('Invalid submission ID format');
  }

  const db = await connectToDatabase();

  // Find the submission
  const submission = await db
    .collection(COLLECTIONS.SUBMISSIONS)
    .findOne({ _id: new ObjectId(submissionId) });

  if (!submission) {
    throw apiNotFound('Submission not found');
  }

  // Remove eventId from eventIds array
  const result = await db
    .collection(COLLECTIONS.SUBMISSIONS)
    .updateOne(
      { _id: new ObjectId(submissionId) },
      {
        $pull: { eventIds: eventId } as any,
        $set: { updatedAt: new Date().toISOString() }
      }
    );

  if (result.modifiedCount === 0) {
    throw apiBadRequest('Submission was not in this event or already removed');
  }

  // Count remaining submissions for this event
  const remainingCount = await db
    .collection(COLLECTIONS.SUBMISSIONS)
    .countDocuments({
      eventIds: { $in: [eventId] },
      isArchived: false,
      hiddenFromEvents: { $nin: [eventId] }
    });

  console.log(`✓ Removed submission ${submissionId} from event ${eventId} by ${session.user.email}`);

  return apiSuccess({
    message: 'Submission removed from event',
    remainingSubmissions: remainingCount
  });
});
