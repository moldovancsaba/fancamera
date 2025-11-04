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
import { NextRequest } from 'next/server';
import { createSession } from '@/lib/auth/session';
import type { TokenResponse } from '@/lib/auth/sso';

export async function GET(request: NextRequest) {
  // Create a mock user session for development
  const mockUser = {
    id: 'dev-user-001',
    email: 'dev@fancamera.app',
    name: 'Development User',
    role: 'admin' as const,
  };

  // Create mock tokens for development
  const mockTokens: TokenResponse = {
    access_token: 'dev-access-token',
    refresh_token: 'dev-refresh-token',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'openid profile email',
  };

  // Create session
  await createSession(mockUser, mockTokens);

  // Redirect to homepage using request origin
  const origin = request.nextUrl.origin;
  const response = NextResponse.redirect(new URL('/', origin));

  return response;
}
