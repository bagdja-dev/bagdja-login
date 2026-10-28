import type { LoginBranding } from '@/types';

/**
 * Branding halaman login per client app (28 Okt 2026) — SERVER ONLY.
 * Dipakai `app/page.tsx` (SSR, 29 Okt 2026) dan `app/api/branding/route.ts`.
 *
 * Lapis 1: `logo` + `loginBackgroundUrl` milik client app (diatur di console).
 * Lapis 2: kalau `brand` ada DAN client app punya `brandingUrl` (template
 * berisi `{brand}`), URL itu dipanggil server-side dan hasilnya meng-override
 * lapis 1. URL yang dipanggil HANYA dari `brandingUrl` terdaftar, tidak
 * pernah dari query string — `brand` cuma slug yang disaring ketat.
 * Gagal di lapis mana pun = field-nya null, halaman memakai default Bagdja.
 */
const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';

const CLIENT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;
const BRAND_PATTERN = /^[a-z0-9-]{1,63}$/;
const BRANDING_FETCH_TIMEOUT_MS = 2000;
export const REVALIDATE_SECONDS = 300;
const MAX_NAME_LENGTH = 80;

interface PublicClientApp {
  appName?: string;
  logo?: string | null;
  loginBackgroundUrl?: string | null;
  brandingUrl?: string | null;
}

interface BrandResponse {
  name?: unknown;
  logoUrl?: unknown;
  backgroundUrl?: unknown;
}

export const EMPTY_LOGIN_BRANDING: LoginBranding = { name: null, logoUrl: null, backgroundUrl: null };

function httpsUrlOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function nameOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name && name.length <= MAX_NAME_LENGTH ? name : null;
}

async function fetchClient(clientId: string): Promise<PublicClientApp | null> {
  try {
    const res = await fetch(`${AUTH_API_BASE}/auth/client/public/${encodeURIComponent(clientId)}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicClientApp;
  } catch {
    return null;
  }
}

async function fetchBrand(template: string, brand: string): Promise<LoginBranding | null> {
  const url = httpsUrlOrNull(template.split('{brand}').join(encodeURIComponent(brand)));
  if (!url) return null;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(BRANDING_FETCH_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as BrandResponse;
    return {
      name: nameOrNull(data.name),
      logoUrl: httpsUrlOrNull(data.logoUrl),
      backgroundUrl: httpsUrlOrNull(data.backgroundUrl),
    };
  } catch {
    return null;
  }
}

/** Branding gabungan client app + brand; selalu resolve (gagal = field null). */
export async function getLoginBranding(clientId: string, brand?: string | null): Promise<LoginBranding> {
  if (!CLIENT_ID_PATTERN.test(clientId)) {
    return EMPTY_LOGIN_BRANDING;
  }

  const client = await fetchClient(clientId);
  if (!client) {
    return EMPTY_LOGIN_BRANDING;
  }

  const branding: LoginBranding = {
    name: nameOrNull(client.appName),
    logoUrl: httpsUrlOrNull(client.logo),
    backgroundUrl: httpsUrlOrNull(client.loginBackgroundUrl),
  };

  const brandSlug = brand?.toLowerCase() ?? '';
  if (brandSlug && BRAND_PATTERN.test(brandSlug) && client.brandingUrl) {
    const brandBranding = await fetchBrand(client.brandingUrl, brandSlug);
    if (brandBranding) {
      branding.name = brandBranding.name ?? branding.name;
      branding.logoUrl = brandBranding.logoUrl ?? branding.logoUrl;
      branding.backgroundUrl = brandBranding.backgroundUrl ?? branding.backgroundUrl;
    }
  }

  return branding;
}
