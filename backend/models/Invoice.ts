/**
 * @file backend/models/Invoice.ts
 * @description Mongoose Schema & Data Model for Prime 24 Invoices connected to MongoDB Atlas.
 * 
 * Specifications:
 * 1. Product (Item):
 *    - type: string ('black_screen' | 'black_out')
 *    - length: number
 *    - width: number
 *    - totalDimensions: auto counted as (length + width)
 *    - colorCode: number (if black_screen) OR one of 4 colors: gray | black | beige | brown (if black_out)
 *    - layerType: 'single' | 'double'
 *    - itemPrice: auto counted as (totalDimensions * areaPrice)
 *    - notes: string
 * 
 * 2. Invoice:
 *    - invoiceNumber: string (unique)
 *    - sequenceNumber: number
 *    - brandName: string
 *    - meterPrice: number (static area price per meter, e.g. 5, 10, etc. Admin can edit, invoice stores its current price)
 *    - invoiceType: 'black_screen' | 'black_out'
 *    - items: array of 1 or more products
 *    - totalMeters: auto counted as sum of totalDimensions
 *    - grandTotal: auto counted as (totalMeters * meterPrice)
 *    - invoiceNotes: string (note for the invoice)
 */

import mongoose, { Schema, Document } from 'mongoose';

export type ProductType = 'black_screen' | 'black_out';
export type LayerType = 'single' | 'double';
export type BlackOutColor = 'gray' | 'black' | 'beige' | 'brown' | 'رصاصي' | 'أسود' | 'بيج' | 'بني';

export interface IInvoiceItem {
  id: string;
  type: ProductType; // 'black_screen' | 'black_out'
  productType?: ProductType; // alias for compatibility
  length: number; // الطول
  width: number; // العرض
  totalDimensions: number; // يحسب تلقائياً = الطول + العرض
  colorCode: string | number; // رقم إذا كان بلاك سكرين، أو أحد الألوان الـ 4 إذا كان بلاك أوت
  layerType: LayerType; // 'single' | 'double'
  itemPrice: number; // يحسب تلقائياً = totalDimensions * meterPrice
  notes: string; // ملاحظة البند
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  sequenceNumber: number;
  brandName: string;
  meterPrice: number; // سعر المتر (Area Price) الحالي للفاتورة
  invoiceType: ProductType;
  items: IInvoiceItem[];
  totalMeters: number; // مجموع الأمتار = مجموع totalDimensions
  grandTotal: number; // المجموع الكلي = totalMeters * meterPrice
  invoiceNotes?: string; // ملاحظة للفاتورة
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    id: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    type: {
      type: String,
      enum: ['black_screen', 'black_out'],
      default: 'black_screen',
      required: true,
    },
    productType: {
      type: String,
      enum: ['black_screen', 'black_out'],
      default: 'black_screen',
    },
    length: {
      type: Number,
      required: [true, 'الطول مطلوب'],
      min: [0, 'الطول يجب أن يكون رقماً موجباً'],
      default: 0,
    },
    width: {
      type: Number,
      required: [true, 'العرض مطلوب'],
      min: [0, 'العرض يجب أن يكون رقماً موجباً'],
      default: 0,
    },
    totalDimensions: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    colorCode: {
      type: Schema.Types.Mixed,
      required: [true, 'كود اللون أو اختياره مطلوب'],
      default: '1',
    },
    layerType: {
      type: String,
      enum: ['single', 'double'],
      default: 'single',
      required: true,
    },
    itemPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'رقم الفاتورة مطلوب'],
      unique: true,
      index: true,
      trim: true,
    },
    sequenceNumber: {
      type: Number,
      required: true,
      index: true,
    },
    brandName: {
      type: String,
      required: [true, 'اسم البراند مطلوب'],
      trim: true,
      default: 'Prime 24',
    },
    meterPrice: {
      type: Number,
      required: [true, 'سعر المتر / المساحة مطلوب'],
      min: [0, 'سعر المتر يجب أن يكون رقماً موجباً'],
      default: 10, // القيمة الافتراضية لسعر المتر (Area Price)
    },
    invoiceType: {
      type: String,
      enum: ['black_screen', 'black_out'],
      default: 'black_screen',
      required: true,
    },
    items: {
      type: [InvoiceItemSchema],
      validate: [
        (val: IInvoiceItem[]) => Array.isArray(val) && val.length > 0,
        'يجب أن تحتوي الفاتورة على منتج واحد على الأقل',
      ],
    },
    totalMeters: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    invoiceNotes: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook:
// 1. totalDimensions = length + width
// 2. itemPrice = totalDimensions * meterPrice (Area Price)
// 3. totalMeters = sum of all totalDimensions
// 4. grandTotal = totalMeters * meterPrice
InvoiceSchema.pre('validate', function (this: any) {
  let computedTotalMeters = 0;
  let computedGrandTotal = 0;
  const currentAreaPrice = Math.max(0, Number(this.meterPrice !== undefined ? this.meterPrice : 10));
  this.meterPrice = currentAreaPrice;

  if (Array.isArray(this.items)) {
    this.items = this.items.map((item: any) => {
      const length = Math.max(0, Number(item.length) || 0);
      const width = Math.max(0, Number(item.width) || 0);
      // حساب إجمالي الأبعاد تلقائياً: الطول + العرض
      const totalDimensions = Number((length + width).toFixed(4));
      // حساب سعر البند تلقائياً: الأبعاد × سعر المتر (Area Price)
      const itemPrice = Number((totalDimensions * currentAreaPrice).toFixed(2));

      computedTotalMeters += totalDimensions;
      computedGrandTotal += itemPrice;

      const pType = (item.type || item.productType || this.invoiceType || 'black_screen') as ProductType;

      return {
        ...item,
        id: item.id || new mongoose.Types.ObjectId().toString(),
        type: pType,
        productType: pType,
        length,
        width,
        totalDimensions,
        itemPrice,
        layerType: item.layerType || 'single',
        colorCode: item.colorCode !== undefined ? item.colorCode : (pType === 'black_screen' ? 1 : 'beige'),
        notes: item.notes || '',
      };
    });
  }

  this.totalMeters = Number(computedTotalMeters.toFixed(4));
  this.grandTotal = Number(computedGrandTotal.toFixed(2));
});

export const InvoiceModel =
  mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
