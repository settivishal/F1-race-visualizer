ALTER TABLE "drivers" ADD COLUMN "number_season" integer;--> statement-breakpoint
-- Existing rows have no provenance, and a null number_season means "the
-- incoming value wins" — so the first backfill of an older season would still
-- roll a number back once. The season a stored number came from is not
-- recorded, but the newest season a driver actually has a seat in is the best
-- available answer, and for a database imported in any sensible order it is
-- the right one.
UPDATE "drivers" d SET "number_season" = (
  SELECT max(ts."season_year")
  FROM "driver_team_assignments" dta
  JOIN "team_seasons" ts ON ts."id" = dta."team_season_id"
  WHERE dta."driver_id" = d."id"
)
WHERE d."number" IS NOT NULL
