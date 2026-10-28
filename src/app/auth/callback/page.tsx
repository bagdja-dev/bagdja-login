import { Suspense } from 'react';
import { preload } from 'react-dom';
import { firstParam, getBrandingSource } from '@/lib/authorize-params';
import { getLoginBranding } from '@/lib/branding';
import { CallbackContent } from './callback-content';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Callback login (mis. setelah Google) — background ikut branding app
 * pemanggil (29 Okt 2026), di-resolve server-side dari `redirect_url`
 * (berisi /oauth/authorize?client_id=...&brand=...) seperti halaman login.
 */
export default async function AuthCallbackPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const source = getBrandingSource(firstParam(params.redirect_url));
  const branding = source ? await getLoginBranding(source.clientId, source.brand) : null;
  const backgroundUrl = branding?.backgroundUrl ?? null;

  if (backgroundUrl) {
    preload(backgroundUrl, { as: 'image', fetchPriority: 'high' });
  }

  return (
    <Suspense
      fallback={
        // Fallback netral — ilustrasi Bagdja di sini akan tampil sesaat lalu
        // berganti ke background app pemanggil.
        <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-[var(--bg-main)]">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)]/90 via-[var(--bg-main)]/80 to-[var(--bg-main)]/90"></div>
          <div className="text-center bg-white rounded-lg shadow-lg p-8 relative z-10">
            <div className="mb-4" style={{ color: '#666' }}>Loading...</div>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--action-primary)] border-r-transparent"></div>
          </div>
        </div>
      }
    >
      <CallbackContent backgroundUrl={backgroundUrl} />
    </Suspense>
  );
}
