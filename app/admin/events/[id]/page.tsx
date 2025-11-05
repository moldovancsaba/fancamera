/**
 * Event Detail Page
 * Version: 1.1.0
 * 
 * Display event details with partner info and assigned frames
 */

import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/schemas';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Validate ObjectId format
  if (!ObjectId.isValid(id)) {
    notFound();
  }

  let event: any = null;
  let partner: any = null;
  let submissions: any[] = [];
  let dbError = null;

  try {
    const db = await connectToDatabase();
    
    // Get event details
    event = await db
      .collection(COLLECTIONS.EVENTS)
      .findOne({ _id: new ObjectId(id) });

    if (!event) {
      notFound();
    }

    // Get partner details
    partner = await db
      .collection(COLLECTIONS.PARTNERS)
      .findOne({ partnerId: event.partnerId });

    // Get submissions for this event (limit to most recent 50)
    submissions = await db
      .collection(COLLECTIONS.SUBMISSIONS)
      .find({ eventId: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

  } catch (error) {
    console.error('Error fetching event details:', error);
    dbError = error instanceof Error ? error.message : 'Unknown error';
  }

  if (!event) {
    notFound();
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link href="/admin/events" className="hover:text-gray-700 dark:hover:text-gray-200">
            Events
          </Link>
          <span>→</span>
          <span>{event.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{event.name}</h1>
            {event.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">{event.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/events/${id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Edit Event
            </Link>
            <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-lg ${
              event.isActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {event.isActive ? '● Active' : '○ Inactive'}
            </span>
          </div>
        </div>
      </div>

      {dbError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 font-medium">Error loading data</p>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">{dbError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Event Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Partner Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Partner</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{event.partnerName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {partner ? (
                    <Link
                      href={`/admin/partners/${partner._id}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                    >
                      View Partner →
                    </Link>
                  ) : (
                    'Partner details unavailable'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Event Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Event Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Event ID</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{event.eventId}</dd>
              </div>
              {event.eventDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Event Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(event.eventDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </dd>
                </div>
              )}
              {event.location && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Location</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{event.location}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(event.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(event.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Capture URL Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow-sm border border-blue-200 dark:border-blue-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">📸 Event Capture URL</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Share this URL to let users take photos for this event
            </p>
            <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 p-3 mb-3">
              <code className="text-xs text-gray-900 dark:text-white break-all">
                {typeof window !== 'undefined' ? window.location.origin : ''}/capture/{id}
              </code>
            </div>
            <Link
              href={`/capture/${id}`}
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors text-center"
            >
              Open Capture Page →
            </Link>
          </div>

          {/* Statistics Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistics</h2>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Frames</dt>
                <dd className="text-2xl font-bold text-gray-900 dark:text-white">{event.frames?.length || 0}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Photos</dt>
                <dd className="text-2xl font-bold text-gray-900 dark:text-white">{submissions.length}</dd>
              </div>
            </dl>
            <Link
              href={`/admin/events/${id}#gallery`}
              className="mt-4 block w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors text-center"
            >
              View Gallery →
            </Link>
          </div>
        </div>

        {/* Right Column - Frames */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assigned Frames</h2>
                <Link
                  href={`/admin/events/${id}/frames`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Manage Frames
                </Link>
              </div>
            </div>

            {(!event.frames || event.frames.length === 0) ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">🖼️</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No frames assigned yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Assign frames to this event to make them available for users
                </p>
                <Link
                  href={`/admin/events/${id}/frames`}
                  className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Assign Frames
                </Link>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {event.frames.map((frameAssignment: any, index: number) => (
                    <div
                      key={index}
                      className="relative bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">🖼️</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-mono truncate">
                          {frameAssignment.frameId}
                        </p>
                        <span className={`inline-flex mt-2 px-2 py-1 text-xs font-semibold rounded-full ${
                          frameAssignment.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {frameAssignment.isActive ? '● Active' : '○ Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Link
                    href={`/admin/events/${id}/frames`}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
                  >
                    Manage frame assignments →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Gallery Section */}
      <div id="gallery" className="mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              📷 Event Gallery
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Photos captured at this event
            </p>
          </div>

          {submissions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📸</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No submissions yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Photos captured at this event will appear here
              </p>
              <Link
                href={`/capture/${id}`}
                className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                📸 Start Capturing
              </Link>
            </div>
          ) : (
            <div className="p-6">
              {/* Pinterest-style masonry grid */}
              <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                {submissions.map((submission: any) => (
                  <Link
                    key={submission._id.toString()}
                    href={`/share/${submission._id}`}
                    className="group relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all mb-4 break-inside-avoid block"
                  >
                    <img
                      src={submission.imageUrl || submission.finalImageUrl}
                      alt={`Photo by ${submission.userName || submission.userEmail}`}
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-xs font-medium truncate">
                          {submission.userName || submission.userEmail}
                        </p>
                        <p className="text-white/80 text-xs">
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {submissions.length >= 50 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                  Showing the 50 most recent submissions
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
