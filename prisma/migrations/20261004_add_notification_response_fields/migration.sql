-- Notification response tracking + booking reminder interval + submission read state
ALTER TABLE "booking_notifications" ADD COLUMN "response_token" VARCHAR(64);
ALTER TABLE "booking_notifications" ADD COLUMN "response" VARCHAR(20) DEFAULT 'none';
ALTER TABLE "booking_notifications" ADD COLUMN "response_at" TIMESTAMP(6);
ALTER TABLE "booking_notifications" ADD COLUMN "followup_sent_at" TIMESTAMP(6);
ALTER TABLE "booking_notifications" ADD COLUMN "submission_id" INTEGER;

CREATE UNIQUE INDEX "booking_notifications_response_token_key" ON "booking_notifications"("response_token");
CREATE INDEX "idx_notifications_submission" ON "booking_notifications"("submission_id");

ALTER TABLE "booking_services" ADD COLUMN "reminder_interval_days" INTEGER;

ALTER TABLE "submissions" ADD COLUMN "read_at" TIMESTAMP(6);
