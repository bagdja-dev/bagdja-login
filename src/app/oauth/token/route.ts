/**
 * OAuth 2.0 Token Endpoint
 * POST /oauth/token
 * 
 * Exchanges authorization code for access token
 * Validates PKCE code verifier
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCodeChallenge, isValidCodeVerifier } from '@/lib/oauth';

const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';

interface TokenRequest {
  grant_type?: string;
  code?: string;
  code_verifier?: string;
  redirect_uri?: string;
  client_id?: string;
  client_secret?: string;
}

/**
 * Validate token request parameters
 */
function validateTokenRequest(body: TokenRequest): { valid: boolean; error?: string } {
  if (body.grant_type !== 'authorization_code') {
    return { valid: false, error: 'grant_type must be "authorization_code"' };
  }

  if (!body.code) {
    return { valid: false, error: 'code is required' };
  }

  if (!body.code_verifier) {
    return { valid: false, error: 'code_verifier is required (PKCE)' };
  }

  if (!isValidCodeVerifier(body.code_verifier)) {
    return { valid: false, error: 'code_verifier format invalid' };
  }

  if (!body.redirect_uri) {
    return { valid: false, error: 'redirect_uri is required' };
  }

  if (!body.client_id) {
    return { valid: false, error: 'client_id is required' };
  }

  return { valid: true };
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type');
    
    let body: TokenRequest = {};

    if (contentType?.includes('application/json')) {
      body = await request.json();
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = {
        grant_type: formData.get('grant_type') as string || undefined,
        code: formData.get('code') as string || undefined,
        code_verifier: formData.get('code_verifier') as string || undefined,
        redirect_uri: formData.get('redirect_uri') as string || undefined,
        client_id: formData.get('client_id') as string || undefined,
        client_secret: formData.get('client_secret') as string || undefined,
      };
    }

    // Validate request
    const validation = validateTokenRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid request' },
        { status: 400 }
      );
    }

    // Exchange authorization code for token
    // Call bagdja-auth to exchange code + code_verifier for access_token
    const tokenResponse = await fetch(`${AUTH_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: body.grant_type,
        code: body.code,
        code_verifier: body.code_verifier,
        redirect_uri: body.redirect_uri,
        client_id: body.client_id,
        client_secret: body.client_secret,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return NextResponse.json(
        { error: error.message || 'Invalid authorization code' },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();

    // Return token response
    return NextResponse.json(tokenData, {
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('OAuth token error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
