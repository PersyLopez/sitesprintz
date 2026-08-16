-- AlterTable: Add missing fields to booking_services
ALTER TABLE "booking_services" 
ADD COLUMN "buffer_minutes_before" INTEGER DEFAULT 0,
ADD COLUMN "buffer_minutes_after" INTEGER DEFAULT 0;

-- AlterTable: Add reminder_hours_before to booking_tenants
ALTER TABLE "booking_tenants"
ADD COLUMN "reminder_hours_before" INTEGER DEFAULT 24;

-- CreateTable: orders (canonical e-commerce order schema)
CREATE TABLE "orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "site_id" VARCHAR(255) NOT NULL,
  "user_id" UUID,
  "customer_email" VARCHAR(255) NOT NULL,
  "customer_name" VARCHAR(255),
  "customer_phone" VARCHAR(50),
  "items" JSONB NOT NULL DEFAULT '[]',
  "total_amount" DECIMAL(10,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
  "stripe_session_id" VARCHAR(255) UNIQUE,
  "stripe_payment_id" VARCHAR(255),
  "stripe_charge_id" VARCHAR(255),
  "payment_status" VARCHAR(20) DEFAULT 'unpaid',
  "status" VARCHAR(50) DEFAULT 'pending',
  "fulfillment_type" VARCHAR(50),
  "scheduled_for" TIMESTAMP(6),
  "shipping_address" JSONB,
  "special_instructions" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(6),

  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: order_items (normalized line items)
CREATE TABLE "order_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "product_id" INTEGER,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "quantity" INTEGER NOT NULL,
  "unit_price" DECIMAL(10,2) NOT NULL,
  "total_price" DECIMAL(10,2) NOT NULL,
  "modifiers" JSONB DEFAULT '[]',
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
  CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL
);

-- CreateTable: inventory_transactions (audit log)
CREATE TABLE "inventory_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" INTEGER NOT NULL,
  "order_id" UUID,
  "quantity_change" INTEGER NOT NULL,
  "previous_quantity" INTEGER NOT NULL,
  "new_quantity" INTEGER NOT NULL,
  "transaction_type" VARCHAR(50) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_transactions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
  CONSTRAINT "inventory_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL
);

-- CreateIndexes for orders
CREATE INDEX "idx_orders_site_id" ON "orders"("site_id");
CREATE INDEX "idx_orders_customer_email" ON "orders"("customer_email");
CREATE INDEX "idx_orders_status" ON "orders"("status");
CREATE INDEX "idx_orders_payment_status" ON "orders"("payment_status");
CREATE INDEX "idx_orders_stripe_session_id" ON "orders"("stripe_session_id");
CREATE INDEX "idx_orders_stripe_payment_id" ON "orders"("stripe_payment_id");
CREATE INDEX "idx_orders_created_at" ON "orders"("created_at");
CREATE INDEX "idx_orders_user_id" ON "orders"("user_id");

-- CreateIndexes for order_items
CREATE INDEX "idx_order_items_order_id" ON "order_items"("order_id");
CREATE INDEX "idx_order_items_product_id" ON "order_items"("product_id");

-- CreateIndexes for inventory_transactions
CREATE INDEX "idx_inventory_transactions_product_id" ON "inventory_transactions"("product_id");
CREATE INDEX "idx_inventory_transactions_created_at" ON "inventory_transactions"("created_at");
