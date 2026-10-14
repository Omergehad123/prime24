/**
 * @file backend/auth/authService.ts
 * @description Secure Authentication Service for Prime 24 Admin Login.
 *
 * Rules:
 * - Admin credentials are stored in MongoDB Atlas (hashed with bcrypt, 12 rounds).
 * - NO credentials in source code — zero hardcoded emails or passwords.
 * - Token lifespan: 1 month (30 days), cryptographically signed with HMAC-SHA256.
 * - Automatic expiration check & tamper-proof signature verification.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AdminUserModel } from '../models/AdminUser.js';

export const TOKEN_LIFESPAN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Gets the signing secret lazily — evaluated at call time so dotenv has already loaded.
 */
function getJwtSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      '[Prime 24 Auth] AUTH_SECRET env variable is required but missing. Set it in your .env file.'
    );
  }
  return secret;
}

export interface TokenPayload {
  email: string;
  role: 'admin';
  iat: number;
  exp: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
}

export const authService = {
  /**
   * Looks up admin by email in MongoDB and verifies password with bcrypt.
   * Returns the admin user document if valid, null otherwise.
   */
  async validateAdminCredentials(
    email: string,
    password: string
  ): Promise<{ email: string; role: 'admin' } | null> {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) return null;

    const admin = await AdminUserModel.findOne({ email: normalizedEmail });
    if (!admin) return null;

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) return null;

    return { email: admin.email, role: 'admin' };
  },

  /**
   * Generates a tamper-proof signed token valid for 1 month.
   */
  generateAdminToken(
    email: string
  ): { token: string; expiresAt: number; user: { email: string; role: 'admin' } } {
    const now = Date.now();
    const expiresAt = now + TOKEN_LIFESPAN_MS;

    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload: TokenPayload = { email, role: 'admin', iat: now, exp: expiresAt };
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));

    const signature = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${header}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return {
      token: `${header}.${encodedPayload}.${signature}`,
      expiresAt,
      user: { email, role: 'admin' },
    };
  },

  /**
   * Verifies the token signature and expiration.
   * Returns TokenPayload if valid, null if tampered or expired.
   */
  verifyToken(token: string | undefined): TokenPayload | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;

    const expectedSig = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${header}.${payload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (
      signature.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      return null;
    }

    try {
      const parsed: TokenPayload = JSON.parse(base64UrlDecode(payload));

      if (!parsed.exp || Date.now() > parsed.exp) return null;
      if (parsed.role !== 'admin') return null;

      return parsed;
    } catch {
      return null;
    }
  },
};
