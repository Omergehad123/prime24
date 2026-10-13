/**
 * @file src/utils/calculations.ts
 * @description Mathematical calculation functions for Prime 24 Invoice items and totals.
 * Formula:
 * - Inputs are in CENTIMETERS (cm).
 * - Total Dimensions (m²) = (length_cm × width_cm) / 10000
 * - Item Price = totalDimensions * meterPrice (Area Price)
 * - Total Meters = sum of totalDimensions (in m²)
 * - Grand Total = sum of Item Prices (or totalMeters * meterPrice)
 */

import {
  InvoiceItem,
  ProductType,
  LayerType,
  ColorChoice,
  DEFAULT_METER_PRICE,
  DOUBLE_LAYER_EXTRA_FEE,
  OTHER_COLOR_EXTRA_FEE,
} from '../types/invoice';

export const FIXED_METER_PRICE = DEFAULT_METER_PRICE;

/**
 * Checks whether a color is considered free (white or black).
 */
export function isFreeColor(colorChoice?: string, colorCode?: string | number): boolean {
  if (colorChoice === 'white' || colorChoice === 'black') return true;
  if (colorChoice === 'other') return false;

  const str = String(colorCode ?? '').trim().toLowerCase();
  return (
    str === 'أبيض' ||
    str === 'ابيض' ||
    str === 'white' ||
    str === 'أسود' ||
    str === 'اسود' ||
    str === 'black'
  );
}

/**
 * Returns user-friendly Arabic label for Black Out fabric colors.
 * All 4 colors (gray, black, beige, brown) are 100% free.
 */
export function getBlackOutColorLabel(val?: string): string {
  switch (val) {
    case 'gray':
    case 'رصاصي':
      return 'رصاصي';
    case 'black':
    case 'أسود':
    case 'اسود':
      return 'أسود';
    case 'beige':
    case 'بيج':
      return 'بيج';
    case 'brown':
    case 'بني':
      return 'بني';
    default:
      return val || 'أسود';
  }
}

/**
 * Calculates extra fees for a line item based on:
 * - layerType: 'double' adds 10 denar, 'single' adds 0.
 * - Frame Color (for both شبك and بلاك أوت): 'white' and 'black' are free (0), 'other' adds 5 denar.
 * - Black Out fabric colors: all 4 colors are free (0).
 */
export function getItemExtraFees(
  layerType: LayerType = 'single',
  colorChoice: ColorChoice = 'white',
  colorCode?: string | number,
  frameColorChoice?: ColorChoice
): {
  layerFee: number;
  colorFee: number;
  totalExtra: number;
} {
  const layerFee = layerType === 'double' ? DOUBLE_LAYER_EXTRA_FEE : 0;
  const effectiveFrameChoice = frameColorChoice || colorChoice;
  const colorFee = effectiveFrameChoice === 'other' ? OTHER_COLOR_EXTRA_FEE : 0;

  return {
    layerFee,
    colorFee,
    totalExtra: layerFee + colorFee,
  };
}

/**
 * Calculates total area in m² from cm inputs.
 * Formula: (length_cm × width_cm) / 10000
 */
export function calculateItemMeters(length: number, width: number): number {
  const safeLength = Math.max(0, Number(length) || 0);
  const safeWidth = Math.max(0, Number(width) || 0);
  return Number(((safeLength * safeWidth) / 10000).toFixed(4));
}

/**
 * Calculates item price automatically:
 * (Area in m² × meterPrice) + (10 if double) + (5 if other frame color)
 */
export function calculateItemPrice(
  length: number,
  width: number,
  meterPrice: number = DEFAULT_METER_PRICE,
  layerType: LayerType = 'single',
  colorChoice: ColorChoice = 'white',
  colorCode?: string | number,
  frameColorChoice?: ColorChoice
): number {
  const totalMeters = calculateItemMeters(length, width);
  const safeRate = Math.max(0, Number(meterPrice !== undefined ? meterPrice : DEFAULT_METER_PRICE));
  const basePrice = totalMeters * safeRate;
  const { totalExtra } = getItemExtraFees(layerType, colorChoice, colorCode, frameColorChoice);
  return Number((basePrice + totalExtra).toFixed(2));
}

/**
 * Recalculates an entire array of invoice items automatically with the given meterPrice and optional discount,
 * summing up dimensions, layer fees, frame color fees, subtotal, and the final grand total after discount.
 */
export function recalculateAllItems(
  items: InvoiceItem[],
  meterPrice: number = DEFAULT_METER_PRICE,
  discount: number = 0
): {
  items: InvoiceItem[];
  totalMeters: number;
  subTotal: number;
  discount: number;
  grandTotal: number;
  totalDoubleFees: number;
  totalColorFees: number;
} {
  let totalMeters = 0;
  let itemsSum = 0;
  let totalDoubleFees = 0;
  let totalColorFees = 0;
  const safeRate = Math.max(0, Number(meterPrice !== undefined ? meterPrice : DEFAULT_METER_PRICE));
  const safeDiscount = Math.max(0, Number(discount) || 0);

  const updatedItems = items.map((item) => {
    const totalDimensions = calculateItemMeters(item.length, item.width);
    const pType = item.type || item.productType || 'black_screen';
    const isBlackOut = pType === 'black_out';

    // Resolve frame color choice (white/black are free, other adds 5)
    let resolvedFrameChoice: ColorChoice = item.frameColorChoice || item.colorChoice || 'white';
    if (!item.frameColorChoice && !item.colorChoice) {
      const candidate = String(item.frameColor ?? item.colorCode ?? '').trim().toLowerCase();
      if (candidate === 'أبيض' || candidate === 'ابيض' || candidate === 'white') {
        resolvedFrameChoice = 'white';
      } else if (candidate === 'أسود' || candidate === 'اسود' || candidate === 'black') {
        resolvedFrameChoice = 'black';
      } else if (['gray', 'beige', 'brown', 'رصاصي', 'بيج', 'بني'].includes(candidate)) {
        // Old blackout fabric color candidate, default frame to white
        resolvedFrameChoice = 'white';
      } else if (candidate) {
        resolvedFrameChoice = 'other';
      }
    }

    const { layerFee, colorFee, totalExtra } = getItemExtraFees(
      item.layerType,
      resolvedFrameChoice,
      item.colorCode,
      resolvedFrameChoice
    );

    const basePrice = totalDimensions * safeRate;
    const itemPrice = Number((basePrice + totalExtra).toFixed(2));

    totalMeters += totalDimensions;
    itemsSum += itemPrice;
    totalDoubleFees += layerFee;
    totalColorFees += colorFee;

    // Resolve frame color
    let finalFrameColor: string | number = 'أبيض';
    if (resolvedFrameChoice === 'white') {
      finalFrameColor = 'أبيض';
    } else if (resolvedFrameChoice === 'black') {
      finalFrameColor = 'أسود';
    } else {
      finalFrameColor =
        item.customColorNumber !== undefined && item.customColorNumber !== ''
          ? item.customColorNumber
          : item.frameColor !== undefined && item.frameColor !== ''
          ? item.frameColor
          : typeof item.colorCode === 'number' ||
            (typeof item.colorCode === 'string' &&
              !['أبيض', 'ابيض', 'white', 'أسود', 'اسود', 'black', 'gray', 'beige', 'brown', 'رصاصي', 'بيج', 'بني'].includes(item.colorCode))
          ? item.colorCode
          : '';
    }

    // Resolve blackout fabric color (default 'black')
    const finalBlackOutColor = isBlackOut
      ? item.blackOutColor || (['gray', 'black', 'beige', 'brown', 'رصاصي', 'أسود', 'بيج', 'بني'].includes(String(item.colorCode)) ? String(item.colorCode) : 'black')
      : undefined;

    return {
      ...item,
      type: pType,
      productType: pType,
      colorChoice: resolvedFrameChoice,
      frameColorChoice: resolvedFrameChoice,
      frameColor: finalFrameColor,
      customColorNumber: resolvedFrameChoice === 'other' ? finalFrameColor : '',
      blackOutColor: finalBlackOutColor,
      colorCode: isBlackOut ? finalFrameColor : finalFrameColor,
      totalDimensions,
      itemPrice,
    };
  });

  const subTotal = Number(itemsSum.toFixed(2));
  const grandTotal = Math.max(0, Number((subTotal - safeDiscount).toFixed(2)));

  return {
    items: updatedItems,
    totalMeters: Number(totalMeters.toFixed(4)),
    subTotal,
    discount: safeDiscount,
    grandTotal,
    totalDoubleFees,
    totalColorFees,
  };
}

export function getProductLabel(type: ProductType): string {
  return type === 'black_out' ? 'بلاك أوت' : 'شبك';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDimension(val: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(val || 0);
}
