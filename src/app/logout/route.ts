import { NextRequest, NextResponse } from 'next/server';

/**
 * Clears the SSO session cookie so mobile/web clients can fully sign out.
 * GET /logout
 */
export async function GET(request: NextRequest) {
  const loginUrl = new URL('/', request.url);
  const response = NextResponse.redirect(loginUrl);
  const host = request.headers.get('host') || '';

  if (host.endsWith('.bagdja.com')) {
    response.cookies.delete({
      name: 'bagdja_auth_token',
      domain: '.bagdja.com',
      path: '/',
    });
  } else {
    response.cookies.delete('bagdja_auth_token');
  }

  return response;
}
