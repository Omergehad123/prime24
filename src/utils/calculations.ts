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

import { InvoiceItem, ProductType, DEFAULT_METER_PRICE } from '../types/invoice';

export const FIXED_METER_PRICE = DEFAULT_METER_PRICE;

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
 * Calculates item price automatically = (length × width) * meterPrice.
 */
export function calculateItemPrice(
  length: number,
  width: number,
  meterPrice: number = DEFAULT_METER_PRICE
): number {
  const totalMeters = calculateItemMeters(length, width);
  const safeRate = Math.max(0, Number(meterPrice !== undefined ? meterPrice : DEFAULT_METER_PRICE));
  return Number((totalMeters * safeRate).toFixed(2));
}

/**
 * Recalculates an entire array of invoice items automatically with the given meterPrice.
 */
export function recalculateAllItems(
  items: InvoiceItem[],
  meterPrice: number = DEFAULT_METER_PRICE
): {
  items: InvoiceItem[];
  totalMeters: number;
  grandTotal: number;
} {
  let totalMeters = 0;
  let grandTotal = 0;
  const safeRate = Math.max(0, Number(meterPrice !== undefined ? meterPrice : DEFAULT_METER_PRICE));

  const updatedItems = items.map((item) => {
    const totalDimensions = calculateItemMeters(item.length, item.width);
    const itemPrice = calculateItemPrice(item.length, item.width, safeRate);

    totalMeters += totalDimensions;
    grandTotal += itemPrice;

    return {
      ...item,
      totalDimensions,
      itemPrice,
    };
  });

  return {
    items: updatedItems,
    totalMeters: Number(totalMeters.toFixed(4)),
    grandTotal: Number(grandTotal.toFixed(2)),
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
