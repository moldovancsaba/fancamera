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

import { NextResponse } from 'next/server';
import { generatePKCEPair, generateState, getAuthorizationUrl } from '@/lib/auth/sso';
import { storePendingSession } from '@/lib/auth/session';

export async function GET() {
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

    // Build authorization URL with PKCE challenge
    const authUrl = getAuthorizationUrl(codeChallenge, state);

    console.log('✓ Initiating OAuth flow, redirecting to SSO');

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
