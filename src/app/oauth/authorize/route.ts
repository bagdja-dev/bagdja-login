/**
 * OAuth 2.0 Authorization Endpoint
 * GET /oauth/authorize
 * 
 * Initiates the authorization code flow
 * Validates PKCE parameters and client configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidCodeChallenge, isValidBase64url } from '@/lib/oauth';
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
    };

    // Validate parameters
    const validation = validateParams(params);
    if (!validation.valid) {
      // #region debug-point C:authorize-invalid-params
      fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'oauth-login-loop', runId: 'pre-fix', hypothesisId: 'C', location: 'bagdja-login/src/app/oauth/authorize/route.ts:GET', msg: '[DEBUG] authorize params failed validation', data: { error: validation.error, clientId: params.client_id, redirectUri: params.redirect_uri, hasState: !!params.state, hasCodeChallenge: !!params.code_challenge }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      return NextResponse.json(
        { error: validation.error || 'Invalid parameters' },
        { status: 400 }
      );
    }

    // Check if user is authenticated (has session cookie)
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('bagdja_auth_token')?.value;
    // #region debug-point A:authorize-cookie-check
    fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'oauth-login-loop', runId: 'pre-fix', hypothesisId: 'A', location: 'bagdja-login/src/app/oauth/authorize/route.ts:GET', msg: '[DEBUG] authorize checked auth cookie', data: { hasAuthCookie: !!authCookie, cookieNames: cookieStore.getAll().map((cookie) => cookie.name) }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    if (!authCookie) {
      // Redirect to login page with return URL
      // #region debug-point A:authorize-redirect-no-cookie
      fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'oauth-login-loop', runId: 'pre-fix', hypothesisId: 'A', location: 'bagdja-login/src/app/oauth/authorize/route.ts:GET', msg: '[DEBUG] authorize redirecting to login because auth cookie missing', data: { authorizeRedirect: request.nextUrl.pathname + request.nextUrl.search }, ts: Date.now() }) }).catch(() => {});
      // #endregion
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
    // #region debug-point B:authorize-auth-me-response
    fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'oauth-login-loop', runId: 'pre-fix', hypothesisId: 'B', location: 'bagdja-login/src/app/oauth/authorize/route.ts:GET', msg: '[DEBUG] authorize auth/me response received', data: { status: userResponse.status, ok: userResponse.ok, sentAuthorization: !!authCookie, sentClientToken: !!clientToken }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    if (!userResponse.ok) {
      // Invalid or expired session, redirect to login
      // #region debug-point B:authorize-redirect-auth-me-failed
      fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'oauth-login-loop', runId: 'pre-fix', hypothesisId: 'B', location: 'bagdja-login/src/app/oauth/authorize/route.ts:GET', msg: '[DEBUG] authorize redirecting to login because auth/me failed', data: { status: userResponse.status, authorizeRedirect: request.nextUrl.pathname + request.nextUrl.search }, ts: Date.now() }) }).catch(() => {});
      // #endregion
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('authorize_redirect', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    // Verify client is registered and redirect_uri is whitelisted
    // For now, we'll accept the redirect_uri but in production this should be validated
    // against registered OAuth clients in the database
    
    // TODO: Validate redirect_uri against registered OAuth clients in database
    // const clientResponse = await fetch(`${AUTH_API_BASE}/auth/client/${params.client_id}`);
    // if (!clientResponse.ok) return error
    // const client = await clientResponse.json()
    // if (!client.oauth_redirect_uris.includes(params.redirect_uri)) return error

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

    // Build callback URL with code and state
    const redirectUrl = new URL(params.redirect_uri!);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', params.state!);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
