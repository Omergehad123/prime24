/**
 * @file src/components/Navbar.tsx
 * @description Clean 3-zone top navigation bar for Prime 24 Invoice System with official Brand Logo.
 */

import React, { useState, useEffect } from 'react';
import { Menu, X, FileText, Receipt, Plus } from 'lucide-react';
import { BRAND_LOGO_URL } from '../types/invoice';

export type ActiveTab = 'editor' | 'archive';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onNewInvoice: () => void;
  isEditingExisting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onNewInvoice,
  isEditingExisting,
}) => {
  const [logoError, setLogoError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleTabClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleNewInvoiceClick = () => {
    onNewInvoice();
    setIsMobileMenuOpen(false);
  };

  const renderLogo = (sizeClass = 'h-10 w-10') => {
    if (!logoError) {
      return (
        <img
          src="Logo.jpeg"
          alt="Prime 24 Logo"
          referrerPolicy="no-referrer"
          onError={() => setLogoError(true)}
          className={`${sizeClass} rounded-lg object-cover border border-slate-200 shrink-0`}
        />
      );
    }
    return (
      <span
        className={`${sizeClass} rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0`}
      >
        P24
      </span>
    );
  };

  return (
    <>
      <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5">
          {/* Left Zone: Mobile Hamburger Menu & Brand */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="فتح القائمة"
              className="md:hidden p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo & Wordmark (Prime 24) */}
            <button
              type="button"
              onClick={() => handleTabClick('archive')}
              className="flex items-center gap-2.5 text-lg sm:text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900"
            >
              {renderLogo('h-9 w-9 sm:h-10 sm:w-10')}
              <span>Prime 24</span>
            </button>
          </div>

          {/* Center Zone: Desktop navigation links (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => handleTabClick('archive')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                activeTab === 'archive'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              صفحة الفواتير
            </button>
            <button
              type="button"
              onClick={() => handleTabClick('editor')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                activeTab === 'editor'
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {isEditingExisting ? 'تعديل الفاتورة' : 'إنشاء الفاتورة'}
            </button>
          </nav>

          {/* Right Zone: Primary Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleNewInvoiceClick}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>فاتورة جديدة</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Drawer: Slides in from the left, slides out to the left */}
      <aside
        aria-label="القائمة الجانبية"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            {renderLogo('h-9 w-9')}
            <div className="flex flex-col text-right">
              <span className="font-bold text-slate-900 text-base leading-tight">
                Prime 24
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                نظام إدارة الفواتير
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="إغلاق القائمة"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body - Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-2">
          <div className="text-[11px] font-semibold text-slate-400 px-3 uppercase tracking-wider mb-1 text-right">
            الصفحات الرئيسية
          </div>

          <button
            type="button"
            onClick={() => handleTabClick('archive')}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'archive'
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Receipt className="w-4 h-4 shrink-0" />
              <span>صفحة الفواتير</span>
            </div>
            {activeTab === 'archive' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('editor')}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 shrink-0" />
              <span>{isEditingExisting ? 'تعديل الفاتورة' : 'إنشاء الفاتورة'}</span>
            </div>
            {activeTab === 'editor' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* Quick Action inside Drawer */}
          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleNewInvoiceClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ فاتورة جديدة</span>
            </button>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 text-right">
          <p className="text-[11px] text-slate-500">
            نظام الفواتير وحساب المساحات
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            شبك & بلاك أوت
          </p>
        </div>
      </aside>
    </>
  );
};
