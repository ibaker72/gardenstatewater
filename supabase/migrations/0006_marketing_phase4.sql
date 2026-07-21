-- Phase 4: marketing front page — public plans, serviceable ZIPs, waitlist,
-- deals, and the referral program.

-- ── pricing_config: public storefront prices ────────────────────────────────
ALTER TABLE "pricing_config"
    ADD COLUMN IF NOT EXISTS "oneTimeJugPrice" DOUBLE PRECISION NOT NULL DEFAULT 11.99,
    ADD COLUMN IF NOT EXISTS "oneTimeDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 4.99,
    ADD COLUMN IF NOT EXISTS "dispenserPurchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 129,
    ADD COLUMN IF NOT EXISTS "jugDepositPrice" DOUBLE PRECISION NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS "annualFreeMonths" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "firstDeliveryDiscountPct" DOUBLE PRECISION NOT NULL DEFAULT 50;

-- The bottle-case add-on is now the 16.9oz case at $8.99; only migrate rows
-- still holding the old default so an owner-set price is never overwritten.
UPDATE "pricing_config" SET "bottleCasePrice" = 8.99 WHERE "bottleCasePrice" = 6;

-- ── customers: referral program ─────────────────────────────────────────────
ALTER TABLE "customers"
    ADD COLUMN IF NOT EXISTS "referralCode" TEXT,
    ADD COLUMN IF NOT EXISTS "referredById" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "customers_referralCode_key" ON "customers"("referralCode");

DO $$ BEGIN
    ALTER TABLE "customers"
        ADD CONSTRAINT "customers_referredById_fkey"
        FOREIGN KEY ("referredById") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── service_zips ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "service_zips" (
    "zip" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'NJ',
    "region" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "zoneId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_zips_pkey" PRIMARY KEY ("zip")
);
CREATE INDEX IF NOT EXISTS "service_zips_slug_idx" ON "service_zips"("slug");
CREATE INDEX IF NOT EXISTS "service_zips_region_idx" ON "service_zips"("region");
DO $$ BEGIN
    ALTER TABLE "service_zips"
        ADD CONSTRAINT "service_zips_zoneId_fkey"
        FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "service_zips" ENABLE ROW LEVEL SECURITY;

-- ── waitlist_entries ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "waitlist_entries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "zip" TEXT NOT NULL,
    "town" TEXT,
    "source" TEXT NOT NULL DEFAULT 'homepage',
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "waitlist_entries_zip_idx" ON "waitlist_entries"("zip");
ALTER TABLE "waitlist_entries" ENABLE ROW LEVEL SECURITY;

-- ── deals ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "deals" (
    "id" TEXT NOT NULL,
    "slot" TEXT NOT NULL DEFAULT 'offer',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "badge" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;

-- ── site_plans ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "site_plans" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "monthlyPrice" DOUBLE PRECISION NOT NULL,
    "priceUnit" TEXT NOT NULL DEFAULT 'month',
    "jugsPerMonth" INTEGER NOT NULL,
    "badge" TEXT,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSubscription" BOOLEAN NOT NULL DEFAULT true,
    "customQuote" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "site_plans_key_key" ON "site_plans"("key");
ALTER TABLE "site_plans" ENABLE ROW LEVEL SECURITY;

-- ── referral_credits ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "referral_credits" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jugs" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referral_credits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "referral_credits_customerId_idx" ON "referral_credits"("customerId");
DO $$ BEGIN
    ALTER TABLE "referral_credits"
        ADD CONSTRAINT "referral_credits_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "referral_credits" ENABLE ROW LEVEL SECURITY;

-- Launch data: serviceable ZIPs (insert-if-absent; owner manages from Settings → Website)
INSERT INTO "service_zips" ("zip", "town", "state", "region", "slug") VALUES
    ('07501', 'Paterson', 'NJ', 'North Jersey', 'paterson-nj'),
    ('07502', 'Paterson', 'NJ', 'North Jersey', 'paterson-nj'),
    ('07503', 'Paterson', 'NJ', 'North Jersey', 'paterson-nj'),
    ('07504', 'Paterson', 'NJ', 'North Jersey', 'paterson-nj'),
    ('07505', 'Paterson', 'NJ', 'North Jersey', 'paterson-nj'),
    ('07522', 'Paterson', 'NJ', 'North Jersey', 'paterson-nj'),
    ('07524', 'Paterson', 'NJ', 'North Jersey', 'paterson-nj'),
    ('07011', 'Clifton', 'NJ', 'North Jersey', 'clifton-nj'),
    ('07012', 'Clifton', 'NJ', 'North Jersey', 'clifton-nj'),
    ('07013', 'Clifton', 'NJ', 'North Jersey', 'clifton-nj'),
    ('07014', 'Clifton', 'NJ', 'North Jersey', 'clifton-nj'),
    ('07470', 'Wayne', 'NJ', 'North Jersey', 'wayne-nj'),
    ('07450', 'Ridgewood', 'NJ', 'North Jersey', 'ridgewood-nj'),
    ('07451', 'Ridgewood', 'NJ', 'North Jersey', 'ridgewood-nj'),
    ('07042', 'Montclair', 'NJ', 'North Jersey', 'montclair-nj'),
    ('07043', 'Montclair', 'NJ', 'North Jersey', 'montclair-nj'),
    ('07601', 'Hackensack', 'NJ', 'North Jersey', 'hackensack-nj'),
    ('07024', 'Fort Lee', 'NJ', 'North Jersey', 'fort-lee-nj'),
    ('07631', 'Englewood', 'NJ', 'North Jersey', 'englewood-nj'),
    ('07960', 'Morristown', 'NJ', 'Morris & Essex', 'morristown-nj'),
    ('07940', 'Madison', 'NJ', 'Morris & Essex', 'madison-nj'),
    ('07928', 'Chatham', 'NJ', 'Morris & Essex', 'chatham-nj'),
    ('07078', 'Short Hills', 'NJ', 'Morris & Essex', 'short-hills-nj'),
    ('07041', 'Millburn', 'NJ', 'Morris & Essex', 'millburn-nj'),
    ('07039', 'Livingston', 'NJ', 'Morris & Essex', 'livingston-nj'),
    ('07901', 'Summit', 'NJ', 'Morris & Essex', 'summit-nj'),
    ('08817', 'Edison', 'NJ', 'Central Jersey', 'edison-nj'),
    ('08820', 'Edison', 'NJ', 'Central Jersey', 'edison-nj'),
    ('08837', 'Edison', 'NJ', 'Central Jersey', 'edison-nj'),
    ('08540', 'Princeton', 'NJ', 'Central Jersey', 'princeton-nj'),
    ('08542', 'Princeton', 'NJ', 'Central Jersey', 'princeton-nj'),
    ('08901', 'New Brunswick', 'NJ', 'Central Jersey', 'new-brunswick-nj'),
    ('07090', 'Westfield', 'NJ', 'Central Jersey', 'westfield-nj'),
    ('07016', 'Cranford', 'NJ', 'Central Jersey', 'cranford-nj'),
    ('08002', 'Cherry Hill', 'NJ', 'South Jersey', 'cherry-hill-nj'),
    ('08003', 'Cherry Hill', 'NJ', 'South Jersey', 'cherry-hill-nj'),
    ('08034', 'Cherry Hill', 'NJ', 'South Jersey', 'cherry-hill-nj'),
    ('08057', 'Moorestown', 'NJ', 'South Jersey', 'moorestown-nj'),
    ('08033', 'Haddonfield', 'NJ', 'South Jersey', 'haddonfield-nj'),
    ('08053', 'Marlton', 'NJ', 'South Jersey', 'marlton-nj'),
    ('08043', 'Voorhees', 'NJ', 'South Jersey', 'voorhees-nj'),
    ('07701', 'Red Bank', 'NJ', 'Jersey Shore', 'red-bank-nj'),
    ('07760', 'Rumson', 'NJ', 'Jersey Shore', 'rumson-nj'),
    ('07722', 'Colts Neck', 'NJ', 'Jersey Shore', 'colts-neck-nj'),
    ('07733', 'Holmdel', 'NJ', 'Jersey Shore', 'holmdel-nj'),
    ('10001', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10002', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10003', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10004', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10005', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10006', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10007', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10009', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10010', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10011', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10012', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10013', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10014', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10016', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10017', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10018', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10019', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10021', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10022', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10023', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10024', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10025', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10028', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10036', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10038', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10065', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10075', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('10128', 'Manhattan', 'NY', 'Manhattan (below 96th St)', 'manhattan-ny'),
    ('11215', 'Park Slope', 'NY', 'Brooklyn', 'park-slope-ny'),
    ('11217', 'Park Slope', 'NY', 'Brooklyn', 'park-slope-ny'),
    ('11201', 'Brooklyn Heights', 'NY', 'Brooklyn', 'brooklyn-heights-ny'),
    ('11211', 'Williamsburg', 'NY', 'Brooklyn', 'williamsburg-ny'),
    ('11249', 'Williamsburg', 'NY', 'Brooklyn', 'williamsburg-ny'),
    ('10583', 'Scarsdale', 'NY', 'Westchester', 'scarsdale-ny'),
    ('10580', 'Rye', 'NY', 'Westchester', 'rye-ny'),
    ('10708', 'Bronxville', 'NY', 'Westchester', 'bronxville-ny'),
    ('10601', 'White Plains', 'NY', 'Westchester', 'white-plains-ny'),
    ('10605', 'White Plains', 'NY', 'Westchester', 'white-plains-ny'),
    ('10301', 'Staten Island', 'NY', 'Staten Island', 'staten-island-ny'),
    ('10302', 'Staten Island', 'NY', 'Staten Island', 'staten-island-ny'),
    ('10303', 'Staten Island', 'NY', 'Staten Island', 'staten-island-ny'),
    ('10304', 'Staten Island', 'NY', 'Staten Island', 'staten-island-ny'),
    ('10305', 'Staten Island', 'NY', 'Staten Island', 'staten-island-ny'),
    ('10306', 'Staten Island', 'NY', 'Staten Island', 'staten-island-ny'),
    ('10308', 'Staten Island', 'NY', 'Staten Island', 'staten-island-ny'),
    ('10310', 'Staten Island', 'NY', 'Staten Island', 'staten-island-ny'),
    ('10312', 'Staten Island', 'NY', 'Staten Island', 'staten-island-ny'),
    ('10314', 'Staten Island', 'NY', 'Staten Island', 'staten-island-ny')
ON CONFLICT ("zip") DO NOTHING;

-- Launch data: public pricing tiers
INSERT INTO "site_plans" ("id", "key", "name", "tagline", "monthlyPrice", "priceUnit", "jugsPerMonth", "badge", "features", "isSubscription", "customQuote", "sortOrder", "updatedAt")
SELECT v.*, CURRENT_TIMESTAMP FROM (VALUES
    ('plan_one_time', 'one_time', 'One-Time Delivery', 'No commitment — good for trying us out.', 11.99, 'jug', 1, NULL, ARRAY['No commitment', '$4.99 delivery fee', 'Same 5-gallon spring water', 'Order again whenever you like'], false, false, 1),
    ('plan_hydrate', 'hydrate', 'Hydrate', 'The essentials for most households.', 39, 'month', 4, 'Most Popular', ARRAY['4 jugs/month — weekly delivery', 'FREE delivery', 'Free jug exchange', 'Works out to $9.75/jug', 'Pause or cancel anytime'], true, false, 2),
    ('plan_family', 'family', 'Family', 'Bigger households, home gyms, heavy hydrators.', 69, 'month', 8, NULL, ARRAY['8 jugs/month — weekly delivery', 'FREE delivery', 'Free dispenser rental included ($7/mo value)', 'Priority delivery windows', 'Works out to $8.63/jug'], true, false, 3),
    ('plan_office', 'office', 'Office & Commercial', 'Offices, gyms, salons, and shops.', 99, 'month', 12, NULL, ARRAY['12+ jugs/month, custom volume', 'Dedicated delivery day', 'Net-30 invoicing available', 'Free dispenser + cup dispenser', 'Contact us for a custom quote'], true, true, 4)
) AS v("id", "key", "name", "tagline", "monthlyPrice", "priceUnit", "jugsPerMonth", "badge", "features", "isSubscription", "customQuote", "sortOrder")
ON CONFLICT ("key") DO NOTHING;

-- Launch data: offers + seasonal banner
INSERT INTO "deals" ("id", "slot", "title", "description", "badge", "sortOrder", "updatedAt")
SELECT v.*, CURRENT_TIMESTAMP FROM (VALUES
    ('deal_banner_seasonal', 'banner', 'Summer special: first delivery 50% off every new subscription.', NULL, NULL, 0),
    ('deal_first_delivery', 'offer', 'First delivery 50% off', 'Start any subscription and your first delivery is half price — applied automatically at checkout.', 'New customers', 1),
    ('deal_referral', 'offer', 'Refer a neighbor, both get a free jug', 'Share your referral code from the customer portal. When a neighbor signs up with it, you each get a free jug credit on your next delivery.', 'Everyone', 2),
    ('deal_family_annual', 'offer', '3 months free dispenser rental', 'Sign up for the Family plan with annual billing and we waive the dispenser rental for your first 3 months.', 'Family annual', 3)
) AS v("id", "slot", "title", "description", "badge", "sortOrder")
ON CONFLICT ("id") DO NOTHING;
