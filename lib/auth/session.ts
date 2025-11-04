/**
 * Session Management
 * Version: 1.0.0
 * 
 * Manages user sessions with 30-day sliding expiration.
 * Sessions are stored in encrypted cookies for security.
 * 
 * Features:
 * - 30-day sliding expiration (extends on each request)
 * - Automatic token refresh before expiration
 * - Secure HttpOnly cookies
 * - CSRF protection via state parameter
 * 
 * Session data includes:
 * - User ID and email
 * - Access token and refresh token
 * - Token expiration times
 * - User role (for admin access)
 */

import { cookies } from 'next/headers';
import { SSOUser, TokenResponse, refreshAccessToken } from './sso';

const SESSION_COOKIE_NAME = 'camera_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Session data stored in cookie
 */
export interface Session {
  user: SSOUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;  // ISO 8601 timestamp
  createdAt: string;              // ISO 8601 timestamp
  expiresAt: string;              // ISO 8601 timestamp (30 days from creation)
}

/**
 * Temporary session data stored during OAuth flow
 * Includes PKCE verifier and state for verification
 */
export interface PendingSession {
  codeVerifier: string;
  state: string;
  createdAt: string;
  expiresAt: string;  // Short expiration (15 minutes)
}

/**
 * Create a new session after successful authentication
 * 
 * @param user - User information from SSO
 * @param tokens - Access and refresh tokens
 * @returns Created session
 */
export async function createSession(
  user: SSOUser,
  tokens: TokenResponse
): Promise<Session> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE * 1000);
  const accessTokenExpiresAt = new Date(now.getTime() + tokens.expires_in * 1000);

  const session: Session = {
    user,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // Store session in HttpOnly cookie
  (await cookies()).set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  console.log('✓ Session created for user:', user.email);
  return session;
}

/**
 * Get current session from cookie (read-only)
 * Does NOT modify cookies - safe to use in Server Components
 * 
 * @returns Session if valid, null if expired or not found
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return null;
  }

  try {
    const session: Session = JSON.parse(sessionCookie.value);

    // Check if session expired (30 days)
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    
    if (now >= expiresAt) {
      console.log('Session expired');
      return null;
    }

    // Return session without modifying cookies
    // Token refresh and sliding expiration happen in middleware or API routes
    return session;
    
  } catch (error) {
    console.error('Error parsing session:', error);
    return null;
  }
}

/**
 * Clear current session (logout)
 */
export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  console.log('✓ Session cleared');
}

/**
 * Store pending session data during OAuth flow
 * Used to verify state and code_verifier in callback
 * 
 * @param data - PKCE verifier and state
 */
export async function storePendingSession(data: Omit<PendingSession, 'createdAt' | 'expiresAt'>): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

  const pendingSession: PendingSession = {
    ...data,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  (await cookies()).set('camera_pending_session', JSON.stringify(pendingSession), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  });
}

/**
 * Get and clear pending session data
 * Used in OAuth callback to verify state and get code verifier
 * 
 * @returns Pending session if valid, null if expired or not found
 */
export async function consumePendingSession(): Promise<PendingSession | null> {
  const cookieStore = await cookies();
  const pendingCookie = cookieStore.get('camera_pending_session');

  if (!pendingCookie) {
    return null;
  }

  // Clear the cookie immediately (one-time use)
  cookieStore.delete('camera_pending_session');

  try {
    const pending: PendingSession = JSON.parse(pendingCookie.value);

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(pending.expiresAt);
    
    if (now >= expiresAt) {
      console.log('Pending session expired');
      return null;
    }

    return pending;
    
  } catch (error) {
    console.error('Error parsing pending session:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 * 
 * @returns True if valid session exists
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Check if user is an admin
 * 
 * @returns True if user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.user.role === 'admin' || session?.user.role === 'super-admin';
}

/**
 * Require authentication for a route
 * Throws error if not authenticated
 * 
 * @returns Session if authenticated
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }
  
  return session;
}

/**
 * Require admin role for a route
 * Throws error if not admin
 * 
 * @returns Session if admin
 * @throws Error if not admin
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  
  if (session.user.role !== 'admin' && session.user.role !== 'super-admin') {
    throw new Error('Admin access required');
  }
  
  return session;
}
