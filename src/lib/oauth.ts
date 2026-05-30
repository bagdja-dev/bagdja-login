/**
 * OAuth 2.0 + PKCE utilities for authorization code flow
 * Used by both authorization server (bagdja-login) and client (bagdja-console)
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically random code verifier (43-128 characters)
 * RFC 7636 compliant
 */
export function generateCodeVerifier(): string {
  // Generate 32 random bytes and convert to base64url
  const bytes = crypto.randomBytes(32);
  return base64url(bytes);
}

/**
 * Generate code challenge from code verifier using SHA256
 * RFC 7636 S256 method (recommended over 'plain')
 */
export function generateCodeChallenge(codeVerifier: string): string {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return base64url(hash);
}

/**
 * Verify PKCE code challenge matches the verifier
 * Used by authorization server during token exchange
 */
export function verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
  const computed = generateCodeChallenge(codeVerifier);
  return computed === codeChallenge;
}

/**
 * Base64URL encode (RFC 4648 §5)
 */
function base64url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * State parameter data structure
 * Contains path and nonce for validation
 */
export interface StatePayload {
  path: string;
  nonce: string;
  iat: number; // issued at timestamp
}

/**
 * Generate encrypted state parameter
 * Contains original path + nonce + timestamp to prevent CSRF and enable dynamic redirect
 * 
 * @param path - Original path to redirect after auth (e.g. '/dashboard')
 * @param encryptionKey - 32-byte encryption key (base64url)
 * @param nonce - Optional nonce for validation
 */
export function generateState(
  path: string,
  encryptionKey: string,
  nonce?: string
): string {
  const payload: StatePayload = {
    path,
    nonce: nonce || crypto.randomBytes(16).toString('hex'),
    iat: Date.now(),
  };

  // Create IV (initialization vector) - 16 bytes for AES
  const iv = crypto.randomBytes(16);

  // Decode encryption key from base64url
  const key = Buffer.from(
    encryptionKey.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  );

  // Create cipher with AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  // Encrypt payload
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + encrypted data and encode to base64url
  const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]);
  return base64url(combined);
}

/**
 * Decrypt and validate state parameter
 * Returns decoded state payload if valid
 * 
 * @param state - Encrypted state parameter from OAuth callback
 * @param encryptionKey - Same 32-byte encryption key used during generation
 * @param maxAge - Max age in seconds (prevent replay attacks)
 */
export function decryptState(
  state: string,
  encryptionKey: string,
  maxAge: number = 600 // 10 minutes default
): StatePayload | null {
  try {
    // Decode from base64url
    const combined = Buffer.from(
      state.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );

    // Extract IV (first 16 bytes) + authTag (next 16 bytes) + encrypted (rest)
    const iv = combined.slice(0, 16);
    const authTag = combined.slice(16, 32);
    const encrypted = combined.slice(32);

    // Decode encryption key from base64url
    const key = Buffer.from(
      encryptionKey.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );

    // Create decipher with same parameters
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const payload = JSON.parse(decrypted) as StatePayload;

    // Validate payload structure
    if (!payload.path || !payload.nonce || !payload.iat) {
      return null;
    }

    // Check max age
    const age = (Date.now() - payload.iat) / 1000;
    if (age > maxAge) {
      return null;
    }

    return payload;
  } catch (error) {
    // Invalid state (tampering, corruption, or wrong key)
    return null;
  }
}

/**
 * Generate a secure encryption key (32 bytes for AES-256)
 * Used for encrypting state parameter
 */
export function generateEncryptionKey(): string {
  const bytes = crypto.randomBytes(32);
  return base64url(bytes);
}

/**
 * Validate code verifier format
 * RFC 7636: unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 * Length: 43-128 characters
 */
export function isValidCodeVerifier(verifier: string): boolean {
  if (!verifier || verifier.length < 43 || verifier.length > 128) {
    return false;
  }
  // Check if only contains unreserved characters
  return /^[A-Za-z0-9\-._~]+$/.test(verifier);
}

/**
 * Validate code challenge format
 * Should be base64url without padding, 43-128 characters
 */
export function isValidCodeChallenge(challenge: string): boolean {
  if (!challenge || challenge.length < 43 || challenge.length > 128) {
    return false;
  }
  // Base64url without padding
  return /^[A-Za-z0-9\-_]+$/.test(challenge);
}

/**
 * Check if string is valid base64url format
 */
export function isValidBase64url(str: string): boolean {
  if (!str) return false;
  try {
    // Try to decode - will throw if invalid
    Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    return /^[A-Za-z0-9\-_]*$/.test(str); // Also check characters
  } catch {
    return false;
  }
}
