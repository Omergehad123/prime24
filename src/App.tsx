/**
 * @file src/App.tsx
 * @description Root Application Component for Prime 24 Invoice System with Admin Authentication.
 * 
 * Rules & Features:
 * - Admin Only Login: email: admin@prime.com / password: Prime24#admin
 * - No sign-up interface.
 * - Saves session for 1 month (30 days); automatic expiration check.
 * - If unauthenticated or token is invalid, logs out directly.
 * - Separates screen workspace from isolated printable A4 Invoice sheet.
 */

import { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { InvoiceEditorPage } from './pages/InvoiceEditorPage';
import { ArchiveDashboardPage } from './pages/ArchiveDashboardPage';
import { PrintInvoiceModal } from './components/PrintInvoiceModal';
import { LoginPage } from './pages/LoginPage';
import { Invoice, BRAND_LOGO_URL } from './types/invoice';
import { authApi, AuthSession } from './services/authApi';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => authApi.getSession());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('archive');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  // Subscribe to auth session changes (login, logout, expiration) and verify token
  useEffect(() => {
    // Check initial validity
    const initialSession = authApi.getSession();
    if (!initialSession) {
      setSession(null);
      setIsCheckingAuth(false);
      return;
    }

    // Verify token with backend
    authApi.verifySession().then((verified) => {
      setSession(verified);
      setIsCheckingAuth(false);
    });

    // Listen for logout or session changes triggered by 401s or user action
    const unsubscribe = authApi.subscribe((updatedSession) => {
      setSession(updatedSession);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleStartNewInvoice = () => {
    setEditingInvoice(null);
    setActiveTab('editor');
  };

  const handleEditFromArchive = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setActiveTab('editor');
  };

  const handleSavedSuccess = (_saved: Invoice) => {
    setEditingInvoice(null);
    setActiveTab('archive');
  };

  const handleLogout = async () => {
    await authApi.logout();
    setSession(null);
  };

  // While checking initial stored token on app boot
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium">جاري التحقق من الجلسة...</span>
      </div>
    );
  }

  // If not authenticated, show Admin Login only (no sign-up)
  if (!session) {
    return <LoginPage onLoginSuccess={(newSession) => setSession(newSession)} />;
  }

  // Authenticated Admin Workspace
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Screen Workspace (Automatically hidden during A4 printing) */}
      <div className="screen-workspace no-print min-h-screen flex flex-col">
        <Navbar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onNewInvoice={handleStartNewInvoice}
          isEditingExisting={!!editingInvoice}
          onLogout={handleLogout}
          adminEmail={session.user.email}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">
          {activeTab === 'editor' && (
            <InvoiceEditorPage
              editingInvoice={editingInvoice}
              onSavedSuccess={handleSavedSuccess}
              onOpenPrintModal={(inv) => setPrintingInvoice(inv)}
              onClearEditing={() => setEditingInvoice(null)}
            />
          )}

          {activeTab === 'archive' && (
            <ArchiveDashboardPage
              onEditInvoice={handleEditFromArchive}
              onPrintInvoice={(inv) => setPrintingInvoice(inv)}
              onCreateNew={handleStartNewInvoice}
            />
          )}
        </main>

        <footer className="border-t border-slate-200 bg-white py-4 px-6 mt-12">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <img
                src={BRAND_LOGO_URL}
                alt="Prime 24"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
                className="w-5 h-5 rounded object-cover"
              />
              <span>Prime 24 — نظام الفواتير (شبك & بلاك أوت)</span>
            </div>
            <span>لوحة تحكم المدير · استخراج PDF وطباعة الفاتورة</span>
          </div>
        </footer>
      </div>

      {/* Isolated A4 Print & Direct PDF Export Modal */}
      <PrintInvoiceModal
        invoice={printingInvoice}
        onClose={() => setPrintingInvoice(null)}
      />
    </div>
  );
}
