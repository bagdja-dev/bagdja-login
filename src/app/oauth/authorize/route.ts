/**
 * OAuth 2.0 Authorization Endpoint
 * GET /oauth/authorize
 * 
 * Initiates the authorization code flow
 * Validates PKCE parameters and client configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidCodeChallenge, isValidBase64url, buildOAuthCallbackUrl } from '@/lib/oauth';
import { clearAuthCookie } from '@/lib/session-cookie';
import { cookies } from 'next/headers';

const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';
const CLIENT_APP_ID = process.env.NEXT_PUBLIC_CLIENT_APP_ID;
const CLIENT_APP_SECRET = process.env.NEXT_PUBLIC_CLIENT_APP_SECRET;

interface AuthorizeParams {
  client_id?: string;
  response_type?: string;
  redirect_uri?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  scope?: string;
  prompt?: string;
}

/**
 * Validate authorize request parameters
 */
function validateParams(params: AuthorizeParams): { valid: boolean; error?: string } {
  if (params.response_type !== 'code') {
    return { valid: false, error: 'response_type must be "code"' };
  }

  if (!params.client_id) {
    return { valid: false, error: 'client_id is required' };
  }

  if (!params.redirect_uri) {
    return { valid: false, error: 'redirect_uri is required' };
  }

  if (!params.state) {
    return { valid: false, error: 'state is required' };
  }

  if (!isValidBase64url(params.state)) {
    return { valid: false, error: 'state must be valid base64url' };
  }

  if (!params.code_challenge) {
    return { valid: false, error: 'code_challenge is required (PKCE)' };
  }

  if (!isValidCodeChallenge(params.code_challenge)) {
    return { valid: false, error: 'code_challenge format invalid' };
  }

  if (params.code_challenge_method && params.code_challenge_method !== 'S256') {
    return { valid: false, error: 'code_challenge_method must be "S256"' };
  }

  return { valid: true };
}

async function getClientToken(): Promise<string | null> {
  if (!CLIENT_APP_ID || !CLIENT_APP_SECRET) {
    return null;
  }

  const response = await fetch(`${AUTH_API_BASE}/auth/client`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: CLIENT_APP_ID,
      app_secret: CLIENT_APP_SECRET,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json().catch(() => null);
  return data?.['x-api-token'] || null;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params: AuthorizeParams = {
      client_id: searchParams.get('client_id') || undefined,
      response_type: searchParams.get('response_type') || undefined,
      redirect_uri: searchParams.get('redirect_uri') || undefined,
      state: searchParams.get('state') || undefined,
      code_challenge: searchParams.get('code_challenge') || undefined,
      code_challenge_method: searchParams.get('code_challenge_method') || 'S256',
      scope: searchParams.get('scope') || 'openid profile email',
      prompt: searchParams.get('prompt') || undefined,
    };

    // Validate parameters
    const validation = validateParams(params);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const host = request.headers.get('host') || '';

    // Mobile logout flow: force user back to login form and clear SSO cookie.
    if (params.prompt === 'login') {
      const authorizeUrl = new URL(request.url);
      authorizeUrl.searchParams.delete('prompt');

      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set(
        'authorize_redirect',
        authorizeUrl.pathname + authorizeUrl.search,
      );

      const response = NextResponse.redirect(loginUrl);
      clearAuthCookie(response, host);
      return response;
    }

    // Check if user is authenticated (has session cookie)
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('bagdja_auth_token')?.value;

    if (!authCookie) {
      // Redirect to login page with return URL
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('authorize_redirect', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    // Verify user session with auth service
    const clientToken = await getClientToken();
    const userResponse = await fetch(`${AUTH_API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authCookie}`,
        ...(clientToken ? { 'x-api-token': clientToken } : {}),
      },
    });

    if (!userResponse.ok) {
      // Invalid or expired session, redirect to login
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('authorize_redirect', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    // Verify client is registered and redirect_uri is whitelisted
    const clientResponse = await fetch(`${AUTH_API_BASE}/auth/client/public/${params.client_id}`);
    if (!clientResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid client_id' },
        { status: 400 }
      );
    }
    const client = await clientResponse.json();
    
    if (!client.oauthRedirectUris || !client.oauthRedirectUris.includes(params.redirect_uri)) {
      return NextResponse.json(
        { error: 'Invalid redirect_uri' },
        { status: 400 }
      );
    }

    // Generate authorization code
    const codeResponse = await fetch(`${AUTH_API_BASE}/oauth/authorization-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authCookie}`,
        ...(clientToken ? { 'x-api-token': clientToken } : {}),
      },
      body: JSON.stringify({
        client_id: params.client_id,
        redirect_uri: params.redirect_uri,
        code_challenge: params.code_challenge,
        code_challenge_method: params.code_challenge_method,
        scope: params.scope,
      }),
    });

    if (!codeResponse.ok) {
      const error = await codeResponse.json();
      return NextResponse.json(
        { error: error.message || 'Failed to generate authorization code' },
        { status: codeResponse.status }
      );
    }

    const { code } = await codeResponse.json();

    // Build callback URL — jangan pakai new URL() untuk custom scheme karena
    // `com.app://host` menjadi `com.app://host/` (trailing slash) dan AppAuth gagal match.
    const callbackUrl = buildOAuthCallbackUrl(
      params.redirect_uri!,
      code,
      params.state!,
    );

    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
