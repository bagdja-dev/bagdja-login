/**
 * Auth Service API Client
 * Simplified version for centralized login service
 */

import { 
  getClientToken,
  setClientToken,
  removeClientToken,
  isClientTokenExpired,
} from './auth';
import type { 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  User, 
  ApiError,
  MeResponse,
  ClientApp,
  ClientTokenRequest,
  ClientTokenResponse,
  ForgotPasswordRequest,
  MessageResponse,
  ResetPasswordRequest,
  ValidateResetTokenRequest,
  ValidateResetTokenResponse,
} from '@/types';

const AUTH_API_BASE = process.env.NEXT_PUBLIC_AUTH_API || 'https://auth.bagdja.com';

/**
 * Get or refresh client app token (x-api-token)
 */
async function ensureClientToken(): Promise<string> {
  let clientToken = getClientToken();
  
  if (!clientToken || isClientTokenExpired()) {
    clientToken = await getClientTokenFromServer();
  }
  
  return clientToken;
}

/**
 * Get client token from server
 */
async function getClientTokenFromServer(): Promise<string> {
  const isServer = typeof window === 'undefined';
  const frontendBase =
    process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';

  const response = await fetch(isServer ? `${frontendBase}/api/client-token` : '/api/client-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error: ApiError = {
      message: 'Failed to obtain client app token',
      statusCode: response.status,
    };

    try {
      const data = await response.json();
      error.message = data.message || data.error || error.message;
    } catch {
      error.message = response.statusText || error.message;
    }

    throw error;
  }

  const data: ClientTokenResponse = await response.json();
  setClientToken(data['x-api-token'], data.expires_in);
  
  return data['x-api-token'];
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const clientToken = await ensureClientToken();
  
  const url = `${AUTH_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-token': clientToken,
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error: ApiError = {
      message: 'An error occurred',
      statusCode: response.status,
    };

    try {
      const data = await response.json();
      error.message = data.message || data.error || error.message;
    } catch {
      error.message = response.statusText || error.message;
    }

    throw error;
  }

  return response.json();
}

/**
 * Login user
 */
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * Register new user
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const cleanData: RegisterRequest = {
    email: data.email,
    username: data.username,
    password: data.password,
  };
  
  if (data.redirectUri && typeof data.redirectUri === 'string' && data.redirectUri.trim().length > 0) {
    cleanData.redirectUri = data.redirectUri;
  }
  
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(cleanData),
  });
}

/**
 * Get Google OAuth login URL with redirect_uri
 */
export function getGoogleLoginUrl(redirectUrl?: string): string {
  const callbackUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/callback${redirectUrl ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`
    : 'http://localhost:3000/auth/callback';
  
  const redirectUri = encodeURIComponent(callbackUrl);
  return `${AUTH_API_BASE}/auth/google?redirect_uri=${redirectUri}`;
}

export async function validateToken(token: string): Promise<void> {
  await apiRequest('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getMe(token: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getOrganizationClientApps(
  organizationId: string,
  token: string,
): Promise<ClientApp[]> {
  const params = new URLSearchParams({ organizationId });
  return apiRequest<ClientApp[]>(`/auth/client-apps?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getOrganizationClientAppsPublic(
  organizationId: string,
  token: string,
): Promise<ClientApp[]> {
  const params = new URLSearchParams({ organizationId });
  return apiRequest<ClientApp[]>(
    `/auth/client-apps/public?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export async function refreshAccessToken(token: string): Promise<string> {
  const result = await apiRequest<{ access_token: string }>('/auth/refresh', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!result.access_token) {
    throw new Error('Refresh failed');
  }

  return result.access_token;
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function validateResetToken(data: ValidateResetTokenRequest): Promise<ValidateResetTokenResponse> {
  return apiRequest<ValidateResetTokenResponse>('/auth/reset-password/validate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resetPassword(data: ResetPasswordRequest): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
