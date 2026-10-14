/**
 * @file backend/routes/authRoutes.ts
 * @description Dedicated Admin Authentication Routes for Prime 24.
 * Endpoints:
 * - POST /api/auth/login : Admin-only login with 1-month token issuance.
 * - GET  /api/auth/verify: Validates token expiration & signature.
 * - POST /api/auth/logout: Logs out admin.
 */

import { Router, Request, Response } from 'express';
import { authService } from '../auth/authService.js';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
      });
      return;
    }

    // Validate against DB — bcrypt compare, no plaintext stored anywhere
    const adminUser = await authService.validateAdminCredentials(email, password);

    if (!adminUser) {
      res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      });
      return;
    }

    const session = authService.generateAdminToken(adminUser.email);

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح كمدير للنظام',
      token: session.token,
      expiresAt: session.expiresAt,
      user: session.user,
    });
  } catch (error: any) {
    console.error('[Auth Login Error]', error?.message, error?.stack);
    res.status(500).json({
      success: false,
      message: error?.message || 'حدث خطأ في الخادم أثناء تسجيل الدخول',
    });
  }
});

/**
 * GET /api/auth/verify
 * Validates current session token
 */
authRouter.get('/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'غير مسجل الدخول',
      isAuthError: true,
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  const payload = authService.verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      message: 'انتهت صلاحية الجلسة أو التوكن غير صالح، يرجى تسجيل الدخول مجدداً',
      isAuthError: true,
    });
    return;
  }

  res.json({
    success: true,
    user: {
      email: payload.email,
      role: payload.role,
    },
    expiresAt: payload.exp,
  });
});

/**
 * POST /api/auth/logout
 */
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'تم تسجيل الخروج بنجاح',
  });
});
