import { NextRequest, NextResponse } from 'next/server';
import { getLoginBranding, REVALIDATE_SECONDS } from '@/lib/branding';

/**
 * GET /api/branding?client_id=bookpedia&brand=novello
 *
 * Halaman login sendiri sudah SSR (29 Okt 2026, lihat app/page.tsx); route
 * ini tetap ada untuk klien lain yang butuh branding login lewat HTTP.
 * Logika ada di `lib/branding.ts`.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const clientId = request.nextUrl.searchParams.get('client_id') ?? '';
  const brand = request.nextUrl.searchParams.get('brand');

  const branding = await getLoginBranding(clientId, brand);

  return NextResponse.json(branding, {
    headers: { 'Cache-Control': `public, max-age=${REVALIDATE_SECONDS}` },
  });
}
