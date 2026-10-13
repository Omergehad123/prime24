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
export type ColorChoice = 'white' | 'black' | 'other';
export type BlackOutColor = 'gray' | 'black' | 'beige' | 'brown' | 'رصاصي' | 'أسود' | 'بيج' | 'بني';

export interface IInvoiceItem {
  id: string;
  type: ProductType; // 'black_screen' | 'black_out'
  productType?: ProductType; // alias for compatibility
  length: number; // الطول (سم)
  width: number; // العرض (سم)
  totalDimensions: number; // يحسب تلقائياً = (الطول × العرض) ÷ 10000
  colorChoice?: ColorChoice; // 'white' | 'black' | 'other' (لون الفريم)
  frameColorChoice?: ColorChoice;
  customColorNumber?: string | number;
  colorCode: string | number; // أبيض | أسود | كود اللون
  frameColor?: string | number;
  blackOutColor?: string; // لون قماش البلاك أوت (مجاني)
  layerType: LayerType; // 'single' | 'double'
  itemPrice: number; // يحسب تلقائياً = (الأبعاد × سعر المتر) + (دبل ? 10 : 0) + (فريم آخر ? 5 : 0)
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
  subTotal?: number; // المجموع الفرعي قبل الخصم
  discount?: number; // قيمة الخصم بالدينار
  grandTotal: number; // المجموع الكلي بعد الخصم
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
    colorChoice: {
      type: String,
      enum: ['white', 'black', 'other'],
      default: 'white',
    },
    frameColorChoice: {
      type: String,
      enum: ['white', 'black', 'other'],
      default: 'white',
    },
    frameColor: {
      type: Schema.Types.Mixed,
      default: 'أبيض',
    },
    blackOutColor: {
      type: String,
      default: 'black',
    },
    customColorNumber: {
      type: Schema.Types.Mixed,
      default: '',
    },
    colorCode: {
      type: Schema.Types.Mixed,
      required: [true, 'كود اللون أو اختياره مطلوب'],
      default: 'أبيض',
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
    subTotal: {
      type: Number,
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
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
// 1. totalDimensions (m²) = (length × width) / 10000
// 2. layerFee = 10 if double, 0 if single
// 3. colorFee = 0 if white/black, 5 if other
// 4. itemPrice = (totalDimensions * meterPrice) + layerFee + colorFee
// 5. totalMeters = sum of all totalDimensions
// 6. grandTotal = sum of all itemPrices
InvoiceSchema.pre('validate', function (this: any) {
  let computedTotalMeters = 0;
  let computedGrandTotal = 0;
  const currentAreaPrice = Math.max(0, Number(this.meterPrice !== undefined ? this.meterPrice : 10));
  this.meterPrice = currentAreaPrice;

  if (Array.isArray(this.items)) {
    this.items = this.items.map((item: any) => {
      const length = Math.max(0, Number(item.length) || 0);
      const width = Math.max(0, Number(item.width) || 0);
      // حساب إجمالي الأبعاد (م²): (الطول_سم × العرض_سم) ÷ 10,000
      const totalDimensions = Number(((length * width) / 10000).toFixed(4));

      const layerType = item.layerType || 'single';
      const layerFee = layerType === 'double' ? 10 : 0;

      const pType = (item.type || item.productType || this.invoiceType || 'black_screen') as ProductType;
      const isBlackOut = pType === 'black_out';

      // Frame color choice: white & black are free, other adds 5 denar
      let frameChoice = item.frameColorChoice || item.colorChoice;
      const rawCandidate = String(item.frameColor ?? item.colorCode ?? '').trim().toLowerCase();
      if (!frameChoice) {
        if (
          rawCandidate === 'أبيض' ||
          rawCandidate === 'ابيض' ||
          rawCandidate === 'white'
        ) {
          frameChoice = 'white';
        } else if (
          rawCandidate === 'أسود' ||
          rawCandidate === 'اسود' ||
          rawCandidate === 'black'
        ) {
          frameChoice = 'black';
        } else if (['gray', 'beige', 'brown', 'رصاصي', 'بيج', 'بني'].includes(rawCandidate)) {
          frameChoice = 'white';
        } else if (rawCandidate) {
          frameChoice = 'other';
        } else {
          frameChoice = 'white';
        }
      }

      // In blackout, fabric colors are always free; only custom frame color adds 5
      const colorFee = frameChoice === 'other' ? 5 : 0;

      // حساب سعر البند تلقائياً = (الأبعاد × سعر المتر) + رسوم الدبل + رسوم لون الفريم
      const itemPrice = Number(
        (totalDimensions * currentAreaPrice + layerFee + colorFee).toFixed(2)
      );

      computedTotalMeters += totalDimensions;
      computedGrandTotal += itemPrice;

      let finalFrameColor: string | number = 'أبيض';
      if (frameChoice === 'white') {
        finalFrameColor = 'أبيض';
      } else if (frameChoice === 'black') {
        finalFrameColor = 'أسود';
      } else if (frameChoice === 'other') {
        finalFrameColor =
          item.customColorNumber !== undefined && item.customColorNumber !== ''
            ? item.customColorNumber
            : item.frameColor !== undefined && item.frameColor !== ''
            ? item.frameColor
            : item.colorCode !== undefined
            ? item.colorCode
            : '';
      }

      const finalBlackOutColor = isBlackOut
        ? item.blackOutColor || (['gray', 'black', 'beige', 'brown', 'رصاصي', 'أسود', 'بيج', 'بني'].includes(String(item.colorCode)) ? String(item.colorCode) : 'black')
        : undefined;

      return {
        ...item,
        id: item.id || new mongoose.Types.ObjectId().toString(),
        type: pType,
        productType: pType,
        length,
        width,
        totalDimensions,
        layerType,
        colorChoice: frameChoice,
        frameColorChoice: frameChoice,
        frameColor: finalFrameColor,
        customColorNumber: frameChoice === 'other' ? finalFrameColor : '',
        blackOutColor: finalBlackOutColor,
        colorCode: finalFrameColor,
        itemPrice,
        notes: item.notes || '',
      };
    });
  }

  const safeDiscount = Math.max(0, Number(this.discount) || 0);
  this.discount = safeDiscount;
  this.totalMeters = Number(computedTotalMeters.toFixed(4));
  this.subTotal = Number(computedGrandTotal.toFixed(2));
  this.grandTotal = Math.max(0, Number((computedGrandTotal - safeDiscount).toFixed(2)));
});

export const InvoiceModel =
  mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
