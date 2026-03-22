export interface LoginRequest {
  username: string; // Can be username or email
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  redirectUri?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface MeResponse {
  user: User;
  clientApp: {
    id: string;
    appId: string;
    appName: string;
  } | null;
}

export interface MessageResponse {
  message: string;
}

export interface ClientApp {
  id: string;
  appId: string;
  appName: string;
  organizationId?: string;
  isActive?: boolean;
  description?: string | null;
  contactEmail?: string | null;
  logo?: string | null;
  allowedOrigins?: string[] | null;
  ssoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastUsedAt?: string | null;
}

export interface ForgotPasswordRequest {
  email: string;
  redirectUri?: string;
}

export interface ValidateResetTokenRequest {
  token: string;
}

export interface ValidateResetTokenResponse {
  valid: boolean;
  expiresAt?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  authProvider?: string;
  profilePicture?: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface ClientTokenRequest {
  app_id: string;
  app_secret: string;
}

export interface ClientTokenResponse {
  'x-api-token': string;
  token_type: string;
  expires_in: number;
}
