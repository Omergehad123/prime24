/**
 * @file src/types/invoice.ts
 * @description Frontend TypeScript types and constants for Prime 24 Invoices.
 */

export type ProductType = 'black_screen' | 'black_out';
export type LayerType = 'single' | 'double';
export type ColorChoice = 'white' | 'black' | 'other';

export const DOUBLE_LAYER_EXTRA_FEE = 10;
export const OTHER_COLOR_EXTRA_FEE = 5;

export const COLOR_CHOICE_OPTIONS = [
  { value: 'white', label: 'أبيض (مجاني)', fee: 0 },
  { value: 'black', label: 'أسود (مجاني)', fee: 0 },
  { value: 'other', label: 'آخر (+5 د)', fee: 5 },
] as const;

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
  length: number; // الطول (سم)
  width: number; // العرض (سم)
  totalDimensions: number; // الطول × العرض (م²)
  colorChoice?: ColorChoice; // 'white' | 'black' | 'other'
  customColorNumber?: string | number; // رقم اللون عند اختيار "آخر"
  colorCode: string | number; // شبك: أبيض | أسود | رقم يدخله المستخدم | بلاك أوت
  layerType: LayerType; // 'single' | 'double'
  itemPrice: number; // يحسب تلقائياً = (totalDimensions * meterPrice) + (دبل ? 10 : 0) + (لون آخر ? 5 : 0)
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
