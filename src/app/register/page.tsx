'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { register, getGoogleLoginUrl } from '@/lib/api';
import { getRedirectUrl, isValidRedirectUrl } from '@/lib/auth';
import { getLanguageFromUrl, getTranslations } from '@/lib/translations';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import type { ApiError } from '@/types';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = getLanguageFromUrl(searchParams);
  const t = getTranslations(lang);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    // Get redirect_url from query params
    const redirect = getRedirectUrl();
    if (redirect && isValidRedirectUrl(redirect)) {
      setRedirectUrl(redirect);
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const frontendBaseUrl = (process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin).replace(/\/$/, '');
      let redirectUri: string | undefined;
      try {
        const url = new URL(`${frontendBaseUrl}/register-success`);
        if (redirectUrl) {
          url.searchParams.set('redirect_url', redirectUrl);
        }
        url.searchParams.set('lang', lang);
        redirectUri = url.toString();
      } catch {
        // Fallback for unexpected invalid URL values
        redirectUri = `${frontendBaseUrl}/register-success?lang=${encodeURIComponent(lang)}${redirectUrl ? `&redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`;
      }

      const registerData = { 
        email, 
        username, 
        password,
        redirectUri,
      };
      
      await register(registerData);
      
      // Redirect to login with success message
      const loginUrl = redirectUrl 
        ? `/?registered=true&redirect_url=${encodeURIComponent(redirectUrl)}&lang=${lang}`
        : `/?registered=true&lang=${lang}`;
      router.push(loginUrl);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || t.register.registrationFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    const googleUrl = getGoogleLoginUrl(redirectUrl || undefined);
    window.location.href = googleUrl;
  };

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden px-4 py-12" style={{ backgroundImage: 'url(/ilustration.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      {/* Dark Overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)]/90 via-[var(--bg-main)]/80 to-[var(--bg-main)]/90"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1"></div>
              <div className="flex items-center justify-center flex-1">
                <Image
                  src="/logo.png"
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
              {t.register.title}
            </h1>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label={t.register.email}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="bg-white"
                />
                <Input
                  label={t.register.username}
                  type="text"
                  autoComplete="username"
                  required
                  minLength={3}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="bg-white"
                />
                <Input
                  label={t.register.password}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-white"
                />
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                    {loading ? t.register.creatingAccount : t.register.createAccount}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">{t.common.or}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border font-medium transition-all duration-200 hover:bg-gray-50"
                  style={{ 
                    borderColor: '#d1d5db', 
                    color: '#374151',
                    backgroundColor: 'transparent'
                  }}
                  onClick={handleGoogleSignup}
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" style={{ fill: '#374151' }}>
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {t.register.signUpWithGoogle}
                </Button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-center text-sm text-gray-600">
              {t.register.alreadyHaveAccount}{' '}
              <a href={`/${searchParams.toString() ? `?${searchParams.toString()}` : ''}`} className="text-[var(--action-primary)] hover:underline">
                {t.register.signIn}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
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
      <RegisterContent />
    </Suspense>
  );
}
