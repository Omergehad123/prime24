/**
 * @file src/pages/ArchiveDashboardPage.tsx
 * @description الصفحة الثانية: صفحة الفواتير (Prime 24 Archive).
 * تعرض الفواتير المحفوظة مع إجمالي الأمتار (الطول + العرض) والإجمالي الكلي بالدينار.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Edit3, FileDown, Trash2, RotateCcw, Plus } from 'lucide-react';
import { Invoice } from '../types/invoice';
import { invoiceApi } from '../services/invoiceApi';
import { formatDimension, formatCurrency } from '../utils/calculations';

interface ArchiveDashboardPageProps {
  onEditInvoice: (invoice: Invoice) => void;
  onPrintInvoice: (invoice: Invoice) => void;
  onCreateNew: () => void;
}

export const ArchiveDashboardPage: React.FC<ArchiveDashboardPageProps> = ({
  onEditInvoice,
  onPrintInvoice,
  onCreateNew,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'black_screen' | 'black_out'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchArchive = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoiceApi.getAll({
        search: searchQuery,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        invoiceType: typeFilter,
      });
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'تعذر جلب صفحة الفواتير');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, dateFrom, dateTo, typeFilter]);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setTypeFilter('all');
  };

  const handleConfirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await invoiceApi.remove(id);
      setInvoices((prev) => prev.filter((inv) => inv._id !== id));
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'فشل حذف الفاتورة');
    } finally {
      setDeletingId(null);
    }
  };

  const totalSavedMeters = invoices.reduce((acc, inv) => acc + (inv.totalMeters || 0), 0);
  const totalSavedRevenue = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header & Aggregate Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-5 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Prime 24</span>
            <span aria-hidden="true">·</span>
            <span>سجل الفواتير المحفوظة</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">صفحة الفواتير</h1>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 gap-6 bg-white border border-slate-200 rounded-xl px-6 py-3.5">
          <div>
            <div className="text-xs text-slate-500">عدد الفواتير</div>
            <div className="text-lg font-bold font-mono-num text-slate-900 mt-0.5">
              {invoices.length}
            </div>
          </div>
          <div className="border-r border-slate-200 pr-6">
            <div className="text-xs text-slate-500">مجموع الأمتار</div>
            <div className="text-lg font-bold font-mono-num text-slate-900 mt-0.5">
              {formatDimension(totalSavedMeters)} <span className="text-xs font-normal">متر</span>
            </div>
          </div>
          <div className="border-r border-slate-200 pr-6">
            <div className="text-xs text-slate-500">إجمالي المبيعات</div>
            <div className="text-lg font-bold font-mono-num text-slate-900 mt-0.5">
              {formatCurrency(totalSavedRevenue)} <span className="text-xs font-normal">دينار</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الفاتورة (INV-1001)، رقم اللون، أو الملاحظات..."
              className="w-full pr-10 pl-3.5 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>

          {/* Date From */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
              من تاريخ:
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono-num bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
              إلى تاريخ:
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono-num bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>

          {/* Product Type Filter */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${typeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('black_screen')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${typeFilter === 'black_screen'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                شبك
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('black_out')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${typeFilter === 'black_out'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                بلاك أوت
              </button>
            </div>

            {(searchQuery || dateFrom || dateTo || typeFilter !== 'all') && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="إعادة ضبط الفلترة"
                className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
          {error}
        </div>
      )}

      {/* Archive Data Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-11 bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-base font-semibold text-slate-800">
              لا توجد فواتير محفوظة مطابقة للبحث
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              يمكنك تعديل الفلترة أو الانتقال إلى صفحة إنشاء الفاتورة لإضافة فاتورة جديدة.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onCreateNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء فاتورة جديدة</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3.5 px-5">رقم الفاتورة</th>
                  <th className="py-3.5 px-5">التاريخ والوقت</th>
                  <th className="py-3.5 px-5">المنتجات داخل الفاتورة</th>
                  <th className="py-3.5 px-5">عدد المنتجات ومجموع الأمتار</th>
                  <th className="py-3.5 px-5">السعر الإجمالي (دينار)</th>
                  <th className="py-3.5 px-5 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {invoices.map((inv) => {
                  const dateFormatted = inv.createdAt
                    ? new Date(inv.createdAt).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                    : '—';
                  const timeFormatted = inv.createdAt
                    ? new Date(inv.createdAt).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    : '';

                  const hasBlackScreen = inv.items.some((i) => i.productType === 'black_screen');
                  const hasBlackOut = inv.items.some((i) => i.productType === 'black_out');
                  const productsSummary =
                    hasBlackScreen && hasBlackOut
                      ? 'بلاك سكرين · بلاك أوت'
                      : hasBlackOut
                        ? 'بلاك أوت'
                        : 'بلاك سكرين';

                  return (
                    <tr
                      key={inv._id || inv.invoiceNumber}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Invoice Number */}
                      <td className="py-3.5 px-5 font-mono-num font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-5 text-xs text-slate-600 whitespace-nowrap">
                        <span>{dateFormatted}</span>
                        {timeFormatted && (
                          <>
                            <span className="mx-1.5 text-slate-300" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-mono-num text-slate-500">{timeFormatted}</span>
                          </>
                        )}
                      </td>

                      {/* Products Summary */}
                      <td className="py-3.5 px-5 text-xs font-medium text-slate-800">
                        <div>{productsSummary}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {inv.items
                            .slice(0, 3)
                            .map(
                              (it) =>
                                `${it.productType === 'black_out' ? 'بلاك أوت' : 'سكرين'} (${it.colorCode
                                } - ${it.layerType === 'double' ? 'دبل' : 'سنجل'})`
                            )
                            .join(' ، ')}
                          {inv.items.length > 3 ? ` +${inv.items.length - 3}` : ''}
                        </div>
                      </td>

                      {/* Items Count & Total Meters */}
                      <td className="py-3.5 px-5 text-xs text-slate-600 whitespace-nowrap">
                        <span className="font-mono-num font-semibold text-slate-900">
                          {inv.items.length}
                        </span>{' '}
                        منتجات
                        <span className="mx-1.5 text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono-num font-semibold text-slate-900">
                          {formatDimension(inv.totalMeters)}
                        </span>{' '}
                        متر
                      </td>

                      {/* Grand Total & Meter Price */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="font-mono-num font-bold text-slate-900">
                          {formatCurrency(inv.grandTotal)} دينار
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono-num mt-0.5">
                          سعر المتر: {inv.meterPrice ?? 10} د
                        </div>
                        {(inv.invoiceNotes || inv.notes) && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5" title={inv.invoiceNotes || inv.notes}>
                            ملاحظة: {inv.invoiceNotes || inv.notes}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-left whitespace-nowrap">
                        {confirmDeleteId === inv._id ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={deletingId === inv._id}
                              onClick={() => inv._id && handleConfirmDelete(inv._id)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 transition-colors cursor-pointer"
                            >
                              {deletingId === inv._id ? 'جاري الحذف...' : 'تأكيد الحذف'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 text-xs text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              تراجع
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onEditInvoice(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onPrintInvoice(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>استخراج PDF</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(inv._id || null)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-white border border-slate-200 rounded-md hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
