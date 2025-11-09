/**
 * Partner Detail Page
 * Version: 2.8.0
 * 
 * Display partner details with list of events and frames
 * v2.8.0: Added default styles display for child event inheritance
 */

import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/schemas';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DeletePartnerButton from '@/components/admin/DeletePartnerButton';

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Validate ObjectId format
  if (!ObjectId.isValid(id)) {
    notFound();
  }

  let partner: any = null;
  let events: any[] = [];
  let submissions: any[] = [];
  let dbError = null;

  try {
    const db = await connectToDatabase();
    
    // Get partner details
    partner = await db
      .collection(COLLECTIONS.PARTNERS)
      .findOne({ _id: new ObjectId(id) });

    if (!partner) {
      notFound();
    }

    // Get events for this partner
    events = await db
      .collection(COLLECTIONS.EVENTS)
      .find({ partnerId: partner.partnerId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Get submissions for all events under this partner (limit to most recent 50)
    // NEW: Updated query for new schema with archive and hidden checks
    submissions = await db
      .collection(COLLECTIONS.SUBMISSIONS)
      .find({
        partnerId: partner.partnerId,
        isArchived: false,              // NEW: Exclude archived submissions
        hiddenFromPartner: false        // NEW: Exclude hidden from partner
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

  } catch (error) {
    console.error('Error fetching partner details:', error);
    dbError = error instanceof Error ? error.message : 'Unknown error';
  }

  if (!partner) {
    notFound();
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link href="/admin/partners" className="hover:text-gray-700 dark:hover:text-gray-200">
            Partners
          </Link>
          <span>→</span>
          <span>{partner.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{partner.name}</h1>
            {partner.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">{partner.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/partners/${id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Edit Partner
            </Link>
            <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-lg ${
              partner.isActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {partner.isActive ? '● Active' : '○ Inactive'}
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
        {/* Left Column - Partner Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Partner Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Partner ID</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{partner.partnerId}</dd>
              </div>
              {partner.contactName && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact Person</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{partner.contactName}</dd>
                </div>
              )}
              {partner.contactEmail && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact Email</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    <a href={`mailto:${partner.contactEmail}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                      {partner.contactEmail}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(partner.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(partner.updatedAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Statistics Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistics</h2>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Events</dt>
                <dd className="text-2xl font-bold text-gray-900 dark:text-white">{events.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Frames</dt>
                <dd className="text-2xl font-bold text-gray-900 dark:text-white">{partner.frameCount || 0}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Photos</dt>
                <dd className="text-2xl font-bold text-gray-900 dark:text-white">{submissions.length}</dd>
              </div>
            </dl>
            <Link
              href={`/admin/partners/${id}#gallery`}
              className="mt-4 block w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors text-center"
            >
              View Gallery →
            </Link>
          </div>

          {/* Delete Partner Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Danger Zone</h2>
            <DeletePartnerButton
              partnerId={id}
              partnerName={partner.name}
              hasEvents={events.length > 0}
              eventCount={events.length}
            />
          </div>
        </div>

        {/* Right Column - Default Styles and Events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Default Styles Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Default Styles for Child Events</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    These defaults cascade to all child events (marked with 🟢)
                  </p>
                </div>
                <Link
                  href={`/admin/partners/${id}/edit`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Edit Defaults
                </Link>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Brand Colors */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Brand Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm"
                        style={{ backgroundColor: partner.defaultBrandColors?.primary || '#3B82F6' }}
                      ></div>
                      <div>
                        <p className="text-sm font-mono text-gray-900 dark:text-white font-semibold">
                          {partner.defaultBrandColors?.primary || '#3B82F6'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Buttons, focus states
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Border/Accent Color
                    </label>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm"
                        style={{ backgroundColor: partner.defaultBrandColors?.secondary || '#3B82F6' }}
                      ></div>
                      <div>
                        <p className="text-sm font-mono text-gray-900 dark:text-white font-semibold">
                          {partner.defaultBrandColors?.secondary || '#3B82F6'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Borders, inputs
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Frames and Logos Info */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Default Frames</p>
                    <p className="text-gray-900 dark:text-white font-semibold">
                      {partner.defaultFrames?.length || 0} frames
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Default Logos</p>
                    <p className="text-gray-900 dark:text-white font-semibold">
                      {partner.defaultLogos?.length || 0} logos
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                  💡 New events will automatically inherit these defaults. Events with custom styles (🔴) remain independent.
                </p>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Events</h2>
                <Link
                  href={`/admin/events/new?partnerId=${partner.partnerId}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  + Add Event
                </Link>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No events yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create your first event for this partner
                </p>
                <Link
                  href={`/admin/events/new?partnerId=${partner.partnerId}`}
                  className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Create Event
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {events.map((event: any) => (
                  <div key={event._id.toString()} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link
                          href={`/admin/events/${event._id}`}
                          className="text-lg font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {event.name}
                        </Link>
                        {event.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {event.eventDate && (
                            <span>📅 {new Date(event.eventDate).toLocaleDateString()}</span>
                          )}
                          {event.location && (
                            <span>📍 {event.location}</span>
                          )}
                          <span>🖼️ {event.frames?.length || 0} frames</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {event.isActive ? '● Active' : '○ Inactive'}
                        </span>
                        <Link
                          href={`/admin/events/${event._id}/edit`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm font-medium"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Partner Gallery Section */}
      <div id="gallery" className="mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              📷 Partner Gallery
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              All photos captured across {partner.name}'s events
            </p>
          </div>

          {submissions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">📸</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No submissions yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Photos captured at this partner's events will appear here
              </p>
              {events.length > 0 && (
                <Link
                  href={`/capture/${events[0]._id}`}
                  className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  📸 Start Capturing
                </Link>
              )}
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
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-white text-xs font-medium truncate">
                          {submission.eventName || 'General'}
                        </p>
                        <p className="text-white/80 text-xs truncate">
                          {submission.userName || submission.userEmail}
                        </p>
                        <p className="text-white/60 text-xs">
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
