import { NextRequest } from 'next/server';
import { buildLogoutRedirectResponse } from '@/lib/session-cookie';

/**
 * Clears the SSO session cookie and optionally redirects back to a mobile app.
 * GET /logout?redirect_uri=com.bagdja.wallet:/logout-callback
 */
export async function GET(request: NextRequest) {
  return buildLogoutRedirectResponse(request);
}
