/**
 * Camera Webapp - Homepage
 * Version: 1.0.0
 * 
 * Main landing page for photo capture with frames.
 * Shows login status and provides authentication controls.
 */

import { getSession } from '@/lib/auth/session';

export default async function Home() {
  // Get current session to show user info
  const session = await getSession();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
            📸 Camera
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            Professional Photo Frame Application
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Version 1.0.0 - SSO Authentication Ready
          </p>
          
          {session && (
            <div className="mt-4 inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-4 py-2 rounded-lg">
              <p className="text-sm">
                ✓ Logged in as <span className="font-semibold">{session.user.email}</span>
              </p>
            </div>
          )}
        </div>

        <div className="max-w-2xl mb-12">
          <p className="text-lg text-gray-700 dark:text-gray-200 mb-6">
            Capture photos with beautiful graphical frames, share on social media, and manage your image gallery.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-3">📸</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Camera Capture</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Live camera support for mobile and desktop
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-3">🖼️</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Frame Library</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Choose from pre-designed frames and overlays
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-3">🔗</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Easy Sharing</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Share on social media with one click
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {session ? (
            // Logged in - show app buttons
            <>
              <button 
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                disabled
              >
                Start Capturing (Coming Soon)
              </button>
              
              <a
                href="/profile"
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
              >
                My Gallery
              </a>

              {(session.user.role === 'admin' || session.user.role === 'super-admin') && (
                <a
                  href="/admin"
                  className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-lg"
                >
                  Admin Panel
                </a>
              )}
              
              <a
                href="/api/auth/logout"
                className="px-8 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors shadow-lg"
              >
                Logout
              </a>
            </>
          ) : (
            // Not logged in - show login button
            <a
              href="/api/auth/login"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              🔐 Login with SSO
            </a>
          )}
        </div>

        <div className="mt-12 text-sm text-gray-500 dark:text-gray-400">
          <p>🔐 Authentication via SSO | ☁️ Powered by MongoDB Atlas | 📧 Email delivery with Resend</p>
        </div>
      </main>
    </div>
  );
}
