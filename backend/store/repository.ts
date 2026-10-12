/**
 * @file backend/store/repository.ts
 * @description Database Repository Layer for Prime 24 Invoice System connected to MongoDB Atlas.
 * Formula:
 * - totalDimensions = (length + width)
 * - itemPrice = totalDimensions * meterPrice (Area Price)
 * - totalMeters = sum of totalDimensions
 * - grandTotal = totalMeters * meterPrice
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { InvoiceModel, IInvoice, IInvoiceItem, ProductType } from '../models/Invoice.js';

const DATA_FILE = path.resolve(process.cwd(), 'backend', 'store', 'prime24_v2_invoices_db.json');

export interface InvoiceRecord {
  _id: string;
  invoiceNumber: string;
  sequenceNumber: number;
  brandName: string;
  meterPrice: number;
  invoiceType: ProductType;
  items: IInvoiceItem[];
  totalMeters: number;
  grandTotal: number;
  invoiceNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const INITIAL_SEED_INVOICES: InvoiceRecord[] = [];

class InvoiceRepository {
  private isMongoConnected = false;
  private localCache: InvoiceRecord[] = [];

  constructor() {
    this.loadLocalStore();
  }

  private loadLocalStore() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.localCache = JSON.parse(raw);
      } else {
        this.localCache = [];
        this.saveLocalStore();
      }
    } catch {
      this.localCache = [];
    }
  }

  private saveLocalStore() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.localCache, null, 2), 'utf-8');
    } catch {
      // Ignore write error in read-only filesystems
    }
  }

  public async connectMongo(uri?: string): Promise<{ mode: 'mongodb' | 'hybrid-local'; uri: string }> {
    const mongoUri = uri || process.env.MONGODB_URI || '';
    if (!mongoUri || mongoUri === 'MY_MONGODB_URI') {
      this.isMongoConnected = false;
      return { mode: 'hybrid-local', uri: 'local-mongoose-validated-store' };
    }

    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
      });
      this.isMongoConnected = true;

      console.log(`[MongoDB Connected] Connected to Atlas Database: ${mongoose.connection.name}`);
      return { mode: 'mongodb', uri: mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') };
    } catch (err: any) {
      console.error(`[MongoDB Connection Error]:`, err.message);
      this.isMongoConnected = false;
      return { mode: 'hybrid-local', uri: 'local-mongoose-validated-store (fallback)' };
    }
  }

  public getEngineStatus() {
    return {
      isMongoConnected: this.isMongoConnected,
      engine: this.isMongoConnected ? 'MongoDB Native Atlas Connection' : 'Mongoose Schema Validator + Persistent JSON Store',
      totalRecords: this.localCache.length,
      databaseName: mongoose.connection.name || 'prime24',
    };
  }

  private validateWithMongooseSchema(data: Partial<InvoiceRecord>): InvoiceRecord {
    const doc = new InvoiceModel(data);
    const validationError = doc.validateSync();
    if (validationError) {
      const messages = Object.values(validationError.errors).map((e: any) => e.message);
      throw new Error(messages.join(' | '));
    }
    const obj = doc.toObject();
    return {
      ...obj,
      _id: (data._id || obj._id).toString(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates the next sequential invoice number starting strictly from 1 (1, 2, 3...)
   */
  public async getNextInvoiceNumber(): Promise<{ invoiceNumber: string; sequenceNumber: number }> {
    if (this.isMongoConnected) {
      const latest = await InvoiceModel.findOne().sort({ sequenceNumber: -1 }).lean<IInvoice>();
      let nextSeq = 1;
      if (latest && typeof latest.sequenceNumber === 'number' && latest.sequenceNumber >= 1) {
        nextSeq = latest.sequenceNumber + 1;
      } else {
        const count = await InvoiceModel.countDocuments();
        nextSeq = count > 0 ? count + 1 : 1;
      }
      return { invoiceNumber: String(nextSeq), sequenceNumber: nextSeq };
    }

    const maxSeq = this.localCache.reduce(
      (max, inv) => (inv.sequenceNumber > max ? inv.sequenceNumber : max),
      0
    );
    const nextSeq = maxSeq >= 1 ? maxSeq + 1 : (this.localCache.length > 0 ? this.localCache.length + 1 : 1);
    return { invoiceNumber: String(nextSeq), sequenceNumber: nextSeq };
  }

  public async findAll(filters?: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    invoiceType?: string;
  }): Promise<InvoiceRecord[]> {
    let records: InvoiceRecord[] = [];

    if (this.isMongoConnected) {
      const docs = await InvoiceModel.find().sort({ createdAt: -1 }).lean();
      records = docs.map((d: any) => ({
        ...d,
        _id: d._id.toString(),
        createdAt: new Date(d.createdAt).toISOString(),
        updatedAt: new Date(d.updatedAt).toISOString(),
      }));
    } else {
      records = [...this.localCache].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    if (filters) {
      if (filters.search && filters.search.trim() !== '') {
        const q = filters.search.trim().toLowerCase();
        records = records.filter(
          (r) =>
            r.invoiceNumber.toLowerCase().includes(q) ||
            r.brandName.toLowerCase().includes(q) ||
            (r.invoiceNotes && r.invoiceNotes.toLowerCase().includes(q)) ||
            (r.notes && r.notes.toLowerCase().includes(q)) ||
            r.items.some(
              (item) =>
                String(item.colorCode).toLowerCase().includes(q) ||
                (item.notes && item.notes.toLowerCase().includes(q))
            )
        );
      }

      if (
        filters.invoiceType &&
        (filters.invoiceType === 'black_screen' || filters.invoiceType === 'black_out')
      ) {
        records = records.filter(
          (r) =>
            r.invoiceType === filters.invoiceType ||
            r.items.some((it) => (it.type || it.productType) === filters.invoiceType)
        );
      }

      if (filters.dateFrom) {
        const fromTime = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
        records = records.filter((r) => new Date(r.createdAt).getTime() >= fromTime);
      }

      if (filters.dateTo) {
        const toTime = new Date(filters.dateTo).setHours(23, 59, 59, 999);
        records = records.filter((r) => new Date(r.createdAt).getTime() <= toTime);
      }
    }

    return records;
  }

  public async findById(id: string): Promise<InvoiceRecord | null> {
    if (this.isMongoConnected) {
      const doc: any = await InvoiceModel.findById(id).lean();
      if (!doc) return null;
      return {
        ...doc,
        _id: doc._id.toString(),
        createdAt: new Date(doc.createdAt).toISOString(),
        updatedAt: new Date(doc.updatedAt).toISOString(),
      };
    }

    return this.localCache.find((inv) => inv._id === id) || null;
  }

  public async create(payload: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
    const nextNum = await this.getNextInvoiceNumber();
    const invoiceNumber = payload.invoiceNumber?.trim() || nextNum.invoiceNumber;
    const sequenceNumber = payload.sequenceNumber || nextNum.sequenceNumber;

    const prepared = this.validateWithMongooseSchema({
      ...payload,
      invoiceNumber,
      sequenceNumber,
    });

    if (this.isMongoConnected) {
      const created = await InvoiceModel.create({
        invoiceNumber: prepared.invoiceNumber,
        sequenceNumber: prepared.sequenceNumber,
        brandName: prepared.brandName,
        meterPrice: prepared.meterPrice,
        invoiceType: prepared.invoiceType,
        items: prepared.items,
        totalMeters: prepared.totalMeters,
        grandTotal: prepared.grandTotal,
        invoiceNotes: prepared.invoiceNotes || prepared.notes || '',
        notes: prepared.notes || prepared.invoiceNotes || '',
      });
      const obj = created.toObject();
      return {
        ...obj,
        _id: obj._id.toString(),
        createdAt: new Date(obj.createdAt).toISOString(),
        updatedAt: new Date(obj.updatedAt).toISOString(),
      };
    }

    const duplicate = this.localCache.find((inv) => inv.invoiceNumber === prepared.invoiceNumber);
    if (duplicate) {
      const fallbackNext = await this.getNextInvoiceNumber();
      prepared.invoiceNumber = fallbackNext.invoiceNumber;
      prepared.sequenceNumber = fallbackNext.sequenceNumber;
    }

    this.localCache.unshift(prepared);
    this.saveLocalStore();
    return prepared;
  }

  public async update(id: string, payload: Partial<InvoiceRecord>): Promise<InvoiceRecord | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const prepared = this.validateWithMongooseSchema({
      ...existing,
      ...payload,
      _id: existing._id,
      invoiceNumber: payload.invoiceNumber || existing.invoiceNumber,
      sequenceNumber: existing.sequenceNumber,
      createdAt: existing.createdAt,
    });

    if (this.isMongoConnected) {
      const updated: any = await InvoiceModel.findByIdAndUpdate(
        id,
        {
          brandName: prepared.brandName,
          meterPrice: prepared.meterPrice,
          invoiceType: prepared.invoiceType,
          items: prepared.items,
          totalMeters: prepared.totalMeters,
          grandTotal: prepared.grandTotal,
          invoiceNotes: prepared.invoiceNotes || prepared.notes || '',
          notes: prepared.notes || prepared.invoiceNotes || '',
        },
        { new: true, runValidators: true }
      ).lean();

      if (!updated) return null;
      return {
        ...updated,
        _id: updated._id.toString(),
        createdAt: new Date(updated.createdAt).toISOString(),
        updatedAt: new Date(updated.updatedAt).toISOString(),
      };
    }

    const index = this.localCache.findIndex((inv) => inv._id === id);
    if (index === -1) return null;
    this.localCache[index] = prepared;
    this.saveLocalStore();
    return prepared;
  }

  public async delete(id: string): Promise<boolean> {
    if (this.isMongoConnected) {
      const res = await InvoiceModel.findByIdAndDelete(id);
      return !!res;
    }

    const initialLen = this.localCache.length;
    this.localCache = this.localCache.filter((inv) => inv._id !== id);
    if (this.localCache.length !== initialLen) {
      this.saveLocalStore();
      return true;
    }
    return false;
  }
}

export const invoiceRepository = new InvoiceRepository();
