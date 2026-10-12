/**
 * @file src/App.tsx
 * @description Root Application Component for Prime 24 Invoice System.
 * Separates the screen workspace (`.screen-workspace`) from the isolated printable A4 Invoice sheet
 * so that printing NEVER prints a screenshot of the website UI.
 */

import { useState } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { InvoiceEditorPage } from './pages/InvoiceEditorPage';
import { ArchiveDashboardPage } from './pages/ArchiveDashboardPage';
import { PrintInvoiceModal } from './components/PrintInvoiceModal';
import { Invoice, BRAND_LOGO_URL } from './types/invoice';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  const handleStartNewInvoice = () => {
    setEditingInvoice(null);
    setActiveTab('editor');
  };

  const handleEditFromArchive = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setActiveTab('editor');
  };

  const handleSavedSuccess = (saved: Invoice) => {
    setEditingInvoice(saved);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Screen Workspace (Automatically hidden during A4 printing) */}
      <div className="screen-workspace no-print min-h-screen flex flex-col">
        <Navbar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onNewInvoice={handleStartNewInvoice}
          isEditingExisting={!!editingInvoice}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
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
            <span>استخراج PDF وطباعة الفاتورة المستقلة</span>
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
