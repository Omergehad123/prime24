/**
 * @file src/components/Navbar.tsx
 * @description Clean 3-zone top navigation bar for Prime 24 Invoice System with official Brand Logo.
 */

import React, { useState } from 'react';
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

  return (
    <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
        {/* Zone 1: Brand Logo & Wordmark (Prime 24) */}
        <button
          type="button"
          onClick={() => onSelectTab('editor')}
          className="flex items-center gap-3 text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900"
        >
          {!logoError ? (
            <img
              src="Logo.jpeg"
              alt="Prime 24 Logo"
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
              className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <span className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              P24
            </span>
          )}
          <span>Prime 24</span>
        </button>

        {/* Zone 2: Two main pages */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
          <button
            type="button"
            onClick={() => onSelectTab('archive')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${activeTab === 'archive'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
              }`}
          >
            صفحة الفواتير
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('editor')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${activeTab === 'editor'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent hover:text-slate-900'
              }`}
          >
            {isEditingExisting ? 'تعديل الفاتورة' : 'إنشاء الفاتورة'}
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewInvoice}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            + فاتورة جديدة
          </button>
        </div>
      </div>
    </header>
  );
};
