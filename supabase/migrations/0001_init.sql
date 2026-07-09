-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'ON_DEMAND');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'PAUSED', 'SUSPENDED', 'CHURNED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('SCHEDULED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('JUG_REFILL', 'JUG_PURCHASE', 'DISPENSER_RENTAL', 'BOTTLE_CASE', 'DELIVERY_FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'VENMO', 'CASHAPP', 'ZELLE', 'STRIPE', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DELIVERY_REMINDER', 'PAYMENT_REMINDER', 'OWNER_DAILY_SUMMARY', 'LOYALTY', 'SUSPENSION_WARNING', 'INVOICE', 'PORTAL_REQUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'CONSOLE');

-- CreateEnum
CREATE TYPE "CommChannel" AS ENUM ('CALL', 'TEXT', 'EMAIL', 'IN_PERSON', 'NOTE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT DEFAULT 'NJ',
    "zip" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "deliveryNotes" TEXT,
    "accountType" "AccountType" NOT NULL DEFAULT 'RESIDENTIAL',
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'ON_DEMAND',
    "planJugs" INTEGER NOT NULL DEFAULT 2,
    "preferredDay" INTEGER,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspendedAt" TIMESTAMP(3),
    "suspensionNote" TEXT,
    "zoneId" TEXT,
    "jugsWithCustomer" INTEGER NOT NULL DEFAULT 0,
    "jugDeposits" INTEGER NOT NULL DEFAULT 0,
    "portalToken" TEXT NOT NULL,
    "birthday" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comm_logs" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "channel" "CommChannel" NOT NULL DEFAULT 'NOTE',
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comm_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_requests" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "detail" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "zips" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color" TEXT DEFAULT '#1c94bd',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "jugRefillPrice" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "jugPurchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "dispenserRentalPrice" DOUBLE PRECISION NOT NULL DEFAULT 7,
    "bottleCasePrice" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "flatDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weeklyDiscountPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "biweeklyDiscountPct" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "monthlyDiscountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bulkBuyQty" INTEGER NOT NULL DEFAULT 10,
    "bulkFreeQty" INTEGER NOT NULL DEFAULT 1,
    "costPerGallon" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "gasCostPerMile" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "laborCostPerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 20,
    "overdueSuspendDays" INTEGER NOT NULL DEFAULT 45,
    "loyaltyMonths" INTEGER NOT NULL DEFAULT 12,
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoSuspendEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_prices" (
    "id" TEXT NOT NULL,
    "competitor" TEXT NOT NULL,
    "jugRefill" DOUBLE PRECISION,
    "jugPurchase" DOUBLE PRECISION,
    "dispenserRent" DOUBLE PRECISION,
    "bottleCase" DOUBLE PRECISION,
    "deliveryFee" DOUBLE PRECISION,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitor_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "deliveryDate" DATE NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "instructions" TEXT,
    "paymentMethod" "PaymentMethod",
    "jugsReturned" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fromSubscription" BOOLEAN NOT NULL DEFAULT false,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'consumable',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderThreshold" INTEGER NOT NULL DEFAULT 0,
    "reorderAmount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_purchases" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gallons" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPerGallon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "supplier_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memo" TEXT,
    "stripeSessionId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT,
    "totalMiles" DOUBLE PRECISION,
    "totalMinutes" DOUBLE PRECISION,
    "optimizedWith" TEXT DEFAULT 'haversine',
    "startAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "milesFromPrev" DOUBLE PRECISION,
    "minutesFromPrev" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications_log" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_supabaseId_key" ON "users"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_userId_key" ON "customers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_portalToken_key" ON "customers"("portalToken");

-- CreateIndex
CREATE INDEX "customers_zoneId_idx" ON "customers"("zoneId");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_plan_idx" ON "customers"("plan");

-- CreateIndex
CREATE INDEX "comm_logs_customerId_idx" ON "comm_logs"("customerId");

-- CreateIndex
CREATE INDEX "portal_requests_customerId_idx" ON "portal_requests"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "zones_name_key" ON "zones"("name");

-- CreateIndex
CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_deliveryDate_idx" ON "orders"("deliveryDate");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_sku_key" ON "inventory"("sku");

-- CreateIndex
CREATE INDEX "inventory_movements_itemId_idx" ON "inventory_movements"("itemId");

-- CreateIndex
CREATE INDEX "supplier_purchases_supplierId_idx" ON "supplier_purchases"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_customerId_idx" ON "invoices"("customerId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "payments_customerId_idx" ON "payments"("customerId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "routes_date_idx" ON "routes"("date");

-- CreateIndex
CREATE INDEX "route_stops_routeId_idx" ON "route_stops"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "route_stops_routeId_orderId_key" ON "route_stops"("routeId", "orderId");

-- CreateIndex
CREATE INDEX "notifications_log_customerId_idx" ON "notifications_log"("customerId");

-- CreateIndex
CREATE INDEX "notifications_log_type_idx" ON "notifications_log"("type");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comm_logs" ADD CONSTRAINT "comm_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_requests" ADD CONSTRAINT "portal_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_purchases" ADD CONSTRAINT "supplier_purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

