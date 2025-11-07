/**
 * Admin Users Page
 * Version: 36.1.0
 * 
 * Compact list of users with core info only.
 * Fields: name, email, Last Event, Registered, photos
 */

import { connectToDatabase } from '@/lib/db/mongodb';
import Link from 'next/link';

/**
 * Sanitize username for URL
 * Replaces spaces and special characters with underscores
 */
function sanitizeUsername(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

export default async function AdminUsersPage() {
  let pseudoUsers: any[] = [];
  let error = null;

  try {
    const db = await connectToDatabase();
    
    // Fetch ALL submissions (both with and without userInfo)
    // Users with userInfo.name/email are real users who provided their information
    // Users without userInfo or with 'anonymous' userId are truly anonymous
    const submissions = await db
      .collection('submissions')
      .find({ isArchived: false })
      .sort({ createdAt: -1 })
      .toArray();

    // Group submissions by user identifier (email or userId)
    const userMap = new Map<string, any>();
    
    for (const submission of submissions) {
      // Determine user identifier and whether they're anonymous
      const hasUserInfo = submission.userInfo?.email && submission.userInfo?.name;
      const identifier = hasUserInfo 
        ? submission.userInfo.email 
        : submission.userId || submission.userEmail;
      
      const isAnonymous = !hasUserInfo && 
        (submission.userId === 'anonymous' || submission.userEmail === 'anonymous@event');
      
      if (!userMap.has(identifier)) {
        userMap.set(identifier, {
          email: hasUserInfo ? submission.userInfo.email : submission.userEmail,
          name: hasUserInfo ? submission.userInfo.name : (isAnonymous ? 'Anonymous User' : submission.userName || 'Unknown'),
          isAnonymous: isAnonymous,
          collectedAt: submission.userInfo?.collectedAt || submission.createdAt,
          eventId: submission.eventId,
          eventName: submission.eventName || 'Unknown Event',
          partnerId: submission.partnerId,
          partnerName: submission.partnerName,
          consents: submission.consents || [],
          submissions: [],
        });
      }
      
      // Add submission to user's submissions array
      userMap.get(identifier)?.submissions.push({
        _id: submission._id,
        imageUrl: submission.imageUrl,
        frameName: submission.frameName,
        createdAt: submission.createdAt,
      });
    }

    pseudoUsers = Array.from(userMap.values());

  } catch (err) {
    console.error('Error fetching pseudo users:', err);
    error = err instanceof Error ? err.message : 'Unknown error';
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Compact list with core info</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 font-medium">Database Connection Error</p>
          <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
        </div>
      )}

      {!error && pseudoUsers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No users yet</h3>
          <p className="text-gray-600 dark:text-gray-400">Waiting for first submissions</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {pseudoUsers.map((user: any, index: number) => {
              const profileHref = `/users/${sanitizeUsername(user.name || 'Anonymous')}`;
              const emailDisplay = user.isAnonymous ? 'anonymous@event.com' : (user.email || 'unknown');
              const registeredAt = new Date(user.collectedAt).toLocaleString();
              const photosCount = user.submissions.length;
              const lastEvent = user.eventName || 'Unknown Event';

              return (
                <div key={`${user.email}-${index}`} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={profileHref} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate">
                        {user.name || 'Anonymous'}
                      </Link>
                      {user.isAnonymous && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">Anon</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">email: {emailDisplay}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Last Event: {lastEvent}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">Registered: {registeredAt}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">photos: {photosCount}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
