-- Create analytics_page_views table
CREATE TABLE "analytics_page_views" (
    "id" BIGSERIAL NOT NULL,
    "site_id" VARCHAR(255) NOT NULL,
    "path" VARCHAR(2048) NOT NULL,
    "referrer" VARCHAR(2048),
    "user_agent" VARCHAR(1024),
    "ip_address" VARCHAR(45),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_page_views_pkey" PRIMARY KEY ("id")
);

-- Create analytics_orders table
CREATE TABLE "analytics_orders" (
    "id" BIGSERIAL NOT NULL,
    "site_id" VARCHAR(255) NOT NULL,
    "order_id" VARCHAR(255) NOT NULL,
    "value" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_orders_pkey" PRIMARY KEY ("id")
);

-- Create analytics_conversions table
CREATE TABLE "analytics_conversions" (
    "id" BIGSERIAL NOT NULL,
    "site_id" VARCHAR(255) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_conversions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
CREATE INDEX "analytics_page_views_site_id_idx" ON "analytics_page_views"("site_id");
CREATE INDEX "analytics_page_views_timestamp_idx" ON "analytics_page_views"("timestamp");

CREATE INDEX "analytics_orders_site_id_idx" ON "analytics_orders"("site_id");
CREATE INDEX "analytics_orders_timestamp_idx" ON "analytics_orders"("timestamp");

CREATE INDEX "analytics_conversions_site_id_idx" ON "analytics_conversions"("site_id");
CREATE INDEX "analytics_conversions_event_type_idx" ON "analytics_conversions"("event_type");

-- Add foreign keys to sites table
ALTER TABLE "analytics_page_views" ADD CONSTRAINT "analytics_page_views_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "analytics_orders" ADD CONSTRAINT "analytics_orders_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "analytics_conversions" ADD CONSTRAINT "analytics_conversions_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
