/**
 * Camera Webapp - Homepage
 * Version: 1.0.0
 * 
 * Main landing page for photo capture with frames.
 * Shows login status and provides authentication controls.
 */

import { getSession } from '@/lib/auth/session';

// This page uses cookies, so it must be dynamic
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Get current session to show user info
  const session = await getSession();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img 
              src="https://i.ibb.co/zTG7ztxC/camera-logo.png" 
              alt="Camera Logo" 
              className="h-16 w-auto"
            />
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white">
              Camera
            </h1>
          </div>
          
          {session && (
            <div className="mt-4 inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-4 py-2 rounded-lg">
              <p className="text-sm">
                ✓ Logged in as <span className="font-semibold">{session.user.email}</span>
              </p>
            </div>
          )}
        </div>


        <div className="flex flex-col sm:flex-row gap-4">
          {session ? (
            // Logged in - show app buttons
            <>
              <a
                href="/capture"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg inline-block text-center"
              >
                Start Capturing
              </a>
              
              <a
                href="/profile"
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg"
              >
                Gallery
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
            // Not logged in - show login buttons
            <>
              <a
                href="/api/auth/login"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
              >
                🔐 Login with SSO
              </a>
              
              <a
                href="/api/auth/dev-login"
                className="px-8 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors shadow-lg"
              >
                🛠️ Dev Login (Bypass SSO)
              </a>
            </>
          )}
        </div>

        <div className="mt-12 text-sm text-gray-500 dark:text-gray-400">
          <p>🔐 Authentication via SSO | ☁️ Powered by MongoDB Atlas | 📧 Email delivery with Resend</p>
        </div>
      </main>
    </div>
  );
}
