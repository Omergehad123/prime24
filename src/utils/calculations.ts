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
 * Calculates extra fees for a line item based on:
 * - layerType: 'double' adds 10 denar, 'single' adds 0.
 * - colorChoice: 'other' adds 5 denar, 'white'/'black' adds 0 (free).
 */
export function getItemExtraFees(
  layerType: LayerType = 'single',
  colorChoice: ColorChoice = 'white',
  colorCode?: string | number
): {
  layerFee: number;
  colorFee: number;
  totalExtra: number;
} {
  const layerFee = layerType === 'double' ? DOUBLE_LAYER_EXTRA_FEE : 0;
  const colorFee = isFreeColor(colorChoice, colorCode) ? 0 : OTHER_COLOR_EXTRA_FEE;
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
 * (Area in m² × meterPrice) + (10 if double) + (5 if other color)
 */
export function calculateItemPrice(
  length: number,
  width: number,
  meterPrice: number = DEFAULT_METER_PRICE,
  layerType: LayerType = 'single',
  colorChoice: ColorChoice = 'white',
  colorCode?: string | number
): number {
  const totalMeters = calculateItemMeters(length, width);
  const safeRate = Math.max(0, Number(meterPrice !== undefined ? meterPrice : DEFAULT_METER_PRICE));
  const basePrice = totalMeters * safeRate;
  const { totalExtra } = getItemExtraFees(layerType, colorChoice, colorCode);
  return Number((basePrice + totalExtra).toFixed(2));
}

/**
 * Recalculates an entire array of invoice items automatically with the given meterPrice,
 * summing up dimensions, layer fees, color fees, and the overall grand total.
 */
export function recalculateAllItems(
  items: InvoiceItem[],
  meterPrice: number = DEFAULT_METER_PRICE
): {
  items: InvoiceItem[];
  totalMeters: number;
  grandTotal: number;
  totalDoubleFees: number;
  totalColorFees: number;
} {
  let totalMeters = 0;
  let grandTotal = 0;
  let totalDoubleFees = 0;
  let totalColorFees = 0;
  const safeRate = Math.max(0, Number(meterPrice !== undefined ? meterPrice : DEFAULT_METER_PRICE));

  const updatedItems = items.map((item) => {
    const totalDimensions = calculateItemMeters(item.length, item.width);

    // Resolve colorChoice if undefined
    let resolvedChoice: ColorChoice = item.colorChoice || 'white';
    if (!item.colorChoice) {
      if (isFreeColor(undefined, item.colorCode)) {
        const str = String(item.colorCode ?? '').trim().toLowerCase();
        resolvedChoice = str.includes('أسود') || str.includes('اسود') || str === 'black' ? 'black' : 'white';
      } else {
        resolvedChoice = 'other';
      }
    }

    const { layerFee, colorFee, totalExtra } = getItemExtraFees(
      item.layerType,
      resolvedChoice,
      item.colorCode
    );

    const basePrice = totalDimensions * safeRate;
    const itemPrice = Number((basePrice + totalExtra).toFixed(2));

    totalMeters += totalDimensions;
    grandTotal += itemPrice;
    totalDoubleFees += layerFee;
    totalColorFees += colorFee;

    // Resolve colorCode
    let finalColorCode = item.colorCode;
    if (resolvedChoice === 'white') {
      finalColorCode = 'أبيض';
    } else if (resolvedChoice === 'black') {
      finalColorCode = 'أسود';
    } else if (resolvedChoice === 'other') {
      finalColorCode =
        item.customColorNumber !== undefined && item.customColorNumber !== ''
          ? item.customColorNumber
          : typeof item.colorCode === 'number' ||
            (typeof item.colorCode === 'string' &&
              !['أبيض', 'ابيض', 'white', 'أسود', 'اسود', 'black'].includes(item.colorCode))
          ? item.colorCode
          : '';
    }

    return {
      ...item,
      colorChoice: resolvedChoice,
      colorCode: finalColorCode,
      totalDimensions,
      itemPrice,
    };
  });

  return {
    items: updatedItems,
    totalMeters: Number(totalMeters.toFixed(4)),
    grandTotal: Number(grandTotal.toFixed(2)),
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
