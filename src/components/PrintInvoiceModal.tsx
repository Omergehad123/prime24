import React, { useRef, useState, useEffect } from 'react';
import { Printer, FileDown, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Invoice, FIXED_METER_PRICE, BRAND_LOGO_URL } from '../types/invoice';
import { formatDimension, formatCurrency, getProductLabel, getBlackOutColorLabel } from '../utils/calculations';
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

  // Responsive device width tracking
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Preload the brand logo as a Base64 Data URL via backend proxy so it is embedded in PDF & Print
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
   * Captures `#invoice-printable-sheet` using `html2canvas` + `jsPDF`.
   * Standardizes the cloned sheet to desktop A4 proportions regardless of current device screen size.
   */
  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sheetRef.current || isGeneratingPdf) return;

    setIsGeneratingPdf(true);
    setStatusMessage(null);

    try {
      // Ensure Base64 logo is loaded before capturing
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
        windowWidth: 1240, // Emulates desktop viewport so media queries render full A4
        onclone: (clonedDoc) => {
          // 1. Strip Tailwind classes & oklch styles
          prepareClonedDocumentWithInlineHex(clonedDoc);

          // 2. Remove mobile-only elements from PDF
          const mobileHints = clonedDoc.querySelectorAll('.mobile-only-ui');
          mobileHints.forEach((el) => el.remove());

          // 3. Format cloned sheet to standard A4 (800px width)
          const clonedSheet = clonedDoc.getElementById('invoice-printable-sheet');
          if (clonedSheet) {
            clonedSheet.style.width = '800px';
            clonedSheet.style.minWidth = '800px';
            clonedSheet.style.maxWidth = '800px';
            clonedSheet.style.padding = '36px';
            clonedSheet.style.margin = '0 auto';
            clonedSheet.style.boxSizing = 'border-box';
            clonedSheet.style.backgroundColor = '#ffffff';
          }

          // 4. Force table container to fully display without scrollbars or truncation
          const tableContainers = clonedDoc.querySelectorAll('.invoice-table-container');
          tableContainers.forEach((tc) => {
            const el = tc as HTMLElement;
            el.style.overflow = 'visible';
            el.style.width = '100%';
            el.style.marginBottom = '28px';
          });

          const table = clonedDoc.querySelector('table');
          if (table) {
            table.style.width = '100%';
            table.style.minWidth = '100%';
          }

          // 5. Force header to formal side-by-side flex layout
          const headerRow = clonedDoc.getElementById('invoice-header-row');
          if (headerRow) {
            headerRow.style.display = 'flex';
            headerRow.style.flexDirection = 'row';
            headerRow.style.justifyContent = 'space-between';
            headerRow.style.alignItems = 'center';
            headerRow.style.flexWrap = 'nowrap';
            headerRow.style.gap = '20px';
            headerRow.style.paddingBottom = '20px';
            headerRow.style.marginBottom = '28px';
            headerRow.style.borderBottom = '2px solid #0f172a';
          }

          const headerMeta = clonedDoc.getElementById('invoice-header-meta');
          if (headerMeta) {
            headerMeta.style.width = 'auto';
            headerMeta.style.textAlign = 'left';
            headerMeta.style.backgroundColor = 'transparent';
            headerMeta.style.border = 'none';
            headerMeta.style.padding = '0';
          }

          // 6. Force footer to formal side-by-side layout
          const footerRow = clonedDoc.getElementById('invoice-footer-row');
          if (footerRow) {
            footerRow.style.display = 'flex';
            footerRow.style.flexDirection = 'row';
            footerRow.style.justifyContent = 'space-between';
            footerRow.style.alignItems = 'flex-start';
            footerRow.style.flexWrap = 'nowrap';
            footerRow.style.gap = '20px';
            footerRow.style.paddingTop = '20px';
            footerRow.style.borderTop = '2px solid #0f172a';
          }

          const totalsCard = clonedDoc.getElementById('invoice-totals-card');
          if (totalsCard) {
            totalsCard.style.width = '300px';
            totalsCard.style.minWidth = '300px';
          }
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
        text: `تم تحميل ملف الـ PDF (${fileName}) بجودة A4 عالية بنجاح.`,
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
   * Prints ONLY the clean A4 invoice inside a dedicated print iframe.
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
            .mobile-only-ui, .no-print {
              display: none !important;
            }
            #invoice-printable-sheet {
              width: 100% !important;
              max-width: 100% !important;
              padding: 10mm !important;
              box-sizing: border-box !important;
            }
            .invoice-header-row {
              display: flex !important;
              flex-direction: row !important;
              justify-content: space-between !important;
              align-items: center !important;
              flex-wrap: nowrap !important;
              padding-bottom: 20px !important;
              margin-bottom: 28px !important;
              border-bottom: 2px solid #0f172a !important;
            }
            .invoice-header-meta {
              width: auto !important;
              text-align: left !important;
              background-color: transparent !important;
              border: none !important;
              padding: 0 !important;
            }
            .invoice-table-container {
              overflow: visible !important;
              width: 100% !important;
              margin-bottom: 28px !important;
            }
            table {
              width: 100% !important;
              min-width: 100% !important;
            }
            .invoice-footer-row {
              display: flex !important;
              flex-direction: row !important;
              justify-content: space-between !important;
              align-items: flex-start !important;
              flex-wrap: nowrap !important;
              padding-top: 20px !important;
              border-top: 2px solid #0f172a !important;
            }
            .invoice-totals-card {
              width: 300px !important;
              min-width: 300px !important;
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
      className="print-modal-backdrop fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: isMobile ? '12px' : '16px',
          maxWidth: '920px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          margin: 'auto',
        }}
      >
        {/* Top Control Bar (Sticky & Mobile Responsive) */}
        <div
          className="no-print"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: isMobile ? '12px 14px' : '14px 24px',
          }}
        >
          {isMobile ? (
            /* Mobile Header Layout */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    معاينة الفاتورة
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0f172a',
                      backgroundColor: '#e2e8f0',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    #{invoice.invoiceNumber}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCloseClick}
                  aria-label="إغلاق المعاينة"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  <X style={{ width: '18px', height: '18px' }} />
                </button>
              </div>

              {/* Mobile Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={handleDownloadPdf}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#ffffff',
                    backgroundColor: '#0f172a',
                    border: '1px solid #0f172a',
                    borderRadius: '8px',
                    cursor: isGeneratingPdf ? 'wait' : 'pointer',
                    opacity: isGeneratingPdf ? 0.7 : 1,
                  }}
                >
                  <FileDown style={{ width: '15px', height: '15px' }} />
                  <span>{isGeneratingPdf ? 'جاري التحميل...' : 'تحميل PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintInvoiceOnly}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <Printer style={{ width: '15px', height: '15px' }} />
                  <span>طباعة A4</span>
                </button>
              </div>
            </div>
          ) : (
            /* Tablet & Desktop Header Layout */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  معاينة الفاتورة الرسمية للطباعة والـ PDF
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#e2e8f0',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  #{invoice.invoiceNumber}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={handleDownloadPdf}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#ffffff',
                    backgroundColor: '#0f172a',
                    border: '1px solid #0f172a',
                    borderRadius: '8px',
                    cursor: isGeneratingPdf ? 'wait' : 'pointer',
                    opacity: isGeneratingPdf ? 0.7 : 1,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <FileDown style={{ width: '16px', height: '16px' }} />
                  <span>{isGeneratingPdf ? 'جاري إنشاء ملف PDF...' : 'تحميل كملف PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintInvoiceOnly}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <Printer style={{ width: '16px', height: '16px' }} />
                  <span>طباعة الفاتورة (A4)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCloseClick}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#b91c1c',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <X style={{ width: '16px', height: '16px' }} />
                  <span>إغلاق</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Feedback Banner */}
        {statusMessage && (
          <div
            className="no-print"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isMobile ? '10px 14px' : '12px 24px',
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
                <CheckCircle2 style={{ width: '16px', height: '16px', color: '#047857', flexShrink: 0 }} />
              ) : (
                <AlertCircle style={{ width: '16px', height: '16px', color: '#b91c1c', flexShrink: 0 }} />
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
                marginRight: '8px',
              }}
            >
              إخفاء
            </button>
          </div>
        )}

        {/* Scrollable Modal Body Container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            backgroundColor: '#e2e8f0',
            padding: isMobile ? '8px' : '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/*
            Printable A4 Invoice Sheet (`sheetRef`).
            Includes official Brand Logo (`logoSrc` Base64 Data URL) captured in both PDF and Print!
          */}
          <div
            id="invoice-printable-sheet"
            ref={sheetRef}
            dir="rtl"
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              width: '100%',
              maxWidth: '820px',
              padding: isMobile ? '16px 14px' : '36px',
              fontFamily: "'Cairo', 'IBM Plex Sans Arabic', Arial, sans-serif",
              boxSizing: 'border-box',
              borderRadius: isMobile ? '8px' : '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Invoice Header with Official Brand Logo */}
            <div
              id="invoice-header-row"
              className="invoice-header-row"
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                justifyContent: 'space-between',
                gap: isMobile ? '14px' : '20px',
                paddingBottom: isMobile ? '16px' : '20px',
                borderBottom: '2px solid #0f172a',
                marginBottom: isMobile ? '18px' : '28px',
              }}
            >
              {/* Brand & Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px' }}>
                {!logoError ? (
                  <img
                    src={logoSrc}
                    alt="Prime 24 Logo"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                    style={{
                      width: isMobile ? '56px' : '72px',
                      height: isMobile ? '56px' : '72px',
                      borderRadius: '10px',
                      objectFit: 'cover',
                      border: '1px solid #cbd5e1',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: isMobile ? '56px' : '64px',
                      height: isMobile ? '56px' : '64px',
                      borderRadius: '10px',
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: isMobile ? '16px' : '18px',
                      fontFamily: "'JetBrains Mono', monospace",
                      flexShrink: 0,
                    }}
                  >
                    P24
                  </div>
                )}
                <div>
                  <h1
                    style={{
                      fontSize: isMobile ? '20px' : '26px',
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
                      fontSize: isMobile ? '12px' : '13px',
                      color: '#475569',
                      margin: '4px 0 0 0',
                    }}
                  >
                    فاتورة رسمية · شبك & بلاك أوت
                  </p>
                </div>
              </div>

              {/* Invoice Meta (Number, Date, Meter Price) */}
              <div
                id="invoice-header-meta"
                className="invoice-header-meta"
                style={{
                  width: isMobile ? '100%' : 'auto',
                  textAlign: isMobile ? 'right' : 'left',
                  fontSize: '12px',
                  color: '#334155',
                  lineHeight: 1.6,
                  backgroundColor: isMobile ? '#f8fafc' : 'transparent',
                  padding: isMobile ? '10px 12px' : '0',
                  borderRadius: isMobile ? '8px' : '0',
                  border: isMobile ? '1px solid #e2e8f0' : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: isMobile ? 'space-between' : 'flex-end',
                    alignItems: 'baseline',
                    gap: '8px',
                    marginBottom: '2px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                    رقم الفاتورة:
                  </span>
                  <span
                    style={{
                      fontSize: isMobile ? '16px' : '18px',
                      fontWeight: 700,
                      color: '#0f172a',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {invoice.invoiceNumber}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: isMobile ? 'space-between' : 'flex-end',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '2px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>التاريخ:</span>
                  <span style={{ color: '#334155' }}>{formattedDate}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: isMobile ? 'space-between' : 'flex-end',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>سعر المتر:</span>
                  <strong style={{ color: '#0f172a', fontFamily: "'JetBrains Mono', monospace" }}>
                    {invoice.meterPrice || FIXED_METER_PRICE} دينار
                  </strong>
                </div>
              </div>
            </div>

            {/* Mobile Swipe Hint Badge (Only on screen preview, removed in PDF/Print) */}
            {isMobile && (
              <div
                className="mobile-only-ui"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 12px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  fontSize: '11px',
                  color: '#475569',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles style={{ width: '13px', height: '13px', color: '#0f172a' }} />
                  <span>اسحب الجدول أفقياً للاطلاع على جميع الأعمدة</span>
                </div>
                <span style={{ fontWeight: 700, color: '#0f172a', letterSpacing: '2px' }}>← →</span>
              </div>
            )}

            {/* Items Table Container with Smooth Scroll */}
            <div
              id="invoice-table-container"
              className="invoice-table-container"
              style={{
                overflowX: 'auto',
                marginBottom: isMobile ? '18px' : '28px',
                WebkitOverflowScrolling: 'touch',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            >
              <table
                className="invoice-table"
                style={{
                  width: '100%',
                  minWidth: isMobile ? '640px' : '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'right',
                  backgroundColor: '#ffffff',
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#f1f5f9',
                      borderBottom: '2px solid #94a3b8',
                      color: '#0f172a',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    <th
                      style={{
                        padding: '10px 8px',
                        width: '36px',
                        color: '#0f172a',
                        backgroundColor: '#f1f5f9',
                        textAlign: 'center',
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        padding: '10px 10px',
                        color: '#0f172a',
                        backgroundColor: '#f1f5f9',
                        minWidth: '95px',
                      }}
                    >
                      نوع المنتج
                    </th>
                    <th
                      style={{
                        padding: '10px 8px',
                        color: '#0f172a',
                        backgroundColor: '#f1f5f9',
                        minWidth: '60px',
                      }}
                    >
                      الطول
                    </th>
                    <th
                      style={{
                        padding: '10px 8px',
                        color: '#0f172a',
                        backgroundColor: '#f1f5f9',
                        minWidth: '60px',
                      }}
                    >
                      العرض
                    </th>
                    <th
                      style={{
                        padding: '10px 10px',
                        color: '#0f172a',
                        backgroundColor: '#f1f5f9',
                        minWidth: '105px',
                      }}
                    >
                      اللون ولون الفريم
                    </th>
                    <th
                      style={{
                        padding: '10px 8px',
                        color: '#0f172a',
                        backgroundColor: '#f1f5f9',
                        minWidth: '70px',
                      }}
                    >
                      دبل / سنجل
                    </th>
                    <th
                      style={{
                        padding: '10px 10px',
                        color: '#0f172a',
                        backgroundColor: '#f1f5f9',
                        minWidth: '85px',
                      }}
                    >
                      السعر
                    </th>
                    <th
                      style={{
                        padding: '10px 10px',
                        color: '#0f172a',
                        backgroundColor: '#f1f5f9',
                        minWidth: '85px',
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
                        fontSize: '13px',
                        color: '#1e293b',
                        backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                      }}
                    >
                      <td
                        style={{
                          padding: '10px 8px',
                          fontSize: '11px',
                          color: '#64748b',
                          borderBottom: '1px solid #e2e8f0',
                          textAlign: 'center',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          padding: '10px 10px',
                          fontWeight: 700,
                          color: '#0f172a',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        {getProductLabel(item.productType || invoice.invoiceType)}
                      </td>
                      <td
                        style={{
                          padding: '10px 8px',
                          color: '#1e293b',
                          borderBottom: '1px solid #e2e8f0',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {formatDimension(item.length)}
                      </td>
                      <td
                        style={{
                          padding: '10px 8px',
                          color: '#1e293b',
                          borderBottom: '1px solid #e2e8f0',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {formatDimension(item.width)}
                      </td>
                      <td
                        style={{
                          padding: '10px 10px',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: '#0f172a',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        {(() => {
                          const frameChoice = item.frameColorChoice || item.colorChoice;
                          const frameStr = String(item.frameColor ?? item.colorCode ?? '').trim();
                          let frameDisplay = 'أبيض';
                          if (
                            frameChoice === 'white' ||
                            frameStr === 'أبيض' ||
                            frameStr === 'ابيض' ||
                            frameStr.toLowerCase() === 'white'
                          ) {
                            frameDisplay = 'أبيض';
                          } else if (
                            frameChoice === 'black' ||
                            frameStr === 'أسود' ||
                            frameStr === 'اسود' ||
                            frameStr.toLowerCase() === 'black'
                          ) {
                            frameDisplay = 'أسود';
                          } else if (item.customColorNumber || frameStr) {
                            frameDisplay = `رقم ${item.customColorNumber || frameStr}`;
                          }

                          if ((item.type || item.productType) === 'black_out') {
                            const fabricLabel = getBlackOutColorLabel(item.blackOutColor || 'black');
                            return (
                              <div>
                                <div>{fabricLabel}</div>
                                <div
                                  style={{
                                    fontSize: '10px',
                                    color: '#64748b',
                                    fontWeight: 600,
                                    marginTop: '1px',
                                  }}
                                >
                                  فريم: {frameDisplay}
                                </div>
                              </div>
                            );
                          }

                          return frameDisplay;
                        })()}
                      </td>
                      <td
                        style={{
                          padding: '10px 8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#1e293b',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        {item.layerType === 'double' ? 'دبل' : 'سنجل'}
                      </td>
                      <td
                        style={{
                          padding: '10px 10px',
                          fontWeight: 700,
                          color: '#0f172a',
                          borderBottom: '1px solid #e2e8f0',
                          fontFamily: "'JetBrains Mono', monospace",
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatCurrency(item.itemPrice)} د
                      </td>
                      <td
                        style={{
                          padding: '10px 10px',
                          fontSize: '12px',
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
              id="invoice-footer-row"
              className="invoice-footer-row"
              style={{
                paddingTop: isMobile ? '16px' : '20px',
                borderTop: '2px solid #0f172a',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'flex-start',
                justifyContent: 'space-between',
                gap: isMobile ? '14px' : '20px',
              }}
            >
              {/* Left Column: Calculation notes and details */}
              <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.7, flex: 1 }}>
                <div style={{ margin: 0, color: '#334155', fontWeight: 600 }}>
                  إجمالي عدد المنتجات في الفاتورة: {invoice.items.length}
                </div>
                <div style={{ margin: '2px 0 0 0', color: '#64748b' }}>
                  طريقة الحساب: (الطول × العرض) ÷ 10,000 × سعر المتر ({invoice.meterPrice || FIXED_METER_PRICE} د) + الرسوم الإضافية
                </div>
                {(invoice.invoiceNotes || invoice.notes) && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11px',
                      color: '#1e293b',
                    }}
                  >
                    <strong>ملاحظات الفاتورة:</strong> {invoice.invoiceNotes || invoice.notes}
                  </div>
                )}
              </div>

              {/* Right Column: Totals Card */}
              <div
                id="invoice-totals-card"
                className="invoice-totals-card"
                style={{
                  width: isMobile ? '100%' : '300px',
                  backgroundColor: '#f8fafc',
                  padding: isMobile ? '12px 14px' : '16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#475569',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ color: '#475569' }}>إجمالي المساحة (م²):</span>
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

                {Boolean(invoice.discount && invoice.discount > 0) && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#475569',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ color: '#475569' }}>المجموع قبل الخصم:</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#0f172a',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {formatCurrency(
                          invoice.subTotal !== undefined
                            ? invoice.subTotal
                            : invoice.grandTotal + (invoice.discount || 0)
                        )}{' '}
                        دينار
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        color: '#b91c1c',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ color: '#b91c1c', fontWeight: 700 }}>قيمة الخصم:</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: '#b91c1c',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        - {formatCurrency(invoice.discount || 0)} دينار
                      </span>
                    </div>
                  </>
                )}

                <div
                  style={{
                    paddingTop: '10px',
                    borderTop: '1px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: isMobile ? '15px' : '16px',
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  <span style={{ color: '#0f172a' }}>
                    {invoice.discount && invoice.discount > 0 ? 'المجموع بعد الخصم:' : 'المجموع الكلي:'}
                  </span>
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
    </div>
  );
};
