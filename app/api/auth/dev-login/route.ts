/**
 * Development Mock Login
 * Version: 1.0.1
 * 
 * Temporary bypass for SSO authentication during development.
 * This creates a mock session without requiring SSO.
 * 
 * WARNING: This should be removed or disabled in production.
 */

import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth/session';

export async function GET() {
  // Create a mock user session for development
  const mockUser = {
    id: 'dev-user-001',
    email: 'dev@fancamera.app',
    name: 'Development User',
    role: 'admin' as const,
  };

  // Create session
  const session = await createSession(mockUser);

  // Redirect to homepage
  const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  response.cookies.set('session', session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
}
