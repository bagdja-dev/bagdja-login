import { NextRequest, NextResponse } from 'next/server';
import { isValidRedirectUrl } from '@/lib/auth';

export function clearAuthCookie(response: NextResponse, host: string) {
  if (host.endsWith('.bagdja.com')) {
    response.cookies.delete({
      name: 'bagdja_auth_token',
      domain: '.bagdja.com',
      path: '/',
    });
  } else {
    response.cookies.delete('bagdja_auth_token');
  }
}

export function buildLogoutRedirectResponse(request: NextRequest): NextResponse {
  const redirectUri = request.nextUrl.searchParams.get('redirect_uri');
  const host = request.headers.get('host') || '';
  const fallback = new URL('/', request.url).toString();
  const target =
    redirectUri && isValidRedirectUrl(redirectUri) ? redirectUri : fallback;

  const response = NextResponse.redirect(target);
  clearAuthCookie(response, host);
  return response;
}
