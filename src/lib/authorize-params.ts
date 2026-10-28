import { isValidRedirectUrl } from '@/lib/auth';

/**
 * Query string dari `authorize_redirect` ("/oauth/authorize?client_id=...&brand=...")
 * atau `redirect_url` biasa — sumber `client_id` & `brand` untuk branding.
 * Dipakai di server (page.tsx) maupun client (login-content.tsx).
 */
export function getAuthorizeParams(redirectUrl: string | null): URLSearchParams | null {
  if (!redirectUrl) return null;
  const query = redirectUrl.includes('?') ? redirectUrl.split('?')[1] : redirectUrl;
  return new URLSearchParams(query);
}

/** `client_id` & `brand` dari redirect mentah; null kalau redirect tidak valid. */
export function getBrandingSource(rawRedirect: string | null): { clientId: string; brand: string | null } | null {
  if (!isValidRedirectUrl(rawRedirect)) return null;
  const params = getAuthorizeParams(rawRedirect);
  const clientId = params?.get('client_id');
  if (!clientId) return null;
  return { clientId, brand: params?.get('brand') ?? null };
}
