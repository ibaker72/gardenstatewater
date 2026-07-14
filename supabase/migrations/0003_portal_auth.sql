-- Phase 3: customer portal authentication (code login, PIN fallback, sessions).

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "portalAccess" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "portalPin" TEXT,
  ADD COLUMN IF NOT EXISTS "portalLastLoginAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "portal_sessions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portal_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "portal_sessions_tokenHash_key" ON "portal_sessions"("tokenHash");
CREATE INDEX IF NOT EXISTS "portal_sessions_customerId_idx" ON "portal_sessions"("customerId");
ALTER TABLE "portal_sessions"
  ADD CONSTRAINT "portal_sessions_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "portal_login_codes" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portal_login_codes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "portal_login_codes_customerId_idx" ON "portal_login_codes"("customerId");
ALTER TABLE "portal_login_codes"
  ADD CONSTRAINT "portal_login_codes_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "portal_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal_login_codes" ENABLE ROW LEVEL SECURITY;
