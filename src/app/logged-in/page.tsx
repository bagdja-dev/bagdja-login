'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getLanguageFromUrl, getTranslations } from '@/lib/translations';
import { getUserToken, removeUserToken } from '@/lib/auth';
import { getMe, getOrganizationClientAppsPublic } from '@/lib/api';
import type { ClientApp, MeResponse } from '@/types';

const LANDING_ORG_ID = '70e5e0a0-8f06-45c1-992c-aa13cc5e6814';

function buildSsoUrl(ssoUrl: string, token: string): string {
  if (ssoUrl.includes('{token}')) {
    return ssoUrl.replaceAll('{token}', encodeURIComponent(token));
  }
  try {
    const url = new URL(ssoUrl);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    const separator = ssoUrl.includes('?') ? '&' : '?';
    return `${ssoUrl}${separator}token=${encodeURIComponent(token)}`;
  }
}

function LoggedInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = getLanguageFromUrl(searchParams);
  const t = getTranslations(lang);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [apps, setApps] = useState<ClientApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => getUserToken(), []);

  useEffect(() => {
    if (!token) {
      router.push(`/?lang=${encodeURIComponent(lang)}`);
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        const meRes = await getMe(token);
        setMe(meRes);

        const list = await getOrganizationClientAppsPublic(LANDING_ORG_ID, token);
        setApps(list.filter((a) => a.isActive !== false));
      } catch (e: unknown) {
        const message = e && typeof e === 'object' && 'message' in e ? String((e as any).message) : 'Failed to load apps';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [lang, router, token]);

  const handleOpenApp = (app: ClientApp) => {
    if (!token) return;
    if (!app.ssoUrl || typeof app.ssoUrl !== 'string' || app.ssoUrl.trim().length === 0) {
      return;
    }
    window.location.href = buildSsoUrl(app.ssoUrl, token);
  };

  const handleLogout = () => {
    removeUserToken();
    router.push(`/?lang=${encodeURIComponent(lang)}`);
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

      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Image src="/logo bagdja.png" alt="Bagdja Logo" width={44} height={44} className="object-contain" />
              <div className="min-w-0">
                <div className="text-lg font-semibold text-gray-900 truncate">
                  Welcome{me?.user?.email ? `, ${me.user.email}` : ''}!
                </div>
                <div className="text-sm text-gray-600">
                  You are logged in. Choose an app to continue.
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-6 text-center">
              <div className="mb-4" style={{ color: '#666' }}>
                {t.common.loading}
              </div>
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--action-primary)] border-r-transparent"></div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {apps.map((app) => {
                const disabled = !app.ssoUrl;
                return (
                  <button
                    key={app.id}
                    onClick={() => handleOpenApp(app)}
                    disabled={disabled}
                    className={`w-full text-left rounded-xl border p-4 transition ${
                      disabled
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 hover:border-[var(--action-primary)] hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[var(--action-primary)]/10 flex items-center justify-center overflow-hidden">
                        {app.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={app.logo} alt={app.appName} className="h-10 w-10 object-cover" />
                        ) : (
                          <span className="text-[var(--action-primary)] font-semibold">
                            {app.appName?.charAt(0)?.toUpperCase() || 'A'}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{app.appName}</div>
                        {app.description ? (
                          <div className="text-sm text-gray-600 truncate">{app.description}</div>
                        ) : (
                          <div className="text-sm text-gray-600 truncate">{app.appId}</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoggedInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center relative overflow-hidden px-4">
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
      <LoggedInContent />
    </Suspense>
  );
}

