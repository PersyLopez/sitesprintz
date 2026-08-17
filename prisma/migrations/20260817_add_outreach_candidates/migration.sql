-- Admin outreach candidate queue (Places search + manual add)
CREATE TABLE "outreach_candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" VARCHAR(20) NOT NULL,
    "place_id" VARCHAR(255),
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "website" TEXT,
    "website_kind" VARCHAR(20),
    "maps_url" TEXT,
    "niche" VARCHAR(100),
    "layout_key" VARCHAR(50),
    "types" JSONB,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER,
    "has_hours" BOOLEAN,
    "photo_count" INTEGER,
    "score" INTEGER NOT NULL,
    "reasons" JSONB NOT NULL,
    "notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "added_by" VARCHAR(36),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_candidates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_candidates_place_id_key" ON "outreach_candidates"("place_id");
CREATE INDEX "outreach_candidates_status_idx" ON "outreach_candidates"("status");
CREATE INDEX "outreach_candidates_score_idx" ON "outreach_candidates"("score");
