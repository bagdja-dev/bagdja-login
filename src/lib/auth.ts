/**
 * Authentication token helpers
 * Handles token storage and retrieval
 * Note: This is a centralized login service, tokens are passed via redirect_url
 * We don't store tokens here, just pass them to the redirect URL
 */

const CLIENT_TOKEN_KEY = 'bagdja_client_token';
const CLIENT_TOKEN_EXPIRY_KEY = 'bagdja_client_token_expiry';
const USER_TOKEN_KEY = 'bagdja_user_token';

/**
 * Get redirect URL from query params or return default
 */
export function getRedirectUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect_url');
}

/**
 * Store client app token (x-api-token) in sessionStorage
 */
export function setClientToken(token: string, expiresIn: number): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(CLIENT_TOKEN_KEY, token);
    const expiryTime = Date.now() + expiresIn * 1000;
    sessionStorage.setItem(CLIENT_TOKEN_EXPIRY_KEY, expiryTime.toString());
  }
}

/**
 * Get client app token from storage
 */
export function getClientToken(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(CLIENT_TOKEN_KEY);
  }
  return null;
}

/**
 * Check if client token is expired or will expire soon (within 5 minutes)
 */
export function isClientTokenExpired(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  
  const expiryTimeStr = sessionStorage.getItem(CLIENT_TOKEN_EXPIRY_KEY);
  if (!expiryTimeStr) {
    return true;
  }
  
  const expiryTime = parseInt(expiryTimeStr, 10);
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
  
  return now >= (expiryTime - bufferTime);
}

/**
 * Remove client app token from storage
 */
export function removeClientToken(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(CLIENT_TOKEN_KEY);
    sessionStorage.removeItem(CLIENT_TOKEN_EXPIRY_KEY);
  }
}

/**
 * Store logged-in user JWT token in sessionStorage (only for this login UI flow).
 */
export function setUserToken(token: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(USER_TOKEN_KEY, token);
  }
}

/**
 * Get logged-in user JWT token from sessionStorage.
 */
export function getUserToken(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(USER_TOKEN_KEY);
  }
  return null;
}

export function removeUserToken(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(USER_TOKEN_KEY);
  }
}

/**
 * Validate redirect URL to prevent open redirect vulnerabilities
 */
export function isValidRedirectUrl(url: string | null): boolean {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return false;
  }
  
  try {
    const urlObj = new URL(url.trim());
    // Only allow http/https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }
    // Only allow bagdja.com subdomains or localhost for development
    const hostname = urlObj.hostname.toLowerCase();
    const isBagdjaDomain = hostname.endsWith('.bagdja.com') || hostname === 'bagdja.com';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    return isBagdjaDomain || isLocalhost;
  } catch {
    return false;
  }
}

/**
 * Build redirect URL with token
 * Preserves existing query params (like redirect_url)
 */
export function buildRedirectUrl(redirectUrl: string, token: string): string {
  try {
    const url = new URL(redirectUrl);
    // Set token, this will overwrite if token already exists
    url.searchParams.set('token', token);
    // All other query params (like redirect_url) are preserved
    return url.toString();
  } catch {
    // Fallback: append token as query param
    const separator = redirectUrl.includes('?') ? '&' : '?';
    return `${redirectUrl}${separator}token=${encodeURIComponent(token)}`;
  }
}
