/**
 * @file src/components/PrintInvoiceModal.tsx
 * @description Dedicated A4 Invoice Sheet & Direct PDF Downloader for Prime 24.
 * Ensures the official Brand Logo is ALWAYS rendered in both:
 * 1. Direct PDF download (`Download as PDF` via `html2canvas` + `jspdf`) using a server-proxied Base64 Data URL so CORS never blocks or hides the logo.
 * 2. Isolated A4 printing (`طباعة الفاتورة فقط`).
 * Also uses 100% inline standard HEX CSS and strips Tailwind v4 `oklch()` rules in `onclone`.
 */

import React, { useRef, useState, useEffect } from 'react';
import { Printer, FileDown, X, CheckCircle2, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Invoice, FIXED_METER_PRICE, BRAND_LOGO_URL } from '../types/invoice';
import { formatDimension, formatCurrency, getProductLabel } from '../utils/calculations';
import { invoiceApi } from '../services/invoiceApi';

interface PrintInvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

const INLINE_COLOR_PROPERTIES = [
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'textDecorationColor',
  'columnRuleColor',
  'caretColor',
  'fill',
  'stroke',
] as const;

/**
 * Strips all Tailwind v4 `<style>` and `<link>` stylesheets from the cloned document
 * and enforces explicit inline HEX styles on all nodes so `html2canvas` never sees `oklch()`.
 */
function prepareClonedDocumentWithInlineHex(clonedDoc: Document) {
  const stylesheets = Array.from(
    clonedDoc.querySelectorAll('style, link[rel="stylesheet"]')
  );
  for (const sheet of stylesheets) {
    if (sheet.tagName.toLowerCase() === 'link') {
      const href = (sheet as HTMLLinkElement).href || '';
      if (!href.includes('fonts.googleapis.com')) {
        sheet.remove();
      }
    } else {
      sheet.remove();
    }
  }

  const safeStyle = clonedDoc.createElement('style');
  safeStyle.textContent = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #ffffff !important;
      color: #0f172a !important;
      font-family: 'Cairo', 'IBM Plex Sans Arabic', Arial, sans-serif !important;
      direction: rtl !important;
    }
    * {
      box-sizing: border-box !important;
      box-shadow: none !important;
      text-shadow: none !important;
      outline-color: #0f172a !important;
      border-color: #e2e8f0;
    }
  `;
  clonedDoc.head.appendChild(safeStyle);

  const allElements = Array.from(clonedDoc.querySelectorAll('*')) as HTMLElement[];
  for (const el of allElements) {
    el.removeAttribute('class');
    for (const prop of INLINE_COLOR_PROPERTIES) {
      const val = el.style[prop as any];
      if (val && (val.includes('oklch') || val.includes('oklab'))) {
        el.style[prop as any] = '#0f172a';
      }
    }
  }
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ invoice, onClose }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [logoSrc, setLogoSrc] = useState<string>(BRAND_LOGO_URL);
  const [logoError, setLogoError] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Preload the brand logo as a Base64 Data URL via our backend proxy so it is embedded in PDF & Print
  useEffect(() => {
    let isMounted = true;
    invoiceApi.getLogoBase64().then((dataUrl) => {
      if (isMounted && dataUrl) {
        setLogoSrc(dataUrl);
        setLogoError(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (!invoice) return null;

  const formattedDate = invoice.createdAt
    ? new Date(invoice.createdAt).toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  /**
   * Captures `#invoice-printable-sheet` (including the embedded Base64 Brand Logo)
   * using `html2canvas` + `jsPDF`.
   */
  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sheetRef.current || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    setStatusMessage(null);

    try {
      // Ensure Base64 logo is loaded before capturing if not already converted
      if (!logoSrc.startsWith('data:')) {
        const fetchedDataUrl = await invoiceApi.getLogoBase64();
        if (fetchedDataUrl) {
          setLogoSrc(fetchedDataUrl);
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      const element = sheetRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          prepareClonedDocumentWithInlineHex(clonedDoc);
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      let heightLeft = contentHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = heightLeft - contentHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      const fileName = `${invoice.invoiceNumber || 'Prime24-Invoice'}.pdf`;

      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

      setStatusMessage({
        type: 'success',
        text: `تم تحميل ملف الـ PDF (${fileName}) شاملاً اللوجو بنجاح.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `حدث خطأ أثناء إنشاء الـ PDF: ${err?.message || 'حاول مرة أخرى'}`,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  /**
   * Prints ONLY the clean A4 invoice (including the Brand Logo) inside a dedicated print iframe.
   */
  const handlePrintInvoiceOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatusMessage(null);

    if (!sheetRef.current) {
      window.print();
      return;
    }

    const existingFrame = document.getElementById('prime24-isolated-print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'prime24-isolated-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) {
      window.print();
      return;
    }

    frameDoc.open();
    frameDoc.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <title>${invoice.invoiceNumber} - Prime 24</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              color: #0f172a;
              direction: rtl;
              font-family: 'Cairo', Arial, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          ${sheetRef.current.outerHTML}
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 350);
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatusMessage(null);
    onClose();
  };

  return (
    <div
      onClick={handleCloseClick}
      className="print-modal-backdrop fixed inset-0 z-50 bg-slate-900/65 flex items-start md:items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          maxWidth: '896px',
          width: '100%',
          overflow: 'hidden',
          margin: 'auto',
        }}
      >
        {/* Top Control Bar (Hidden in Print & Excluded from PDF Sheet) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '16px 24px',
            backgroundColor: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
            معاينة الفاتورة الجاهزة للطباعة · {invoice.invoiceNumber}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: '#0f172a',
                border: '1px solid #0f172a',
                borderRadius: '8px',
                cursor: isGeneratingPdf ? 'wait' : 'pointer',
                opacity: isGeneratingPdf ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <FileDown style={{ width: '16px', height: '16px' }} />
              <span>
                {isGeneratingPdf ? 'جاري تحميل ملف PDF...' : 'تحميل كملف PDF (Download as PDF)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePrintInvoiceOnly}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#0f172a',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Printer style={{ width: '16px', height: '16px' }} />
              <span>طباعة الفاتورة فقط (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleCloseClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#b91c1c',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <X style={{ width: '16px', height: '16px' }} />
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        {/* Status Feedback Banner */}
        {statusMessage && (
          <div
            className="no-print"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 24px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: statusMessage.type === 'success' ? '#064e3b' : '#7f1d1d',
              borderBottom:
                statusMessage.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 style={{ width: '16px', height: '16px', color: '#047857' }} />
              ) : (
                <AlertCircle style={{ width: '16px', height: '16px', color: '#b91c1c' }} />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              style={{
                background: 'transparent',
                border: 'none',
                textDecoration: 'underline',
                cursor: 'pointer',
                color: 'inherit',
                fontSize: '12px',
              }}
            >
              إخفاء
            </button>
          </div>
        )}

        {/*
          Printable A4 Invoice Sheet (`sheetRef`).
          Includes the official Brand Logo (`logoSrc` Base64 Data URL) so it is captured in both PDF and Print!
        */}
        <div
          id="invoice-printable-sheet"
          ref={sheetRef}
          dir="rtl"
          style={{
            backgroundColor: '#ffffff',
            color: '#0f172a',
            padding: '36px',
            fontFamily: "'Cairo', 'IBM Plex Sans Arabic', Arial, sans-serif",
            boxSizing: 'border-box',
          }}
        >
          {/* Invoice Header with Official Brand Logo */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              paddingBottom: '20px',
              borderBottom: '2px solid #0f172a',
              marginBottom: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {!logoError ? (
                <img
                  src={logoSrc}
                  alt="Prime 24 Logo"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    border: '1px solid #cbd5e1',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '12px',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '18px',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  P24
                </div>
              )}
              <div>
                <h1
                  style={{
                    fontSize: '26px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {invoice.brandName || 'Prime 24'}
                </h1>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#475569',
                    margin: '6px 0 0 0',
                  }}
                >
                  فاتورة رسمية · بلاك سكرين & بلاك أوت
                </p>
              </div>
            </div>

            <div
              style={{
                textAlign: 'left',
                fontSize: '13px',
                color: '#334155',
                lineHeight: 1.7,
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0f172a',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {invoice.invoiceNumber}
              </div>
              <div style={{ color: '#334155' }}>التاريخ: {formattedDate}</div>
              <div style={{ color: '#334155' }}>
                سعر المتر الثابت:{' '}
                <strong style={{ color: '#0f172a', fontFamily: "'JetBrains Mono', monospace" }}>
                  {invoice.meterPrice || FIXED_METER_PRICE} دينار
                </strong>
              </div>
            </div>
          </div>

          {/* Items Table (الطول والعرض فقط بدون مساحة) */}
          <div style={{ overflowX: 'auto', marginBottom: '28px' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'right',
                backgroundColor: '#ffffff',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f1f5f9',
                    borderTop: '1px solid #94a3b8',
                    borderBottom: '1px solid #94a3b8',
                    color: '#0f172a',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <th
                    style={{
                      padding: '12px 10px',
                      width: '40px',
                      color: '#0f172a',
                      backgroundColor: '#f1f5f9',
                      borderTop: '1px solid #94a3b8',
                      borderBottom: '1px solid #94a3b8',
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      padding: '12px 10px',
                      color: '#0f172a',
                      backgroundColor: '#f1f5f9',
                      borderTop: '1px solid #94a3b8',
                      borderBottom: '1px solid #94a3b8',
                    }}
                  >
                    نوع المنتج
                  </th>
                  <th
                    style={{
                      padding: '12px 10px',
                      color: '#0f172a',
                      backgroundColor: '#f1f5f9',
                      borderTop: '1px solid #94a3b8',
                      borderBottom: '1px solid #94a3b8',
                    }}
                  >
                    الطول
                  </th>
                  <th
                    style={{
                      padding: '12px 10px',
                      color: '#0f172a',
                      backgroundColor: '#f1f5f9',
                      borderTop: '1px solid #94a3b8',
                      borderBottom: '1px solid #94a3b8',
                    }}
                  >
                    العرض
                  </th>
                  <th
                    style={{
                      padding: '12px 10px',
                      color: '#0f172a',
                      backgroundColor: '#f1f5f9',
                      borderTop: '1px solid #94a3b8',
                      borderBottom: '1px solid #94a3b8',
                    }}
                  >
                    رقم اللون / اللون
                  </th>
                  <th
                    style={{
                      padding: '12px 10px',
                      color: '#0f172a',
                      backgroundColor: '#f1f5f9',
                      borderTop: '1px solid #94a3b8',
                      borderBottom: '1px solid #94a3b8',
                    }}
                  >
                    دبل / سنجل
                  </th>
                  <th
                    style={{
                      padding: '12px 10px',
                      color: '#0f172a',
                      backgroundColor: '#f1f5f9',
                      borderTop: '1px solid #94a3b8',
                      borderBottom: '1px solid #94a3b8',
                    }}
                  >
                    السعر
                  </th>
                  <th
                    style={{
                      padding: '12px 10px',
                      color: '#0f172a',
                      backgroundColor: '#f1f5f9',
                      borderTop: '1px solid #94a3b8',
                      borderBottom: '1px solid #94a3b8',
                    }}
                  >
                    ملاحظة
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      fontSize: '14px',
                      color: '#1e293b',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <td
                      style={{
                        padding: '12px 10px',
                        fontSize: '12px',
                        color: '#64748b',
                        borderBottom: '1px solid #e2e8f0',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {idx + 1}
                    </td>
                    <td
                      style={{
                        padding: '12px 10px',
                        fontWeight: 700,
                        color: '#0f172a',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      {getProductLabel(item.productType || invoice.invoiceType)}
                    </td>
                    <td
                      style={{
                        padding: '12px 10px',
                        color: '#1e293b',
                        borderBottom: '1px solid #e2e8f0',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {formatDimension(item.length)}
                    </td>
                    <td
                      style={{
                        padding: '12px 10px',
                        color: '#1e293b',
                        borderBottom: '1px solid #e2e8f0',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {formatDimension(item.width)}
                    </td>
                    <td
                      style={{
                        padding: '12px 10px',
                        fontWeight: 700,
                        fontSize: '13px',
                        color: '#0f172a',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      {item.productType === 'black_screen'
                        ? `رقم ${item.colorCode}`
                        : item.colorCode || '—'}
                    </td>
                    <td
                      style={{
                        padding: '12px 10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#1e293b',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      {item.layerType === 'double' ? 'دبل' : 'سنجل'}
                    </td>
                    <td
                      style={{
                        padding: '12px 10px',
                        fontWeight: 700,
                        color: '#0f172a',
                        borderBottom: '1px solid #e2e8f0',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {formatCurrency(item.itemPrice)} دينار
                    </td>
                    <td
                      style={{
                        padding: '12px 10px',
                        fontSize: '13px',
                        color: '#475569',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      {item.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div
            style={{
              paddingTop: '20px',
              borderTop: '2px solid #0f172a',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '20px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.8 }}>
              <div style={{ margin: 0, color: '#475569' }}>
                إجمالي عدد المنتجات في الفاتورة: {invoice.items.length}
              </div>
              <div style={{ margin: 0, color: '#475569' }}>
                طريقة الحساب: (الطول + العرض) × {invoice.meterPrice || FIXED_METER_PRICE} دينار للمتر
              </div>
              {(invoice.invoiceNotes || invoice.notes) && (
                <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#f1f5f9', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', color: '#1e293b' }}>
                  <strong>ملاحظات الفاتورة:</strong> {invoice.invoiceNotes || invoice.notes}
                </div>
              )}
            </div>

            <div
              style={{
                width: '280px',
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  color: '#475569',
                  marginBottom: '10px',
                }}
              >
                <span style={{ color: '#475569' }}>مجموع الأمتار (الطول + العرض):</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: '#0f172a',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {formatDimension(invoice.totalMeters)} متر
                </span>
              </div>
              <div
                style={{
                  paddingTop: '10px',
                  borderTop: '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                <span style={{ color: '#0f172a' }}>المجموع الكلي:</span>
                <span
                  style={{
                    color: '#0f172a',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {formatCurrency(invoice.grandTotal)} دينار
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
