/**
 * @file backend/models/AdminUser.ts
 * @description Mongoose Schema for Prime 24 Admin Users.
 * Admin accounts are stored in MongoDB Atlas — no credentials in source code.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminUser extends Document {
  email: string;
  passwordHash: string;
  role: 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin'],
      default: 'admin',
    },
  },
  {
    timestamps: true,
    collection: 'admin_users',
  }
);

export const AdminUserModel = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);
