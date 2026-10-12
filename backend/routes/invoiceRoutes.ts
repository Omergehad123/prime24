/**
 * @file backend/routes/invoiceRoutes.ts
 * @description Express REST API routes for Prime 24 Invoice CRUD, Auto-increment number generation, and Filtering.
 */

import { Router, Request, Response } from 'express';
import { invoiceRepository } from '../store/repository.js';

export const invoiceRouter = Router();

let cachedLogoDataUrl: string | null = null;
const BRAND_LOGO_EXTERNAL_URL = 'https://d.top4top.io/p_3936i8brd1.jpg';

/**
 * GET /api/invoices/logo-base64
 * Fetches the official brand logo server-side and returns a Base64 data URL
 * so html2canvas, jsPDF, and isolated A4 print always include the logo without CORS errors.
 */
invoiceRouter.get('/logo-base64', async (_req: Request, res: Response) => {
  try {
    if (cachedLogoDataUrl) {
      res.json({ success: true, dataUrl: cachedLogoDataUrl });
      return;
    }

    const response = await fetch(BRAND_LOGO_EXTERNAL_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Prime24InvoiceSystem/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    cachedLogoDataUrl = `data:${contentType};base64,${base64}`;

    res.json({
      success: true,
      dataUrl: cachedLogoDataUrl,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'تعذر جلب اللوجو',
    });
  }
});

/**
 * GET /api/invoices/next-number
 * Generates the next unique auto-incremented invoice number (e.g., INV-1003)
 */
invoiceRouter.get('/next-number', async (_req: Request, res: Response) => {
  try {
    const next = await invoiceRepository.getNextInvoiceNumber();
    res.json({
      success: true,
      ...next,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء توليد رقم الفاتورة',
    });
  }
});

/**
 * GET /api/invoices
 * Lists all saved invoices with optional search, invoiceType, and date range filters
 */
invoiceRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, dateFrom, dateTo, invoiceType } = req.query;
    const invoices = await invoiceRepository.findAll({
      search: typeof search === 'string' ? search : undefined,
      dateFrom: typeof dateFrom === 'string' ? dateFrom : undefined,
      dateTo: typeof dateTo === 'string' ? dateTo : undefined,
      invoiceType: typeof invoiceType === 'string' ? invoiceType : undefined,
    });

    res.json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'فشل في جلب الفواتير من قاعدة البيانات',
    });
  }
});

/**
 * GET /api/invoices/:id
 * Fetches a single invoice by ID
 */
invoiceRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await invoiceRepository.findById(req.params.id);
    if (!invoice) {
      res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة',
      });
      return;
    }
    res.json({
      success: true,
      data: invoice,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'خطأ في استرجاع الفاتورة',
    });
  }
});

/**
 * POST /api/invoices
 * Creates and validates a new invoice document using Mongoose Schema
 */
invoiceRouter.post('/', async (req: Request, res: Response) => {
  try {
    const created = await invoiceRepository.create(req.body);
    res.status(201).json({
      success: true,
      message: 'تم حفظ الفاتورة بنجاح',
      data: created,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'بيانات الفاتورة غير صالحة',
    });
  }
});

/**
 * PUT /api/invoices/:id
 * Updates an existing invoice document and recalculates totals
 */
invoiceRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await invoiceRepository.update(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'الفاتورة المراد تعديلها غير موجودة',
      });
      return;
    }
    res.json({
      success: true,
      message: 'تم تحديث الفاتورة بنجاح',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء تحديث الفاتورة',
    });
  }
});

/**
 * DELETE /api/invoices/:id
 * Deletes an invoice by ID
 */
invoiceRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await invoiceRepository.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة للحذف',
      });
      return;
    }
    res.json({
      success: true,
      message: 'تم حذف الفاتورة بنجاح',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء حذف الفاتورة',
    });
  }
});
