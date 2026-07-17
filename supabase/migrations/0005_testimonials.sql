-- Owner-curated customer quotes for the public landing page.
CREATE TABLE IF NOT EXISTS "testimonials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "testimonials" ENABLE ROW LEVEL SECURITY;
