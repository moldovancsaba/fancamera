/**
 * SSO Client for OAuth2/OIDC Authentication
 * Version: 1.0.0
 * 
 * Integrates with sso.doneisbetter.com for user authentication.
 * Implements Authorization Code Flow with PKCE (required for public clients).
 * 
 * SSO Service: https://sso.doneisbetter.com (v5.16.0)
 * 
 * Why PKCE:
 * - Camera is a public client (browser-based SPA)
 * - PKCE provides security without client secret exposure
 * - Required by sso.doneisbetter.com for public clients
 * 
 * Flow:
 * 1. Generate PKCE code verifier and challenge
 * 2. Redirect user to SSO authorization endpoint
 * 3. User authenticates and approves
 * 4. SSO redirects back with authorization code
 * 5. Exchange code for access token + refresh token
 * 6. Store tokens in session
 * 7. Use access token for API calls
 * 8. Refresh token when expired
 */

import crypto from 'crypto';

// Environment variables validation
if (!process.env.SSO_BASE_URL) {
  throw new Error('SSO_BASE_URL environment variable is not defined');
}

if (!process.env.SSO_CLIENT_ID) {
  throw new Error('SSO_CLIENT_ID environment variable is not defined');
}

if (!process.env.SSO_REDIRECT_URI) {
  throw new Error('SSO_REDIRECT_URI environment variable is not defined');
}

export const SSO_CONFIG = {
  baseUrl: process.env.SSO_BASE_URL,
  clientId: process.env.SSO_CLIENT_ID,
  redirectUri: process.env.SSO_REDIRECT_URI,
  scopes: ['openid', 'profile', 'email'],
} as const;

// SSO Endpoints (standard OIDC discovery)
export const SSO_ENDPOINTS = {
  authorize: `${SSO_CONFIG.baseUrl}/api/oauth/authorize`,
  token: `${SSO_CONFIG.baseUrl}/api/oauth/token`,
  userinfo: `${SSO_CONFIG.baseUrl}/api/oauth/userinfo`,
  revoke: `${SSO_CONFIG.baseUrl}/api/oauth/revoke`,
  discovery: `${SSO_CONFIG.baseUrl}/.well-known/openid-configuration`,
} as const;

/**
 * User information from SSO
 */
export interface SSOUser {
  id: string;
  email: string;
  name?: string;
  email_verified?: boolean;
  role?: string;
}

/**
 * OAuth2 token response
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * PKCE code verifier and challenge pair
 */
export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

/**
 * Generate PKCE code verifier (random string)
 * Used to prevent authorization code interception attacks
 * 
 * @returns Random base64url-encoded string (43-128 characters)
 */
export function generateCodeVerifier(): string {
  // Generate 32 random bytes (256 bits)
  const buffer = crypto.randomBytes(32);
  
  // Convert to base64url encoding (URL-safe)
  return base64URLEncode(buffer);
}

/**
 * Generate PKCE code challenge from verifier
 * Uses SHA-256 hash of the verifier
 * 
 * @param verifier - Code verifier string
 * @returns Base64url-encoded SHA-256 hash
 */
export function generateCodeChallenge(verifier: string): string {
  // SHA-256 hash
  const hash = crypto.createHash('sha256').update(verifier).digest();
  
  // Convert to base64url encoding
  return base64URLEncode(hash);
}

/**
 * Generate PKCE pair (verifier and challenge)
 * 
 * @returns Object with codeVerifier and codeChallenge
 */
export function generatePKCEPair(): PKCEPair {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  return {
    codeVerifier,
    codeChallenge,
  };
}

/**
 * Generate authorization URL for SSO login
 * Includes PKCE challenge and state for CSRF protection
 * 
 * @param codeChallenge - PKCE code challenge
 * @param state - Random state string for CSRF protection
 * @returns Authorization URL to redirect user to
 */
export function getAuthorizationUrl(codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id: SSO_CONFIG.clientId,
    redirect_uri: SSO_CONFIG.redirectUri,
    response_type: 'code',
    scope: SSO_CONFIG.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${SSO_ENDPOINTS.authorize}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * Uses PKCE code verifier for security
 * 
 * @param code - Authorization code from SSO
 * @param codeVerifier - PKCE code verifier
 * @returns Token response with access_token and refresh_token
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SSO_CONFIG.redirectUri,
    client_id: SSO_CONFIG.clientId,
    code_verifier: codeVerifier,
  });

  const response = await fetch(SSO_ENDPOINTS.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 * Called when access token expires
 * 
 * @param refreshToken - Current refresh token
 * @returns New token response
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SSO_CONFIG.clientId,
  });

  const response = await fetch(SSO_ENDPOINTS.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Get user information from SSO
 * Uses access token to fetch user profile
 * 
 * @param accessToken - Valid access token
 * @returns User information
 */
export async function getUserInfo(accessToken: string): Promise<SSOUser> {
  const response = await fetch(SSO_ENDPOINTS.userinfo, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Revoke access token or refresh token
 * Called during logout
 * 
 * @param token - Token to revoke
 * @param tokenTypeHint - Type of token ('access_token' or 'refresh_token')
 */
export async function revokeToken(
  token: string,
  tokenTypeHint: 'access_token' | 'refresh_token' = 'access_token'
): Promise<void> {
  const params = new URLSearchParams({
    token,
    token_type_hint: tokenTypeHint,
    client_id: SSO_CONFIG.clientId,
  });

  const response = await fetch(SSO_ENDPOINTS.revoke, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    console.error('Token revocation failed:', response.status);
    // Don't throw - revocation failure shouldn't block logout
  }
}

/**
 * Generate random state string for CSRF protection
 * Used in OAuth flow to prevent cross-site request forgery
 * 
 * @returns Random base64url-encoded string
 */
export function generateState(): string {
  const buffer = crypto.randomBytes(32);
  return base64URLEncode(buffer);
}

/**
 * Helper: Convert buffer to base64url encoding
 * Base64url is URL-safe (no +, /, = characters)
 * 
 * @param buffer - Buffer to encode
 * @returns Base64url-encoded string
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
