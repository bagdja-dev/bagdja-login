import { Suspense } from 'react';
import { preload } from 'react-dom';
import { firstParam, getBrandingSource } from '@/lib/authorize-params';
import { getLoginBranding } from '@/lib/branding';
import { LoginContent } from './login-content';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Halaman login — branding (nama, logo, background per client app / brand)
 * di-resolve SERVER-SIDE (29 Okt 2026) supaya HTML pertama sudah benar,
 * tanpa fetch /api/branding dari browser. Fetch dibatasi timeout 2 detik dan
 * di-cache 5 menit (lib/branding.ts); gagal = default Bagdja. Gambar logo &
 * background di-preload supaya browser mulai mengunduh sedini mungkin.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const source = getBrandingSource(firstParam(params.redirect_url) ?? firstParam(params.authorize_redirect));
  const initialBranding = source ? await getLoginBranding(source.clientId, source.brand) : null;

  if (initialBranding?.logoUrl) {
    preload(initialBranding.logoUrl, { as: 'image', fetchPriority: 'high' });
  }
  if (initialBranding?.backgroundUrl) {
    preload(initialBranding.backgroundUrl, { as: 'image' });
  }

  return (
    <Suspense
      fallback={
        // Fallback netral (tanpa ilustrasi Bagdja) — halaman bisa membawa
        // branding app lain, ilustrasi di sini akan tampil sesaat lalu berganti.
        <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-[var(--bg-main)]">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)]/90 via-[var(--bg-main)]/80 to-[var(--bg-main)]/90"></div>
          <div className="text-center relative z-10">
            <div className="mb-4 text-white">Loading...</div>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--action-primary)] border-r-transparent"></div>
          </div>
        </div>
      }
    >
      <LoginContent initialBranding={initialBranding} />
    </Suspense>
  );
}
