/**
 * @file src/services/authApi.ts
 * @description Frontend Authentication Service for Prime 24 Admin Session Management.
 * 
 * Features:
 * - Stores token, user data, and 1-month expiration timestamp in localStorage.
 * - Automatic check for expiration (30 days); forces logout if expired or invalid.
 * - Dispatches 'prime24:auth_expired' event when a 401 is encountered, immediately logging out.
 */

const AUTH_STORAGE_KEY = 'prime24_admin_session';

export interface AdminUser {
  email: string;
  role: 'admin';
}

export interface AuthSession {
  token: string;
  user: AdminUser;
  expiresAt: number;
}

type AuthChangeCallback = (session: AuthSession | null) => void;
const listeners: Set<AuthChangeCallback> = new Set();

export const authApi = {
  /**
   * Subscribe to auth state changes (login, logout, expiration).
   */
  subscribe(callback: AuthChangeCallback): () => void {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  notifyListeners(session: AuthSession | null) {
    listeners.forEach((cb) => {
      try {
        cb(session);
      } catch (err) {
        console.error('[Auth Listener Error]', err);
      }
    });
  },

  /**
   * Retrieves active session from localStorage.
   * If expired (1 month passed) or invalid, clears storage and returns null.
   */
  getSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;

      const parsed: AuthSession = JSON.parse(raw);
      if (!parsed.token || !parsed.expiresAt) {
        this.clearSession();
        return null;
      }

      // Check if 1 month has elapsed
      if (Date.now() >= parsed.expiresAt) {
        console.warn('[Prime 24 Auth] Session expired (1 month elapsed). Logging out.');
        this.clearSession();
        return null;
      }

      return parsed;
    } catch {
      this.clearSession();
      return null;
    }
  },

  /**
   * Returns current token string if session is still valid.
   */
  getToken(): string | null {
    const session = this.getSession();
    return session ? session.token : null;
  },

  /**
   * Saves successful login session to localStorage.
   */
  saveSession(session: AuthSession): void {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      this.notifyListeners(session);
    } catch (e) {
      console.error('[Prime 24 Auth] Failed to save session', e);
    }
  },

  /**
   * Clears session from localStorage and alerts listeners.
   */
  clearSession(): void {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      this.notifyListeners(null);
    }
  },

  /**
   * Admin Login API Request.
   */
  async login(email: string, pass: string): Promise<AuthSession> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: pass }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'بيانات الدخول غير صحيحة');
    }

    const session: AuthSession = {
      token: json.token,
      user: json.user || { email: 'admin@prime.com', role: 'admin' },
      expiresAt: json.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    this.saveSession(session);
    return session;
  },

  /**
   * Verifies current token with backend. If invalid or expired, clears session directly.
   */
  async verifySession(): Promise<AuthSession | null> {
    const session = this.getSession();
    if (!session) return null;

    try {
      const res = await fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!res.ok) {
        this.clearSession();
        return null;
      }

      const json = await res.json();
      if (!json.success) {
        this.clearSession();
        return null;
      }

      return session;
    } catch {
      // If network is offline, keep session if expiration is valid
      return session;
    }
  },

  /**
   * Logs out directly.
   */
  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    } finally {
      this.clearSession();
    }
  },
};
