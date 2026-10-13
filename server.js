// server.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// backend/store/repository.ts
import mongoose2 from "mongoose";
import fs from "fs";
import path from "path";

// backend/models/Invoice.ts
import mongoose, { Schema } from "mongoose";
var InvoiceItemSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString()
    },
    type: {
      type: String,
      enum: ["black_screen", "black_out"],
      default: "black_screen",
      required: true
    },
    productType: {
      type: String,
      enum: ["black_screen", "black_out"],
      default: "black_screen"
    },
    length: {
      type: Number,
      required: [true, "\u0627\u0644\u0637\u0648\u0644 \u0645\u0637\u0644\u0648\u0628"],
      min: [0, "\u0627\u0644\u0637\u0648\u0644 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B"],
      default: 0
    },
    width: {
      type: Number,
      required: [true, "\u0627\u0644\u0639\u0631\u0636 \u0645\u0637\u0644\u0648\u0628"],
      min: [0, "\u0627\u0644\u0639\u0631\u0636 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B"],
      default: 0
    },
    totalDimensions: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    colorChoice: {
      type: String,
      enum: ["white", "black", "other"],
      default: "white"
    },
    frameColorChoice: {
      type: String,
      enum: ["white", "black", "other"],
      default: "white"
    },
    frameColor: {
      type: Schema.Types.Mixed,
      default: "\u0623\u0628\u064A\u0636"
    },
    blackOutColor: {
      type: String,
      default: "black"
    },
    customColorNumber: {
      type: Schema.Types.Mixed,
      default: ""
    },
    colorCode: {
      type: Schema.Types.Mixed,
      required: [true, "\u0643\u0648\u062F \u0627\u0644\u0644\u0648\u0646 \u0623\u0648 \u0627\u062E\u062A\u064A\u0627\u0631\u0647 \u0645\u0637\u0644\u0648\u0628"],
      default: "\u0623\u0628\u064A\u0636"
    },
    layerType: {
      type: String,
      enum: ["single", "double"],
      default: "single",
      required: true
    },
    itemPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);
var InvoiceSchema = new Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, "\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0637\u0644\u0648\u0628"],
      unique: true,
      index: true,
      trim: true
    },
    sequenceNumber: {
      type: Number,
      required: true,
      index: true
    },
    brandName: {
      type: String,
      required: [true, "\u0627\u0633\u0645 \u0627\u0644\u0628\u0631\u0627\u0646\u062F \u0645\u0637\u0644\u0648\u0628"],
      trim: true,
      default: "Prime 24"
    },
    meterPrice: {
      type: Number,
      required: [true, "\u0633\u0639\u0631 \u0627\u0644\u0645\u062A\u0631 / \u0627\u0644\u0645\u0633\u0627\u062D\u0629 \u0645\u0637\u0644\u0648\u0628"],
      min: [0, "\u0633\u0639\u0631 \u0627\u0644\u0645\u062A\u0631 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645\u0627\u064B \u0645\u0648\u062C\u0628\u0627\u064B"],
      default: 10
      // القيمة الافتراضية لسعر المتر (Area Price)
    },
    invoiceType: {
      type: String,
      enum: ["black_screen", "black_out"],
      default: "black_screen",
      required: true
    },
    items: {
      type: [InvoiceItemSchema],
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        "\u064A\u062C\u0628 \u0623\u0646 \u062A\u062D\u062A\u0648\u064A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0639\u0644\u0649 \u0645\u0646\u062A\u062C \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"
      ]
    },
    totalMeters: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    subTotal: {
      type: Number,
      min: 0,
      default: 0
    },
    discount: {
      type: Number,
      min: 0,
      default: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    invoiceNotes: {
      type: String,
      trim: true,
      default: ""
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);
InvoiceSchema.pre("validate", function() {
  let computedTotalMeters = 0;
  let computedGrandTotal = 0;
  const currentAreaPrice = Math.max(0, Number(this.meterPrice !== void 0 ? this.meterPrice : 10));
  this.meterPrice = currentAreaPrice;
  if (Array.isArray(this.items)) {
    this.items = this.items.map((item) => {
      const length = Math.max(0, Number(item.length) || 0);
      const width = Math.max(0, Number(item.width) || 0);
      const totalDimensions = Number((length * width / 1e4).toFixed(4));
      const layerType = item.layerType || "single";
      const layerFee = layerType === "double" ? 10 : 0;
      const pType = item.type || item.productType || this.invoiceType || "black_screen";
      const isBlackOut = pType === "black_out";
      let frameChoice = item.frameColorChoice || item.colorChoice;
      const rawCandidate = String(item.frameColor ?? item.colorCode ?? "").trim().toLowerCase();
      if (!frameChoice) {
        if (rawCandidate === "\u0623\u0628\u064A\u0636" || rawCandidate === "\u0627\u0628\u064A\u0636" || rawCandidate === "white") {
          frameChoice = "white";
        } else if (rawCandidate === "\u0623\u0633\u0648\u062F" || rawCandidate === "\u0627\u0633\u0648\u062F" || rawCandidate === "black") {
          frameChoice = "black";
        } else if (["gray", "beige", "brown", "\u0631\u0635\u0627\u0635\u064A", "\u0628\u064A\u062C", "\u0628\u0646\u064A"].includes(rawCandidate)) {
          frameChoice = "white";
        } else if (rawCandidate) {
          frameChoice = "other";
        } else {
          frameChoice = "white";
        }
      }
      const colorFee = frameChoice === "other" ? 5 : 0;
      const itemPrice = Number(
        (totalDimensions * currentAreaPrice + layerFee + colorFee).toFixed(2)
      );
      computedTotalMeters += totalDimensions;
      computedGrandTotal += itemPrice;
      let finalFrameColor = "\u0623\u0628\u064A\u0636";
      if (frameChoice === "white") {
        finalFrameColor = "\u0623\u0628\u064A\u0636";
      } else if (frameChoice === "black") {
        finalFrameColor = "\u0623\u0633\u0648\u062F";
      } else if (frameChoice === "other") {
        finalFrameColor = item.customColorNumber !== void 0 && item.customColorNumber !== "" ? item.customColorNumber : item.frameColor !== void 0 && item.frameColor !== "" ? item.frameColor : item.colorCode !== void 0 ? item.colorCode : "";
      }
      const finalBlackOutColor = isBlackOut ? item.blackOutColor || (["gray", "black", "beige", "brown", "\u0631\u0635\u0627\u0635\u064A", "\u0623\u0633\u0648\u062F", "\u0628\u064A\u062C", "\u0628\u0646\u064A"].includes(String(item.colorCode)) ? String(item.colorCode) : "black") : void 0;
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
        customColorNumber: frameChoice === "other" ? finalFrameColor : "",
        blackOutColor: finalBlackOutColor,
        colorCode: finalFrameColor,
        itemPrice,
        notes: item.notes || ""
      };
    });
  }
  const safeDiscount = Math.max(0, Number(this.discount) || 0);
  this.discount = safeDiscount;
  this.totalMeters = Number(computedTotalMeters.toFixed(4));
  this.subTotal = Number(computedGrandTotal.toFixed(2));
  this.grandTotal = Math.max(0, Number((computedGrandTotal - safeDiscount).toFixed(2)));
});
var InvoiceModel = mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);

// backend/store/repository.ts
var DATA_FILE = path.resolve(process.cwd(), "backend", "store", "prime24_v2_invoices_db.json");
var InvoiceRepository = class {
  constructor() {
    this.isMongoConnected = false;
    this.localCache = [];
    this.loadLocalStore();
  }
  loadLocalStore() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        this.localCache = JSON.parse(raw);
      } else {
        this.localCache = [];
        this.saveLocalStore();
      }
    } catch {
      this.localCache = [];
    }
  }
  saveLocalStore() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.localCache, null, 2), "utf-8");
    } catch {
    }
  }
  async connectMongo(uri) {
    const mongoUri = uri || process.env.MONGODB_URI || "";
    if (!mongoUri || mongoUri === "MY_MONGODB_URI") {
      this.isMongoConnected = false;
      return { mode: "hybrid-local", uri: "local-mongoose-validated-store" };
    }
    try {
      await mongoose2.connect(mongoUri, {
        serverSelectionTimeoutMS: 1e4
      });
      this.isMongoConnected = true;
      console.log(`[MongoDB Connected] Connected to Atlas Database: ${mongoose2.connection.name}`);
      return { mode: "mongodb", uri: mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@") };
    } catch (err) {
      console.error(`[MongoDB Connection Error]:`, err.message);
      this.isMongoConnected = false;
      return { mode: "hybrid-local", uri: "local-mongoose-validated-store (fallback)" };
    }
  }
  getEngineStatus() {
    return {
      isMongoConnected: this.isMongoConnected,
      engine: this.isMongoConnected ? "MongoDB Native Atlas Connection" : "Mongoose Schema Validator + Persistent JSON Store",
      totalRecords: this.localCache.length,
      databaseName: mongoose2.connection.name || "prime24"
    };
  }
  validateWithMongooseSchema(data) {
    const doc = new InvoiceModel(data);
    const validationError = doc.validateSync();
    if (validationError) {
      const messages = Object.values(validationError.errors).map((e) => e.message);
      throw new Error(messages.join(" | "));
    }
    const obj = doc.toObject();
    return {
      ...obj,
      _id: (data._id || obj._id).toString(),
      createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Generates the next sequential invoice number starting strictly from 1 (1, 2, 3...)
   */
  async getNextInvoiceNumber() {
    if (this.isMongoConnected) {
      const latest = await InvoiceModel.findOne().sort({ sequenceNumber: -1 }).lean();
      let nextSeq2 = 1;
      if (latest && typeof latest.sequenceNumber === "number" && latest.sequenceNumber >= 1) {
        nextSeq2 = latest.sequenceNumber + 1;
      } else {
        const count = await InvoiceModel.countDocuments();
        nextSeq2 = count > 0 ? count + 1 : 1;
      }
      return { invoiceNumber: String(nextSeq2), sequenceNumber: nextSeq2 };
    }
    const maxSeq = this.localCache.reduce(
      (max, inv) => inv.sequenceNumber > max ? inv.sequenceNumber : max,
      0
    );
    const nextSeq = maxSeq >= 1 ? maxSeq + 1 : this.localCache.length > 0 ? this.localCache.length + 1 : 1;
    return { invoiceNumber: String(nextSeq), sequenceNumber: nextSeq };
  }
  async findAll(filters) {
    let records = [];
    if (this.isMongoConnected) {
      const docs = await InvoiceModel.find().sort({ createdAt: -1 }).lean();
      records = docs.map((d) => ({
        ...d,
        _id: d._id.toString(),
        createdAt: new Date(d.createdAt).toISOString(),
        updatedAt: new Date(d.updatedAt).toISOString()
      }));
    } else {
      records = [...this.localCache].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    if (filters) {
      if (filters.search && filters.search.trim() !== "") {
        const q = filters.search.trim().toLowerCase();
        records = records.filter(
          (r) => r.invoiceNumber.toLowerCase().includes(q) || r.brandName.toLowerCase().includes(q) || r.invoiceNotes && r.invoiceNotes.toLowerCase().includes(q) || r.notes && r.notes.toLowerCase().includes(q) || r.items.some(
            (item) => String(item.colorCode).toLowerCase().includes(q) || item.notes && item.notes.toLowerCase().includes(q)
          )
        );
      }
      if (filters.invoiceType && (filters.invoiceType === "black_screen" || filters.invoiceType === "black_out")) {
        records = records.filter(
          (r) => r.invoiceType === filters.invoiceType || r.items.some((it) => (it.type || it.productType) === filters.invoiceType)
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
  async findById(id) {
    if (this.isMongoConnected) {
      const doc = await InvoiceModel.findById(id).lean();
      if (!doc) return null;
      return {
        ...doc,
        _id: doc._id.toString(),
        createdAt: new Date(doc.createdAt).toISOString(),
        updatedAt: new Date(doc.updatedAt).toISOString()
      };
    }
    return this.localCache.find((inv) => inv._id === id) || null;
  }
  async create(payload) {
    const nextNum = await this.getNextInvoiceNumber();
    const invoiceNumber = payload.invoiceNumber?.trim() || nextNum.invoiceNumber;
    const sequenceNumber = payload.sequenceNumber || nextNum.sequenceNumber;
    const prepared = this.validateWithMongooseSchema({
      ...payload,
      invoiceNumber,
      sequenceNumber
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
        subTotal: prepared.subTotal,
        discount: prepared.discount,
        grandTotal: prepared.grandTotal,
        invoiceNotes: prepared.invoiceNotes || prepared.notes || "",
        notes: prepared.notes || prepared.invoiceNotes || ""
      });
      const obj = created.toObject();
      return {
        ...obj,
        _id: obj._id.toString(),
        createdAt: new Date(obj.createdAt).toISOString(),
        updatedAt: new Date(obj.updatedAt).toISOString()
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
  async update(id, payload) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const prepared = this.validateWithMongooseSchema({
      ...existing,
      ...payload,
      _id: existing._id,
      invoiceNumber: payload.invoiceNumber || existing.invoiceNumber,
      sequenceNumber: existing.sequenceNumber,
      createdAt: existing.createdAt
    });
    if (this.isMongoConnected) {
      const updated = await InvoiceModel.findByIdAndUpdate(
        id,
        {
          brandName: prepared.brandName,
          meterPrice: prepared.meterPrice,
          invoiceType: prepared.invoiceType,
          items: prepared.items,
          totalMeters: prepared.totalMeters,
          subTotal: prepared.subTotal,
          discount: prepared.discount,
          grandTotal: prepared.grandTotal,
          invoiceNotes: prepared.invoiceNotes || prepared.notes || "",
          notes: prepared.notes || prepared.invoiceNotes || ""
        },
        { new: true, runValidators: true }
      ).lean();
      if (!updated) return null;
      return {
        ...updated,
        _id: updated._id.toString(),
        createdAt: new Date(updated.createdAt).toISOString(),
        updatedAt: new Date(updated.updatedAt).toISOString()
      };
    }
    const index = this.localCache.findIndex((inv) => inv._id === id);
    if (index === -1) return null;
    this.localCache[index] = prepared;
    this.saveLocalStore();
    return prepared;
  }
  async delete(id) {
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
};
var invoiceRepository = new InvoiceRepository();

// backend/routes/invoiceRoutes.ts
import { Router } from "express";
var invoiceRouter = Router();
var cachedLogoDataUrl = null;
var BRAND_LOGO_EXTERNAL_URL = "https://d.top4top.io/p_3936i8brd1.jpg";
invoiceRouter.get("/logo-base64", async (_req, res) => {
  try {
    if (cachedLogoDataUrl) {
      res.json({ success: true, dataUrl: cachedLogoDataUrl });
      return;
    }
    const response = await fetch(BRAND_LOGO_EXTERNAL_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Prime24InvoiceSystem/1.0)"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    cachedLogoDataUrl = `data:${contentType};base64,${base64}`;
    res.json({
      success: true,
      dataUrl: cachedLogoDataUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "\u062A\u0639\u0630\u0631 \u062C\u0644\u0628 \u0627\u0644\u0644\u0648\u062C\u0648"
    });
  }
});
invoiceRouter.get("/next-number", async (_req, res) => {
  try {
    const next = await invoiceRepository.getNextInvoiceNumber();
    res.json({
      success: true,
      ...next
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0648\u0644\u064A\u062F \u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629"
    });
  }
});
invoiceRouter.get("/", async (req, res) => {
  try {
    const { search, dateFrom, dateTo, invoiceType } = req.query;
    const invoices = await invoiceRepository.findAll({
      search: typeof search === "string" ? search : void 0,
      dateFrom: typeof dateFrom === "string" ? dateFrom : void 0,
      dateTo: typeof dateTo === "string" ? dateTo : void 0,
      invoiceType: typeof invoiceType === "string" ? invoiceType : void 0
    });
    res.json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "\u0641\u0634\u0644 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A"
    });
  }
});
invoiceRouter.get("/:id", async (req, res) => {
  try {
    const invoice = await invoiceRepository.findById(req.params.id);
    if (!invoice) {
      res.status(404).json({
        success: false,
        message: "\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629"
      });
      return;
    }
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "\u062E\u0637\u0623 \u0641\u064A \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629"
    });
  }
});
invoiceRouter.post("/", async (req, res) => {
  try {
    const created = await invoiceRepository.create(req.body);
    res.status(201).json({
      success: true,
      message: "\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0628\u0646\u062C\u0627\u062D",
      data: created
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629"
    });
  }
});
invoiceRouter.put("/:id", async (req, res) => {
  try {
    const updated = await invoiceRepository.update(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({
        success: false,
        message: "\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0645\u0631\u0627\u062F \u062A\u0639\u062F\u064A\u0644\u0647\u0627 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629"
      });
      return;
    }
    res.json({
      success: true,
      message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0628\u0646\u062C\u0627\u062D",
      data: updated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629"
    });
  }
});
invoiceRouter.delete("/:id", async (req, res) => {
  try {
    const deleted = await invoiceRepository.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0644\u0644\u062D\u0630\u0641"
      });
      return;
    }
    res.json({
      success: true,
      message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0628\u0646\u062C\u0627\u062D"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062D\u0630\u0641 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629"
    });
  }
});

// server.ts
dotenv.config();
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(cors());
  app.use(express.json({ limit: "5mb" }));
  const dbConnection = await invoiceRepository.connectMongo(process.env.MONGODB_URI);
  console.log(`[Database Architect] Storage Mode: ${dbConnection.mode} (${dbConnection.uri})`);
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      database: invoiceRepository.getEngineStatus()
    });
  });
  app.use("/api/invoices", invoiceRouter);
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path2.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Senior Full-Stack Server] Running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
