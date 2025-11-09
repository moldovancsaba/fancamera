/**
 * Login API Route
 * Version: 1.0.0
 * 
 * Initiates OAuth2 authentication flow with SSO.
 * 
 * Flow:
 * 1. Generate PKCE code verifier and challenge
 * 2. Generate state for CSRF protection
 * 3. Store verifier and state in pending session cookie
 * 4. Redirect user to SSO authorization endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { generatePKCEPair, generateState, getAuthorizationUrl } from '@/lib/auth/sso';
import { storePendingSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    // Generate PKCE pair for security
    const { codeVerifier, codeChallenge } = generatePKCEPair();
    
    // Generate state for CSRF protection
    const state = generateState();

    // Store PKCE verifier and state in temporary cookie
    // Will be used in callback to verify the response
    await storePendingSession({
      codeVerifier,
      state,
    });
    
    // Check if user just logged out (from query param or referer)
    const { searchParams } = new URL(request.url);
    const fromLogout = searchParams.get('from_logout') === 'true';
    
    // Build authorization URL with PKCE challenge
    // If user just logged out, force re-authentication with prompt=login
    const authUrl = getAuthorizationUrl(codeChallenge, state, {
      prompt: fromLogout ? 'login' : undefined,
    });

    console.log(`✓ Initiating OAuth flow${fromLogout ? ' (force re-auth after logout)' : ''}, redirecting to SSO`);

    // Redirect user to SSO for authentication
    return NextResponse.redirect(authUrl);
    
  } catch (error) {
    console.error('✗ Login initiation failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to initiate login',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
