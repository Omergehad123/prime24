/**
 * @file src/pages/LoginPage.tsx
 * @description Modern, secure, and branded Admin-Only Login Page for Prime 24.
 * 
 * Requirements satisfied:
 * - Admin credentials: email: admin@prime.com / password: Prime24#admin
 * - No sign-up interface (Admin only).
 * - Issues token with 1-month lifespan (30 days).
 * - Automatic logout if token expires or is invalid.
 */

import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';
import { authApi, AuthSession } from '../services/authApi';
import { BRAND_LOGO_URL } from '../types/invoice';

interface LoginPageProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@prime.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await authApi.login(email, password);
      onLoginSuccess(session);
    } catch (err: any) {
      setErrorMessage(err?.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative overflow-hidden"
    >
      {/* Ambient background glow effects */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md z-10">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl transition-all">
          
          {/* Brand Header */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center mb-4">
              {!logoError ? (
                <img
                  src={BRAND_LOGO_URL}
                  alt="Prime 24"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700/60 shadow-lg shadow-black/40"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white flex items-center justify-center font-bold text-2xl font-mono border-2 border-slate-600 shadow-lg">
                  P24
                </div>
              )}
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>لوحة الإدارة المخصصة (Admin Only)</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              Prime 24
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              نظام الفواتير المخصص · شبك & بلاك أوت
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                البريد الإلكتروني للمدير:
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoFocus
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@prime.com"
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-slate-300"
                >
                  كلمة المرور:
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md shadow-white/5 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول للنظام</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Session Duration Information Badge */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                صلاحية الجلسة: <strong className="text-slate-200">شهر كامل (30 يوماً)</strong> مع تسجيل الخروج التلقائي عند انتهائها.
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              النظام محمي ومخصص فقط للمدير المصرح له
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-slate-500 mt-4">
          Prime 24 Invoice Management System · جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
};
