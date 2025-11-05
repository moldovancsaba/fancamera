/**
 * Event-Specific Capture Page
 * Version: 1.2.0
 * 
 * Allows users to capture photos with frames assigned to a specific event
 * Submissions are tagged with partner/event context for gallery organization
 */

import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/schemas';
import { ObjectId } from 'mongodb';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export default async function EventCapturePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  // Check authentication
  const session = await getSession();
  if (!session) {
    redirect('/api/auth/login');
  }

  const { eventId } = await params;

  // Validate MongoDB ObjectId format
  if (!ObjectId.isValid(eventId)) {
    notFound();
  }

  let event: any = null;
  let partner: any = null;
  let frames: any[] = [];

  try {
    const db = await connectToDatabase();

    // Fetch event details
    event = await db
      .collection(COLLECTIONS.EVENTS)
      .findOne({ _id: new ObjectId(eventId) });

    if (!event || !event.isActive) {
      notFound();
    }

    // Fetch partner details
    if (event.partnerId) {
      partner = await db
        .collection(COLLECTIONS.PARTNERS)
        .findOne({ partnerId: event.partnerId });
    }

    // Get frames assigned to this event (only active ones)
    const activeFrameAssignments = (event.frames || []).filter((f: any) => f.isActive);
    const frameIds = activeFrameAssignments.map((f: any) => f.frameId);

    if (frameIds.length > 0) {
      // Convert string frameIds to ObjectId
      const objectIds = frameIds
        .filter((id: string) => ObjectId.isValid(id))
        .map((id: string) => new ObjectId(id));

      frames = await db
        .collection(COLLECTIONS.FRAMES)
        .find({
          _id: { $in: objectIds },
          isActive: true,
        })
        .toArray();
    }
  } catch (error) {
    console.error('Error loading event capture page:', error);
    notFound();
  }

  if (!event) {
    notFound();
  }

  // Pass event and partner context to the client via data attributes
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header with event branding */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              {partner && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {partner.name}
                </p>
              )}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {event.name}
              </h1>
              {event.eventDate && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {new Date(event.eventDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
              {event.location && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  📍 {event.location}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <a
                href={`/admin/events/${eventId}`}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Event Details →
              </a>
              <a
                href="/profile"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                My Gallery
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main capture interface */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {frames.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🖼️</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No frames available
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This event doesn't have any active frames yet.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              ← Back to Home
            </a>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                📸 Capture Your Photo
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a frame and take your photo for {event.name}
              </p>
            </div>

            {/* Event context data for JavaScript */}
            <div
              id="event-context"
              data-event-id={eventId}
              data-event-name={event.name}
              data-partner-id={event.partnerId || ''}
              data-partner-name={partner?.name || ''}
              className="hidden"
            />

            {/* Frame selection grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {frames.map((frame: any) => (
                <button
                  key={frame._id.toString()}
                  className="frame-selector group relative bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 border-transparent hover:border-blue-500 transition-all"
                  data-frame-id={frame._id.toString()}
                  data-frame-name={frame.name}
                >
                  <div className="aspect-square relative bg-white dark:bg-gray-800 rounded overflow-hidden mb-2">
                    <img
                      src={frame.thumbnailUrl || frame.imageUrl}
                      alt={frame.name}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white text-center">
                    {frame.name}
                  </p>
                </button>
              ))}
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {frames.length} frame{frames.length !== 1 ? 's' : ''} available for this event
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            📝 How it works
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Select a frame design from above</li>
            <li>• Take a photo using your camera or upload an existing one</li>
            <li>• Your photo will be saved to your gallery, the event gallery, and the partner gallery</li>
            <li>• You can download and share your framed photo anytime</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
