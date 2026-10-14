/**
 * @file backend/auth/adminSeeder.ts
 * @description Runs once on server startup to ensure the admin user exists in MongoDB.
 * 
 * - Reads credentials ONLY from environment variables (ADMIN_EMAIL, ADMIN_PASSWORD).
 * - Hashes the password with bcrypt before storing — the plaintext is NEVER saved to DB.
 * - If an admin with that email already exists, it does nothing (idempotent).
 * - Logs a clear, visible warning if the required env vars are missing.
 */

import bcrypt from 'bcryptjs';
import { AdminUserModel } from '../models/AdminUser.js';

const SALT_ROUNDS = 12;

export async function seedAdminUser(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      '\n╔══════════════════════════════════════════════════════════╗\n' +
      '║  [Prime 24 Auth] WARNING: ADMIN_EMAIL or ADMIN_PASSWORD  ║\n' +
      '║  environment variables are missing from your .env file!  ║\n' +
      '║  Admin user will NOT be seeded until they are set.        ║\n' +
      '╚══════════════════════════════════════════════════════════╝\n'
    );
    return;
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await AdminUserModel.findOne({ email: normalizedEmail });

    if (existing) {
      // Verify the stored hash still matches — if not (password rotation), update it
      const isMatch = await bcrypt.compare(password, existing.passwordHash);
      if (isMatch) {
        console.log(`[Admin Seeder] Admin user (${email}) already exists with valid credentials — skipping.`);
      } else {
        console.warn(`[Admin Seeder] ⚠️  Admin password in DB doesn't match env var. Updating hash...`);
        existing.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        await existing.save();
        console.log(`[Admin Seeder] ✅ Admin password updated for (${email}).`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await AdminUserModel.create({
      email: normalizedEmail,
      passwordHash,
      role: 'admin',
    });

    console.log(`[Admin Seeder] ✅ Admin user (${email}) created in MongoDB successfully.`);
  } catch (err: any) {
    console.error('[Admin Seeder] ❌ Failed to seed admin user:', err.message);
  }
}
