'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLanguageFromUrl, getTranslations } from '@/lib/translations';
import { getRedirectUrl, isValidRedirectUrl } from '@/lib/auth';

function RegisterSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = getLanguageFromUrl(searchParams);
  const t = getTranslations(lang);
  const [countdown, setCountdown] = useState(3);

  const redirectUrl = useMemo(() => {
    const redirect = getRedirectUrl() || searchParams.get('redirect_url');
    return isValidRedirectUrl(redirect) ? redirect : null;
  }, [searchParams]);

  const loginUrl = useMemo(() => {
    const base = '/';
    const params = new URLSearchParams();
    params.set('verified', 'true');
    params.set('lang', lang);
    if (redirectUrl) {
      params.set('redirect_url', redirectUrl);
    }
    return `${base}?${params.toString()}`;
  }, [lang, redirectUrl]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      router.push(loginUrl);
    }
  }, [countdown, loginUrl, router]);

  return (
    <div
      className="flex min-h-screen items-center justify-center relative overflow-hidden px-4 py-12"
      style={{
        backgroundImage: 'url(/ilustration.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)]/90 via-[var(--bg-main)]/80 to-[var(--bg-main)]/90"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden p-6 text-center space-y-4">
          <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
            {t.login.verified}
          </div>

          <div className="text-sm text-gray-600">
            Redirecting to login in <span className="font-semibold">{countdown}</span>s…
          </div>

          <button
            onClick={() => router.push(loginUrl)}
            className="w-full rounded-lg bg-[var(--action-primary)] px-4 py-2 text-white hover:bg-[var(--action-primary-hover)]"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RegisterSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center relative overflow-hidden px-4"
          style={{
            backgroundImage: 'url(/ilustration.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)]/90 via-[var(--bg-main)]/80 to-[var(--bg-main)]/90"></div>
          <div className="text-center bg-white rounded-lg shadow-lg p-8 relative z-10">
            <div className="mb-4" style={{ color: '#666' }}>
              Loading...
            </div>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--action-primary)] border-r-transparent"></div>
          </div>
        </div>
      }
    >
      <RegisterSuccessContent />
    </Suspense>
  );
}

