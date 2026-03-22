'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { login, getGoogleLoginUrl } from '@/lib/api';
import { getRedirectUrl, isValidRedirectUrl, buildRedirectUrl, setUserToken } from '@/lib/auth';
import { getLanguageFromUrl, getTranslations } from '@/lib/translations';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import type { ApiError } from '@/types';

interface SavedAccount {
  email: string;
  username?: string;
  profilePicture?: string;
  lastLogin?: string;
  token?: string;
  tokenExpiry?: number; // timestamp in milliseconds
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = getLanguageFromUrl(searchParams);
  const t = getTranslations(lang);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    // Get redirect_url from query params
    const redirect = getRedirectUrl();
    if (redirect && isValidRedirectUrl(redirect)) {
      setRedirectUrl(redirect);
    }

    // Check for success messages from query params
    const registered = searchParams.get('registered');
    const verified = searchParams.get('verified');
    const reset = searchParams.get('reset');
    
    if (registered === 'true') {
      setSuccess(t.login.registered);
    } else if (verified === 'true') {
      setSuccess(t.login.verified);
    } else if (reset === 'true') {
      setSuccess(t.login.resetSuccess);
    }

    // Load saved accounts from localStorage
    try {
      const saved = localStorage.getItem('bagdja_saved_accounts');
      if (saved) {
        const accounts = JSON.parse(saved) as SavedAccount[];
        setSavedAccounts(accounts);
      }
    } catch {
      // Ignore errors
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ username, password });
      
      // Save account to localStorage with token
      try {
        const saved = localStorage.getItem('bagdja_saved_accounts');
        const accounts: SavedAccount[] = saved ? JSON.parse(saved) : [];
        const accountIndex = accounts.findIndex(acc => acc.email === response.user.email);
        
        // Calculate token expiry (assuming 24 hours, adjust based on your token expiry)
        const tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
        
        const accountData: SavedAccount = {
          email: response.user.email,
          username: response.user.username,
          profilePicture: response.user.profilePicture,
          lastLogin: new Date().toISOString(),
          token: response.access_token,
          tokenExpiry: tokenExpiry,
        };
        
        if (accountIndex >= 0) {
          // Update existing account
          accounts[accountIndex] = accountData;
        } else {
          // Add new account
          accounts.unshift(accountData);
        }
        
        // Keep only last 5 accounts
        const limitedAccounts = accounts.slice(0, 5);
        localStorage.setItem('bagdja_saved_accounts', JSON.stringify(limitedAccounts));
      } catch {
        // Ignore errors
      }

      // Redirect to redirect_url with token
      if (redirectUrl) {
        const finalUrl = buildRedirectUrl(redirectUrl, response.access_token);
        window.location.href = finalUrl;
      } else {
        setUserToken(response.access_token);
        router.push(`/logged-in?lang=${encodeURIComponent(lang)}`);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || t.login.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = async (account: SavedAccount) => {
    // Check if account has valid token
    if (account.token && account.tokenExpiry && account.tokenExpiry > Date.now()) {
      // Token is still valid, redirect immediately
      if (redirectUrl) {
        const finalUrl = buildRedirectUrl(redirectUrl, account.token);
        window.location.href = finalUrl;
        return;
      } else {
        setUserToken(account.token);
        router.push(`/logged-in?lang=${encodeURIComponent(lang)}`);
        return;
      }
    }
    
    // Token expired or doesn't exist, show form to enter password
    setUsername(account.email);
    setShowForm(true);
  };

  const handleGoogleLogin = () => {
    const googleUrl = getGoogleLoginUrl(redirectUrl || undefined);
    window.location.href = googleUrl;
  };

  const handleUseAnotherAccount = () => {
    setShowForm(true);
    setUsername('');
  };

  const handleLogout = (e: React.MouseEvent, account: SavedAccount) => {
    e.stopPropagation(); // Prevent triggering handleSelectAccount
    
    try {
      const saved = localStorage.getItem('bagdja_saved_accounts');
      if (saved) {
        const accounts: SavedAccount[] = JSON.parse(saved);
        // Remove account from list
        const filteredAccounts = accounts.filter(acc => acc.email !== account.email);
        localStorage.setItem('bagdja_saved_accounts', JSON.stringify(filteredAccounts));
        // Update state
        setSavedAccounts(filteredAccounts);
      }
    } catch {
      // Ignore errors
    }
  };

  // Get app name from redirect URL
  const getAppName = () => {
    if (!redirectUrl) return 'Bagdja';
    try {
      const url = new URL(redirectUrl);
      const hostname = url.hostname;
      if (hostname.includes('console')) return 'Bagdja Console';
      if (hostname.includes('store')) return 'Bagdja Store';
      return 'Bagdja';
    } catch {
      return 'Bagdja';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden px-4 py-12" style={{ backgroundImage: 'url(/ilustration.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      {/* Dark Overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)]/90 via-[var(--bg-main)]/80 to-[var(--bg-main)]/90"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Google-like Modal Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden animate-fade-in">
          {/* Header */}
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
              {t.login.title}
            </h1>
            <p className="text-sm text-center mt-1 font-medium" style={{ color: '#666' }}>
              {t.login.subtitle} {getAppName()}
            </p>
          </div>

          {/* Content */}
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

            {!showForm && savedAccounts.length > 0 ? (
              /* Account Picker - Google-like */
              <div className="space-y-2">
                {savedAccounts.map((account, index) => (
                  <div
                    key={index}
                    className="w-full flex items-center px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors group"
                  >
                    <button
                      onClick={() => handleSelectAccount(account)}
                      className="flex items-center flex-1 min-w-0 text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-[var(--action-primary)] flex items-center justify-center mr-3 flex-shrink-0">
                        {account.profilePicture ? (
                          <img
                            src={account.profilePicture}
                            alt={account.email}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-medium">
                            {account.email.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {account.username || account.email}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {account.email}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleLogout(e, account)}
                      className="ml-2 p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Logout"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                  </div>
                ))}

                <div className="pt-2">
                  <button
                    onClick={handleUseAnotherAccount}
                    className="w-full flex items-center justify-center px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t.login.useAnotherAccount}
                  </button>
                </div>
              </div>
            ) : (
              /* Login Form */
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <Input
                    label={t.login.usernameOrEmail}
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="bg-white"
                  />
                  <Input
                    label={t.login.password}
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="bg-white"
                  />
                  <div className="text-right">
                    <a
                      href={`/forgot-password${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
                      className="text-sm text-[var(--action-primary)] hover:underline"
                    >
                      {t.login.forgotPassword}
                    </a>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? t.login.signingIn : t.login.next}
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
                    onClick={handleGoogleLogin}
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
                    {t.login.signInWithGoogle}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex space-x-4">
                <a href="#" className="hover:underline">{t.login.help}</a>
                <a href="#" className="hover:underline">{t.login.privacy}</a>
                <a href="#" className="hover:underline">{t.login.terms}</a>
              </div>
              <div>
                <a href={`/register${searchParams.toString() ? `?${searchParams.toString()}` : ''}`} className="text-[var(--action-primary)] hover:underline">
                  {t.login.createAccount}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center relative overflow-hidden" style={{ backgroundImage: 'url(/ilustration.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bg-main)]/90 via-[var(--bg-main)]/80 to-[var(--bg-main)]/90"></div>
          <div className="text-center relative z-10">
            <div className="mb-4 text-white">Loading...</div>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--action-primary)] border-r-transparent"></div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
