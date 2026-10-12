/**
 * @file src/types/invoice.ts
 * @description Frontend TypeScript types and constants for Prime 24 Invoices.
 */

export type ProductType = 'black_screen' | 'black_out';
export type LayerType = 'single' | 'double';

export const BLACK_OUT_COLOR_OPTIONS = [
  { value: 'gray', label: 'رصاصي (Gray)' },
  { value: 'black', label: 'أسود (Black)' },
  { value: 'beige', label: 'بيج (Beige)' },
  { value: 'brown', label: 'بني (Brown)' },
] as const;

export const BLACK_OUT_COLORS = ['gray', 'black', 'beige', 'brown', 'رصاصي', 'أسود', 'بيج', 'بني'] as const;

export const DEFAULT_METER_PRICE = 10; // سعر المتر الافتراضي (يمكن للمدير تعديله في كل فاتورة)
export const FIXED_METER_PRICE = DEFAULT_METER_PRICE;
export const BRAND_LOGO_URL = 'https://d.top4top.io/p_3936i8brd1.jpg';

export interface InvoiceItem {
  id: string;
  type?: ProductType;
  productType: ProductType; // 'black_screen' | 'black_out'
  length: number; // الطول
  width: number; // العرض
  totalDimensions: number; // الطول × العرض
  colorCode: string | number; // بلاك سكرين: رقم يدخله المستخدم | بلاك أوت: gray || black || beige || brown
  layerType: LayerType; // 'single' | 'double'
  itemPrice: number; // يحسب تلقائياً = totalDimensions * meterPrice
  notes: string; // ملاحظة للبند
}

export interface Invoice {
  _id?: string;
  invoiceNumber: string;
  sequenceNumber?: number;
  brandName: string; // Prime 24
  meterPrice: number; // سعر المتر / المساحة المحدد للفاتورة (قابل للتعديل)
  invoiceType: ProductType;
  items: InvoiceItem[];
  totalMeters: number;
  grandTotal: number;
  invoiceNotes?: string; // ملاحظة للفاتورة
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
