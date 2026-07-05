import { NextRequest, NextResponse } from 'next/server';
import { buildLogoutRedirectResponse } from '@/lib/session-cookie';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });
    const host = request.headers.get('host') || '';
    const cookieOptions: Record<string, unknown> = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    };

    if (host.endsWith('.bagdja.com')) {
      cookieOptions.domain = '.bagdja.com';
    }

    // Set the cookie server-side
    response.cookies.set('bagdja_auth_token', token, cookieOptions);

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  const host = request.headers.get('host') || '';
  if (host.endsWith('.bagdja.com')) {
    response.cookies.delete({ name: 'bagdja_auth_token', domain: '.bagdja.com', path: '/' });
  } else {
    response.cookies.delete('bagdja_auth_token');
  }
  return response;
}

/** Browser/mobile logout via GET — clears SSO cookie then redirects. */
export async function GET(request: NextRequest) {
  return buildLogoutRedirectResponse(request);
}
