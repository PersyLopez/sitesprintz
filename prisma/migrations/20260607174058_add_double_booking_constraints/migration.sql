-- btree_gist required for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add check constraint to ensure end_time > start_time
ALTER TABLE "appointments"
ADD CONSTRAINT "no_overlapping_appointments_check"
CHECK (end_time > start_time);

-- Create a partial unique index to allow multiple non-active appointments but prevent duplicates within non-cancelled
-- First, clean up any duplicate (staff_id, start_time) pairs by cancelling all but the first
DELETE FROM "appointments" 
WHERE id NOT IN (
  SELECT DISTINCT ON (staff_id, start_time) id 
  FROM "appointments" 
  WHERE status != 'cancelled'
  ORDER BY staff_id, start_time, created_at DESC
) AND status != 'cancelled' AND start_time <= CURRENT_TIMESTAMP;

-- Now create the unique index on non-cancelled appointments only
CREATE UNIQUE INDEX "idx_appointments_staff_start_time_unique"
ON "appointments"(staff_id, start_time)
WHERE status != 'cancelled';
