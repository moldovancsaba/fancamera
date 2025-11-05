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
import { notFound } from 'next/navigation';

export default async function EventCapturePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
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
          <div className="text-center">
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
            <p className="text-gray-600 dark:text-gray-400">
              This event doesn't have any active frames yet.
            </p>
          </div>
        ) : (
          <>
            {/* Progress Steps */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                📸 Take a Photo
              </h2>
              <div className="flex items-center justify-center gap-4 md:gap-8">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg mb-2">
                    1
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white text-center">
                    Select Frame
                  </p>
                </div>
                <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 flex items-center justify-center font-bold text-lg mb-2">
                    2
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
                    Capture Photo
                  </p>
                </div>
                <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 flex items-center justify-center font-bold text-lg mb-2">
                    3
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
                    Preview & Save
                  </p>
                </div>
              </div>
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

            {/* Step 1: Frame Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Step 1: Choose Your Frame
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Select a frame design for your photo
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {frames.map((frame: any) => (
                  <button
                    key={frame._id.toString()}
                    className="frame-selector group relative bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 border-transparent hover:border-blue-500 focus:border-blue-600 transition-all"
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
            </div>
          </>
        )}
      </div>

      {/* Instructions */}
      {frames.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-12">
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
              📝 How it works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800 dark:text-blue-300">
              <div>
                <span className="font-semibold">1. Select Frame:</span> Choose your favorite frame design
              </div>
              <div>
                <span className="font-semibold">2. Capture Photo:</span> Take a photo or upload from your device
              </div>
              <div>
                <span className="font-semibold">3. Preview & Save:</span> Review and download your framed photo
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
