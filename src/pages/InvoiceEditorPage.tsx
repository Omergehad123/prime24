/**
 * @file src/pages/InvoiceEditorPage.tsx
 * @description إنشاء وتعديل الفاتورة (Prime 24) المتصلة بـ MongoDB Atlas.
 * 
 * الميزات:
 * 1. الطول والعرض يحسبان تلقائياً إجمالي الأبعاد (الطول × العرض).
 * 2. سعر المتر / المساحة (Area Price): افتراضياً 10 (أو 5 أو أي رقم)، ويمكن للمدير تعديله في كل فاتورة.
 * 3. يتم احتساب سعر البند تلقائياً: (الطول × العرض) × سعر المتر المحدد.
 * 4. نوع المنتج: بلاك سكرين (black_screen) أو بلاك أوت (black_out):
 *    - بلاك سكرين: حقل رقمي (Input Number) لكود اللون.
 *    - بلاك أوت: قائمة اختيار من 4 ألوان: gray || black || beige || brown (رصاصي، أسود، بيج، بني).
 * 5. نوع الطبقة: سنجل (single) أو دبل (double).
 * 6. ملاحظة لكل بند + ملاحظة عامة للفاتورة.
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  FileDown,
  CheckCircle2,
  AlertCircle,
  Coins,
  FileText,
} from 'lucide-react';
import {
  Invoice,
  InvoiceItem,
  ProductType,
  LayerType,
  BLACK_OUT_COLOR_OPTIONS,
  DEFAULT_METER_PRICE,
} from '../types/invoice';
import {
  calculateItemMeters,
  calculateItemPrice,
  formatDimension,
  formatCurrency,
  recalculateAllItems,
} from '../utils/calculations';
import { invoiceApi } from '../services/invoiceApi';

interface InvoiceEditorPageProps {
  editingInvoice: Invoice | null;
  onSavedSuccess: (saved: Invoice) => void;
  onOpenPrintModal: (invoice: Invoice) => void;
  onClearEditing: () => void;
}

function createProductRow(productType: ProductType, currentMeterPrice: number): InvoiceItem {
  const defaultLen = 2.0;
  const defaultWid = 1.5;
  const totalDimensions = calculateItemMeters(defaultLen, defaultWid);

  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: productType,
    productType,
    length: defaultLen,
    width: defaultWid,
    totalDimensions,
    colorCode: productType === 'black_screen' ? 101 : 'beige',
    layerType: 'single',
    itemPrice: calculateItemPrice(defaultLen, defaultWid, currentMeterPrice),
    notes: '',
  };
}

export const InvoiceEditorPage: React.FC<InvoiceEditorPageProps> = ({
  editingInvoice,
  onSavedSuccess,
  onOpenPrintModal,
  onClearEditing,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState<string>('1');
  const [sequenceNumber, setSequenceNumber] = useState<number>(1);
  const [brandName] = useState<string>('Prime 24');
  const [meterPrice, setMeterPrice] = useState<number>(DEFAULT_METER_PRICE);
  const [defaultProductType, setDefaultProductType] = useState<ProductType>('black_screen');
  const [invoiceNotes, setInvoiceNotes] = useState<string>('');
  const [items, setItems] = useState<InvoiceItem[]>(() => [
    createProductRow('black_screen', DEFAULT_METER_PRICE),
  ]);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;
    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoiceNumber);
      setSequenceNumber(editingInvoice.sequenceNumber || 1);
      const invoiceRate = editingInvoice.meterPrice !== undefined ? editingInvoice.meterPrice : DEFAULT_METER_PRICE;
      setMeterPrice(invoiceRate);
      setDefaultProductType(editingInvoice.invoiceType || 'black_screen');
      setInvoiceNotes(editingInvoice.invoiceNotes || editingInvoice.notes || '');
      setItems(
        editingInvoice.items && editingInvoice.items.length > 0
          ? editingInvoice.items.map((it) => {
              const pType = it.type || it.productType || editingInvoice.invoiceType || 'black_screen';
              return {
                ...it,
                type: pType,
                productType: pType,
                layerType: it.layerType || 'single',
              };
            })
          : [createProductRow('black_screen', invoiceRate)]
      );
      setFeedback(null);
    } else {
      invoiceApi
        .getNextNumber()
        .then((next) => {
          if (isMounted) {
            setInvoiceNumber(next.invoiceNumber);
            setSequenceNumber(next.sequenceNumber);
          }
        })
        .catch(() => {
          // Fallback offline next number
        });
    }
    return () => {
      isMounted = false;
    };
  }, [editingInvoice]);

  // Recalculate automatic dimensions and totals based on items & current meterPrice
  const effectiveState = recalculateAllItems(items, meterPrice);

  const handleMeterPriceChange = (newVal: string) => {
    const parsed = Math.max(0, Number(newVal) || 0);
    setMeterPrice(parsed);
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        itemPrice: calculateItemPrice(it.length, it.width, parsed),
      }))
    );
  };

  const handleAddProductRow = (typeToAdd: ProductType) => {
    const newRow = createProductRow(typeToAdd, meterPrice);
    setItems((prev) => [...prev, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    if (items.length <= 1) {
      setFeedback({
        type: 'error',
        message: 'يجب أن تحتوي الفاتورة على منتج واحد على الأقل.',
      });
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRowProductTypeChange = (id: string, newType: ProductType) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const defaultColor = newType === 'black_screen' ? 101 : 'beige';
        return {
          ...item,
          type: newType,
          productType: newType,
          colorCode: defaultColor,
        };
      })
    );
  };

  const handleItemDimensionChange = (id: string, field: 'length' | 'width', rawValue: string) => {
    const numericVal = Math.max(0, Number(rawValue) || 0);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newLength = field === 'length' ? numericVal : item.length;
        const newWidth = field === 'width' ? numericVal : item.width;
        const newTotalDimensions = calculateItemMeters(newLength, newWidth);
        const newPrice = calculateItemPrice(newLength, newWidth, meterPrice);
        return {
          ...item,
          length: newLength,
          width: newWidth,
          totalDimensions: newTotalDimensions,
          itemPrice: newPrice,
        };
      })
    );
  };

  const handleLayerTypeChange = (id: string, layerType: LayerType) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, layerType } : item))
    );
  };

  const handleColorChange = (id: string, colorCode: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, colorCode } : item))
    );
  };

  const handleItemNotesChange = (id: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    );
  };

  const buildCurrentInvoicePayload = (): Omit<Invoice, '_id'> => ({
    invoiceNumber,
    sequenceNumber,
    brandName,
    meterPrice,
    invoiceType: defaultProductType,
    items: effectiveState.items.map((it) => ({
      ...it,
      type: it.type || it.productType,
      productType: it.productType || it.type,
    })),
    totalMeters: effectiveState.totalMeters,
    grandTotal: effectiveState.grandTotal,
    invoiceNotes,
    notes: invoiceNotes,
    createdAt: editingInvoice?.createdAt,
  });

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const payload = buildCurrentInvoicePayload();
      let saved: Invoice;

      if (editingInvoice && editingInvoice._id) {
        saved = await invoiceApi.update(editingInvoice._id, payload);
        setFeedback({
          type: 'success',
          message: `تم تحديث الفاتورة رقم ${saved.invoiceNumber} بنجاح في قاعدة بيانات MongoDB Atlas.`,
        });
      } else {
        saved = await invoiceApi.create(payload);
        setFeedback({
          type: 'success',
          message: `تم حفظ الفاتورة رقم ${saved.invoiceNumber} بنجاح في قاعدة بيانات MongoDB Atlas.`,
        });
      }

      onSavedSuccess(saved);
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message: error.message || 'حدث خطأ أثناء حفظ الفاتورة',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = () => {
    const current = buildCurrentInvoicePayload();
    onOpenPrintModal({
      ...current,
      _id: editingInvoice?._id || 'preview',
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-bold text-slate-800">{brandName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              فاتورة #{invoiceNumber}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              سعر المتر الحالي: {meterPrice} دينار
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {editingInvoice ? `تعديل الفاتورة #${editingInvoice.invoiceNumber}` : `إنشاء فاتورة جديدة (رقم ${invoiceNumber})`}
          </h1>
        </div>

        {editingInvoice && (
          <button
            type="button"
            onClick={onClearEditing}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors self-start sm:self-auto cursor-pointer whitespace-nowrap shrink-0"
          >
            إلغاء التعديل وبدء فاتورة جديدة
          </button>
        )}
      </div>

      {/* Admin Controls: Area Price (سعر المتر) & General Invoice Settings */}
      <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                سعر المتر / المساحة للفاتورة (Area Price)
              </h2>
              <p className="text-xs text-slate-500">
                يمكن للمدير تعديل سعر المتر لكل فاتورة، وتُحفظ الفاتورة بسعرها الحالي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="meter-price-input" className="text-xs font-bold text-slate-700 whitespace-nowrap">
              سعر المتر (دينار):
            </label>
            <div className="relative w-36">
              <input
                id="meter-price-input"
                type="number"
                step="any"
                min="0"
                value={meterPrice}
                onChange={(e) => handleMeterPriceChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm font-bold font-mono-num bg-white border-2 border-slate-300 rounded-lg text-slate-900 focus:border-slate-900 focus:outline-none"
              />
              <span className="absolute left-2.5 top-2.5 text-xs font-bold text-slate-400">
                د.ك
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:no-underline cursor-pointer shrink-0"
          >
            إخفاء
          </button>
        </div>
      )}

      <form onSubmit={handleSaveInvoice} className="space-y-8">
        {/* Dynamic Products Table */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                منتجات وبنود الفاتورة ({brandName})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                المعادلة: الأبعاد = (الطول × العرض) | سعر البند = الأبعاد × {meterPrice} دينار
              </p>
            </div>

            {/* Quick Add Buttons */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setDefaultProductType('black_screen');
                  handleAddProductRow('black_screen');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة بلاك سكرين</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDefaultProductType('black_out');
                  handleAddProductRow('black_out');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة بلاك أوت</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3.5 px-4 w-36">النوع (Type)</th>
                  <th className="py-3.5 px-4 w-28">الطول (L)</th>
                  <th className="py-3.5 px-4 w-28">العرض (W)</th>
                  <th className="py-3.5 px-4 w-32">إجمالي الأبعاد (L×W)</th>
                  <th className="py-3.5 px-4 w-44">كود اللون / اللون</th>
                  <th className="py-3.5 px-4 w-36">الطبقة (سنجل / دبل)</th>
                  <th className="py-3.5 px-4 w-32">سعر البند ({meterPrice}د)</th>
                  <th className="py-3.5 px-4 min-w-[200px]">ملاحظة</th>
                  <th className="py-3.5 px-4 w-14 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {effectiveState.items.map((item, index) => {
                  const currentType = item.type || item.productType;
                  const isBlackScreen = currentType === 'black_screen';

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* 1. Type: black_screen vs black_out */}
                      <td className="py-3 px-4">
                        <select
                          aria-label={`نوع المنتج للبند ${index + 1}`}
                          value={currentType}
                          onChange={(e) =>
                            handleRowProductTypeChange(item.id, e.target.value as ProductType)
                          }
                          className="w-full px-2.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none cursor-pointer"
                        >
                          <option value="black_screen">بلاك سكرين (Black Screen)</option>
                          <option value="black_out">بلاك أوت (Black Out)</option>
                        </select>
                      </td>

                      {/* 2. Length */}
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          aria-label={`الطول للبند ${index + 1}`}
                          value={item.length}
                          onChange={(e) =>
                            handleItemDimensionChange(item.id, 'length', e.target.value)
                          }
                          placeholder="الطول"
                          className="w-full min-w-[80px] px-2.5 py-2 text-sm font-mono-num bg-white border border-slate-200 rounded-md focus:border-slate-900 focus:outline-none"
                        />
                      </td>

                      {/* 3. Width */}
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          aria-label={`العرض للبند ${index + 1}`}
                          value={item.width}
                          onChange={(e) =>
                            handleItemDimensionChange(item.id, 'width', e.target.value)
                          }
                          placeholder="العرض"
                          className="w-full min-w-[80px] px-2.5 py-2 text-sm font-mono-num bg-white border border-slate-200 rounded-md focus:border-slate-900 focus:outline-none"
                        />
                      </td>

                      {/* 4. Total Dimensions = Length + Width (Count Auto) */}
                      <td className="py-3 px-4">
                        <div className="px-2.5 py-1.5 bg-slate-100 rounded text-center">
                          <span className="font-mono-num font-bold text-slate-900 text-xs">
                            {formatDimension(item.totalDimensions)} م
                          </span>
                        </div>
                      </td>

                      {/* 5. Color Code:
                          - black_screen: Number Input
                          - black_out: Dropdown with 4 colors (gray || black || beige || brown) */}
                      <td className="py-3 px-4">
                        {isBlackScreen ? (
                          <input
                            type="number"
                            min="0"
                            step="1"
                            required
                            aria-label={`رقم اللون للبند ${index + 1}`}
                            value={item.colorCode}
                            onChange={(e) => handleColorChange(item.id, Number(e.target.value) || 0)}
                            placeholder="كود اللون (رقم)"
                            className="w-full px-2.5 py-2 text-sm font-mono-num bg-white border border-slate-200 rounded-md focus:border-slate-900 focus:outline-none"
                          />
                        ) : (
                          <select
                            aria-label={`لون بلاك أوت للبند ${index + 1}`}
                            value={String(item.colorCode)}
                            onChange={(e) => handleColorChange(item.id, e.target.value)}
                            className="w-full px-2.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-md text-slate-900 focus:border-slate-900 focus:outline-none cursor-pointer"
                          >
                            {BLACK_OUT_COLOR_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* 6. Layer Type: single || double */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md">
                          <button
                            type="button"
                            onClick={() => handleLayerTypeChange(item.id, 'single')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                              item.layerType === 'single'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            سنجل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLayerTypeChange(item.id, 'double')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                              item.layerType === 'double'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            دبل
                          </button>
                        </div>
                      </td>

                      {/* 7. Auto Item Price = totalDimensions * meterPrice */}
                      <td className="py-3 px-4">
                        <span className="font-mono-num font-bold text-slate-900 text-xs">
                          {formatCurrency(item.itemPrice)} د
                        </span>
                      </td>

                      {/* 8. Item Notes */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          aria-label={`ملاحظة البند ${index + 1}`}
                          value={item.notes}
                          onChange={(e) => handleItemNotesChange(item.id, e.target.value)}
                          placeholder="ملاحظة..."
                          className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-md focus:border-slate-900 focus:outline-none"
                        />
                      </td>

                      {/* 9. Delete Row */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(item.id)}
                          aria-label={`حذف البند ${index + 1}`}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* General Invoice Note Section */}
          <div className="p-5 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <label htmlFor="general-invoice-notes" className="text-xs font-bold text-slate-700">
                ملاحظات عامة على الفاتورة (Invoice Notes):
              </label>
            </div>
            <textarea
              id="general-invoice-notes"
              rows={2}
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder="اكتب أي شروط أو ملاحظات عامة للعميل هنا..."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>

          {/* Bottom Summary & Actions */}
          <div className="p-6 bg-slate-50/70 border-t border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleAddProductRow(defaultProductType)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>
                  + إضافة بند ({defaultProductType === 'black_screen' ? 'بلاك سكرين' : 'بلاك أوت'})
                </span>
              </button>

              <span className="text-xs text-slate-600 bg-white px-3 py-1.5 rounded-md border border-slate-200">
                إجمالي الأمتار:{' '}
                <strong className="font-mono-num text-slate-900 font-bold">
                  {formatDimension(effectiveState.totalMeters)} متر
                </strong>{' '}
                × {meterPrice} دينار
              </span>
            </div>

            {/* Grand Total & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
              <div className="flex items-baseline gap-3 bg-white px-5 py-3 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">إجمالي الفاتورة:</span>
                <span className="text-2xl font-bold font-mono-num text-slate-900">
                  {formatCurrency(effectiveState.grandTotal)}{' '}
                  <span className="text-xs font-semibold text-slate-600">دينار</span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FileDown className="w-4 h-4" />
                  <span>معاينة و PDF</span>
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? 'جاري الحفظ في MongoDB...'
                      : editingInvoice
                      ? 'حفظ التعديلات'
                      : 'حفظ الفاتورة'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
};
