/**
 * @file src/services/invoiceApi.ts
 * @description Frontend API service layer communicating with the Express/MongoDB backend.
 */

import { Invoice } from '../types/invoice';

const API_BASE = '/api/invoices';

export interface InvoiceFilterParams {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  invoiceType?: string;
}

export const invoiceApi = {
  async getLogoBase64(): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/logo-base64`);
      const json = await res.json();
      if (res.ok && json.success && json.dataUrl) {
        return json.dataUrl;
      }
      return null;
    } catch {
      return null;
    }
  },

  async getNextNumber(): Promise<{ invoiceNumber: string; sequenceNumber: number }> {
    const res = await fetch(`${API_BASE}/next-number`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'تعذر جلب رقم الفاتورة التالي');
    }
    return {
      invoiceNumber: json.invoiceNumber,
      sequenceNumber: json.sequenceNumber,
    };
  },

  async getAll(filters?: InvoiceFilterParams): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.invoiceType && filters.invoiceType !== 'all') {
      params.set('invoiceType', filters.invoiceType);
    }

    const queryString = params.toString();
    const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'تعذر تحميل صفحة الفواتير');
    }
    return json.data;
  },

  async getById(id: string): Promise<Invoice> {
    const res = await fetch(`${API_BASE}/${id}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'تعذر العثور على الفاتورة');
    }
    return json.data;
  },

  async create(invoice: Omit<Invoice, '_id'>): Promise<Invoice> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'فشل في حفظ الفاتورة');
    }
    return json.data;
  },

  async update(id: string, invoice: Partial<Invoice>): Promise<Invoice> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'فشل في تحديث الفاتورة');
    }
    return json.data;
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'فشل في حذف الفاتورة');
    }
  },
};
