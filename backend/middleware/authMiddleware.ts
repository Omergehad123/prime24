/**
 * @file backend/middleware/authMiddleware.ts
 * @description Express middleware to enforce admin authentication on API routes.
 */

import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../auth/authService.js';

export interface AuthenticatedRequest extends Request {
  adminUser?: TokenPayload;
}

export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Allow CORS preflight requests
  if (req.method === 'OPTIONS') {
    next();
    return;
  }

  // Allow public logo retrieval so PDF generation & public previews do not get blocked
  if (req.path === '/logo-base64') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'غير مصرح بالدخول: يرجى تسجيل الدخول أولاً',
      isAuthError: true,
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  const payload = authService.verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      message: 'الجلسة منتهية أو التوكن غير صالح: يرجى تسجيل الدخول مجدداً',
      isAuthError: true,
    });
    return;
  }

  req.adminUser = payload;
  next();
}
