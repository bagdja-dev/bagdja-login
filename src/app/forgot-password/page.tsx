'use client';

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { forgotPassword } from '@/lib/api';
import { getRedirectUrl, isValidRedirectUrl } from '@/lib/auth';
import { getLanguageFromUrl, getTranslations } from '@/lib/translations';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import type { ApiError } from '@/types';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const lang = getLanguageFromUrl(searchParams);
  const t = getTranslations(lang);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    const redirect = getRedirectUrl();
    if (redirect && isValidRedirectUrl(redirect)) {
      setRedirectUrl(redirect);
    }
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const base = `${window.location.origin}/reset-password`;
      const redirectUri = redirectUrl
        ? `${base}?redirect_url=${encodeURIComponent(redirectUrl)}&lang=${encodeURIComponent(lang)}`
        : `${base}?lang=${encodeURIComponent(lang)}`;

      const res = await forgotPassword({ email, redirectUri });
      setSuccess(res.message || 'If the email exists, reset instructions have been sent.');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to request reset email.');
    } finally {
      setLoading(false);
    }
  };

  const backToLoginHref = redirectUrl
    ? `/?redirect_url=${encodeURIComponent(redirectUrl)}&lang=${encodeURIComponent(lang)}`
    : `/?lang=${encodeURIComponent(lang)}`;

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
        <div className="bg-white rounded-lg shadow-lg overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1"></div>
              <div className="flex items-center justify-center flex-1">
                <Image
                  src="/logo bagdja.png"
                  alt="Bagdja Logo"
                  width={60}
                  height={60}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex-1 flex justify-end">
                <LanguageSwitcher />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center" style={{ color: '#1a1a1a' }}>
              {t.forgotPassword?.title || 'Forgot password'}
            </h1>
            <p className="text-sm text-center mt-1 font-medium" style={{ color: '#666' }}>
              {t.forgotPassword?.subtitle || 'We will email you a reset link.'}
            </p>
          </div>

          <div className="px-6 py-4">
            {success && (
              <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                {success}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={onSubmit}>
              <Input
                label={t.forgotPassword?.email || 'Email'}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="bg-white"
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? (t.forgotPassword?.sending || 'Sending...')
                  : (t.forgotPassword?.sendLink || 'Send reset link')}
              </Button>
            </form>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-center text-sm text-gray-600">
              <a
                href={backToLoginHref}
                className="text-[var(--action-primary)] hover:underline"
              >
                {t.forgotPassword?.backToLogin || 'Back to login'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center relative overflow-hidden"
          style={{
            backgroundImage: 'url(/ilustration.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)]/90 via-[var(--bg-main)]/80 to-[var(--bg-main)]/90"></div>
          <div className="text-center bg-white rounded-lg shadow-lg p-8 relative z-10">
            <div className="mb-4" style={{ color: '#666' }}>Loading...</div>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--action-primary)] border-r-transparent"></div>
          </div>
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}

