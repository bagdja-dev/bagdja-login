import { NextResponse } from 'next/server';

export async function POST(): Promise<Response> {
  const authApiBase = process.env.NEXT_PUBLIC_AUTH_API;
  const appId = process.env.NEXT_PUBLIC_CLIENT_APP_ID;
  const appSecret = process.env.NEXT_PUBLIC_CLIENT_APP_SECRET;

  if (!authApiBase || !appId || !appSecret) {
    return NextResponse.json(
      {
        message:
          'Server is missing required env vars: NEXT_PUBLIC_AUTH_API, NEXT_PUBLIC_CLIENT_APP_ID, NEXT_PUBLIC_CLIENT_APP_SECRET.',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const upstream = await fetch(`${authApiBase}/auth/client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });

  const text = await upstream.text();

  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: 'Upstream returned non-JSON response.' };
  }

  return NextResponse.json(json, {
    status: upstream.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
