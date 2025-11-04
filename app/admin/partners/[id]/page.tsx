/**
 * Partner Detail Page
 * Version: 1.1.0
 * 
 * Display partner details with list of events and frames
 */

import { connectToDatabase } from '@/lib/db/mongodb';
import { COLLECTIONS } from '@/lib/db/schemas';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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
            </dl>
          </div>
        </div>

        {/* Right Column - Events List */}
        <div className="lg:col-span-2">
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
    </div>
  );
}
