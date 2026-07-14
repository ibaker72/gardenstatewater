-- Phase 2: customer account additions + business info on pricing config.

-- New account type for one-off event customers (parties, job sites…).
ALTER TYPE "AccountType" ADD VALUE IF NOT EXISTS 'EVENT';

-- Dispenser rental flag + preferred payment method on customers.
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "dispenserRental" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "paymentPref" "PaymentMethod";

-- Business identity shown on invoices, statements, and emails.
ALTER TABLE "pricing_config"
  ADD COLUMN IF NOT EXISTS "businessName" TEXT NOT NULL DEFAULT 'Garden State Water',
  ADD COLUMN IF NOT EXISTS "businessPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "businessEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "businessAddress" TEXT;
