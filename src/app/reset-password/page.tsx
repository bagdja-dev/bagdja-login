'use client';

import { useEffect, useMemo, useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { resetPassword, validateResetToken } from '@/lib/api';
import { getRedirectUrl, isValidRedirectUrl } from '@/lib/auth';
import { getLanguageFromUrl, getTranslations } from '@/lib/translations';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import type { ApiError } from '@/types';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = getLanguageFromUrl(searchParams);
  const t = getTranslations(lang);

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    const redirect = getRedirectUrl() || searchParams.get('redirect_url');
    if (redirect && isValidRedirectUrl(redirect)) {
      setRedirectUrl(redirect);
    }
  }, [searchParams]);

  useEffect(() => {
    const check = async () => {
      setError('');
      setSuccess('');

      if (!token) {
        setTokenValid(false);
        setChecking(false);
        return;
      }

      setChecking(true);
      try {
        const res = await validateResetToken({ token });
        setTokenValid(Boolean(res.valid));
      } catch {
        setTokenValid(false);
      } finally {
        setChecking(false);
      }
    };

    check();
  }, [token]);

  const backToLoginHref = redirectUrl
    ? `/?redirect_url=${encodeURIComponent(redirectUrl)}&lang=${encodeURIComponent(lang)}`
    : `/?lang=${encodeURIComponent(lang)}`;

  const forgotHref = redirectUrl
    ? `/forgot-password?redirect_url=${encodeURIComponent(redirectUrl)}&lang=${encodeURIComponent(lang)}`
    : `/forgot-password?lang=${encodeURIComponent(lang)}`;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError(t.resetPassword?.missingToken || 'Missing reset token.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError(t.resetPassword?.mismatch || 'Password confirmation does not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ token, newPassword });
      setSuccess(res.message || (t.resetPassword?.success || 'Password updated successfully.'));

      // Redirect back to login so user can sign in and continue the OAuth flow.
      const url = new URL(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
      url.pathname = '/';
      url.searchParams.set('reset', 'true');
      if (redirectUrl) url.searchParams.set('redirect_url', redirectUrl);
      url.searchParams.set('lang', lang);

      setTimeout(() => {
        router.push(url.pathname + '?' + url.searchParams.toString());
      }, 800);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || (t.resetPassword?.failed || 'Failed to reset password.'));
    } finally {
      setLoading(false);
    }
  };

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
              {t.resetPassword?.title || 'Reset password'}
            </h1>
            <p className="text-sm text-center mt-1 font-medium" style={{ color: '#666' }}>
              {t.resetPassword?.subtitle || 'Set a new password for your account.'}
            </p>
          </div>

          <div className="px-6 py-4">
            {checking ? (
              <div className="text-sm text-center text-gray-600">
                {t.common.loading}
              </div>
            ) : tokenValid === false ? (
              <div className="rounded-md bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
                {t.resetPassword?.invalidOrExpired || 'This reset link is invalid or expired.'}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <a href={forgotHref} className="text-[var(--action-primary)] hover:underline">
                    {t.resetPassword?.requestNew || 'Request new link'}
                  </a>
                  <a href={backToLoginHref} className="text-[var(--action-primary)] hover:underline">
                    {t.resetPassword?.backToLogin || 'Back to login'}
                  </a>
                </div>
              </div>
            ) : (
              <>
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
                    label={t.resetPassword?.newPassword || 'New password'}
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    className="bg-white"
                  />
                  <Input
                    label={t.resetPassword?.confirmNewPassword || 'Confirm new password'}
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={loading}
                    className="bg-white"
                  />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading
                      ? (t.resetPassword?.updating || 'Updating...')
                      : (t.resetPassword?.update || 'Update password')}
                  </Button>

                  <div className="text-center text-sm text-gray-600">
                    <a href={backToLoginHref} className="text-[var(--action-primary)] hover:underline">
                      {t.resetPassword?.backToLogin || 'Back to login'}
                    </a>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}

