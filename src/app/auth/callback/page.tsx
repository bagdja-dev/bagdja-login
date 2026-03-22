'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getRedirectUrl, isValidRedirectUrl, buildRedirectUrl, setUserToken } from '@/lib/auth';
import { getLanguageFromUrl, getTranslations } from '@/lib/translations';
import { validateToken, refreshAccessToken } from '@/lib/api';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = getLanguageFromUrl(searchParams);
  const t = getTranslations(lang);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const redirectUrl = getRedirectUrl() || searchParams.get('redirect_url');

    if (token) {
      const validateAndRedirect = async () => {
        try {
          await validateToken(token);
          if (!redirectUrl || !isValidRedirectUrl(redirectUrl)) {
            setUserToken(token);
            router.push(`/logged-in?lang=${encodeURIComponent(lang)}`);
            return;
          }
          const finalUrl = buildRedirectUrl(redirectUrl, token);
          window.location.href = finalUrl;
        } catch (err: unknown) {
          // Try refresh path if validation failed
          try {
            const newToken = await refreshAccessToken(token);
            if (!redirectUrl || !isValidRedirectUrl(redirectUrl)) {
              setUserToken(newToken);
              router.push(`/logged-in?lang=${encodeURIComponent(lang)}`);
              return;
            }
            const finalUrl = buildRedirectUrl(redirectUrl, newToken);
            window.location.href = finalUrl;
          } catch (refreshErr) {
            console.error('Token refresh failed', refreshErr);
            setError(t.callback.sessionExpired);
          }
        }
      };
      validateAndRedirect();
    } else {
      setError(t.callback.noToken);
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center relative overflow-hidden px-4" style={{ backgroundImage: 'url(/ilustration.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)]/90 via-[var(--bg-main)]/80 to-[var(--bg-main)]/90"></div>
        <div className="w-full max-w-md space-y-4 text-center bg-white rounded-lg shadow-lg p-6 relative z-10">
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            {error}
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full rounded-lg bg-[var(--action-primary)] px-4 py-2 text-white hover:bg-[var(--action-primary-hover)]"
          >
            {t.callback.backToLogin}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden" style={{ backgroundImage: 'url(/ilustration.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)]/90 via-[var(--bg-main)]/80 to-[var(--bg-main)]/90"></div>
      <div className="text-center bg-white rounded-lg shadow-lg p-8 relative z-10">
        <div className="mb-4" style={{ color: '#666' }}>{t.callback.completingAuth}</div>
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--action-primary)] border-r-transparent"></div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center relative overflow-hidden" style={{ backgroundImage: 'url(/ilustration.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)]/90 via-[var(--bg-main)]/80 to-[var(--bg-main)]/90"></div>
          <div className="text-center bg-white rounded-lg shadow-lg p-8 relative z-10">
            <div className="mb-4" style={{ color: '#666' }}>Loading...</div>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--action-primary)] border-r-transparent"></div>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
