import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    // #region debug-point A:session-route-input
    fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'oauth-login-loop', runId: 'pre-fix', hypothesisId: 'A', location: 'bagdja-login/src/app/api/auth/session/route.ts:POST', msg: '[DEBUG] session route invoked', data: { hasToken: !!token, nodeEnv: process.env.NODE_ENV || 'undefined' }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true });

    // Set the cookie server-side
    response.cookies.set('bagdja_auth_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    // #region debug-point E:session-cookie-config
    fetch('http://127.0.0.1:7777/event', { method: 'POST', body: JSON.stringify({ sessionId: 'oauth-login-loop', runId: 'pre-fix', hypothesisId: 'E', location: 'bagdja-login/src/app/api/auth/session/route.ts:POST', msg: '[DEBUG] session cookie configured on response', data: { cookieName: 'bagdja_auth_token', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' }, ts: Date.now() }) }).catch(() => {});
    // #endregion

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('bagdja_auth_token');
  return response;
}
