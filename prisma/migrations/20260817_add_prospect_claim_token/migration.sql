-- Prospect site claim tokens (hash only) + candidate → site link
ALTER TABLE "sites" ADD COLUMN "claim_token_hash" VARCHAR(64);
ALTER TABLE "sites" ADD COLUMN "claim_token_expires" TIMESTAMP(6);

CREATE UNIQUE INDEX "sites_claim_token_hash_key" ON "sites"("claim_token_hash");

ALTER TABLE "outreach_candidates" ADD COLUMN "site_id" VARCHAR(255);

CREATE INDEX "outreach_candidates_site_id_idx" ON "outreach_candidates"("site_id");

ALTER TABLE "outreach_candidates"
  ADD CONSTRAINT "outreach_candidates_site_id_fkey"
  FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
