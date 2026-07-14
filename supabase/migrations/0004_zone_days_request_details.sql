-- Phase 3 step 5: zone delivery schedules + structured delivery requests.

ALTER TABLE "zones"
  ADD COLUMN IF NOT EXISTS "deliveryDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

ALTER TABLE "portal_requests"
  ADD COLUMN IF NOT EXISTS "requestedDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "jugs" INTEGER;
