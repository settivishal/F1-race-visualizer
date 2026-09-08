CREATE TYPE "public"."race_status" AS ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "admin_edited" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "status" "race_status" DEFAULT 'SCHEDULED' NOT NULL;--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "admin_edited" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
-- Everything already imported defaults to SCHEDULED, which is wrong for every
-- race that has been run. A race with position rows has been run; that is the
-- same test the ingest will apply from here on. Nothing can be marked
-- CANCELLED by this migration — no upstream publishes it, so it is an admin's
-- word and there is none recorded yet.
UPDATE "races" SET "status" = 'COMPLETED'
WHERE EXISTS (
  SELECT 1 FROM "race_positions" rp WHERE rp."race_id" = "races"."id"
)
