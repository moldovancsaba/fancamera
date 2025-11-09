/**
 * OAuth Callback API Route
 * Version: 1.0.0
 * 
 * Handles OAuth2 callback from SSO after user authentication.
 * 
 * Flow:
 * 1. Verify state parameter (CSRF protection)
 * 2. Exchange authorization code for tokens
 * 3. Fetch user information
 * 4. Create session with tokens
 * 5. Redirect to homepage or profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, decodeIdToken } from '@/lib/auth/sso';
import { consumePendingSession, createSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors from SSO
    if (error) {
      console.error('✗ OAuth error from SSO:', error);
      const errorDescription = searchParams.get('error_description');
      
      return NextResponse.redirect(
        new URL(`/?error=${error}&message=${encodeURIComponent(errorDescription || 'Authentication failed')}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('✗ Missing code or state parameter');
      return NextResponse.redirect(
        new URL('/?error=invalid_request&message=Missing required parameters', request.url)
      );
    }

    // Get and verify pending session (CSRF protection)
    const pendingSession = await consumePendingSession();
    
    if (!pendingSession) {
      console.error('✗ No pending session found or expired');
      return NextResponse.redirect(
        new URL('/?error=session_expired&message=Login session expired, please try again', request.url)
      );
    }

    // Verify state matches (CSRF protection)
    if (pendingSession.state !== state) {
      console.error('✗ State mismatch - possible CSRF attack');
      return NextResponse.redirect(
        new URL('/?error=invalid_state&message=Invalid state parameter', request.url)
      );
    }

    console.log('✓ State verified, exchanging code for tokens');

    // Exchange authorization code for tokens using PKCE verifier
    const tokens = await exchangeCodeForToken(code, pendingSession.codeVerifier);
    
    console.log('✓ Tokens obtained, extracting user info from ID token');

    // Extract user information from ID token (JWT)
    // SSO v5.23.1 includes all user claims in the id_token
    const user = decodeIdToken(tokens.id_token);

    console.log('✓ User info extracted:', user.email);

    // Create session with user and tokens
    await createSession(user, tokens);

    console.log('✓ Session created, redirecting to homepage');

    // Redirect to homepage
    // Note: Future enhancement - redirect to /profile or "where you left off" page
    // See ROADMAP.md Q1 2026 - User Experience Improvements
    return NextResponse.redirect(new URL('/', request.url));
    
  } catch (error) {
    console.error('✗ OAuth callback failed:', error);
    
    return NextResponse.redirect(
      new URL(
        `/?error=auth_failed&message=${encodeURIComponent(
          error instanceof Error ? error.message : 'Authentication failed'
        )}`,
        request.url
      )
    );
  }
}
