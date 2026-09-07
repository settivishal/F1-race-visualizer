CREATE TABLE "pit_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"lap" integer NOT NULL,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "stints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"race_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"stint_number" integer NOT NULL,
	"lap_start" integer NOT NULL,
	"lap_end" integer NOT NULL,
	"compound" text,
	"tyre_age_at_start" integer
);
--> statement-breakpoint
ALTER TABLE "pit_stops" ADD CONSTRAINT "pit_stops_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pit_stops" ADD CONSTRAINT "pit_stops_assignment_id_driver_team_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."driver_team_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stints" ADD CONSTRAINT "stints_race_id_races_id_fk" FOREIGN KEY ("race_id") REFERENCES "public"."races"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stints" ADD CONSTRAINT "stints_assignment_id_driver_team_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."driver_team_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pit_stops_race_driver_lap_uq" ON "pit_stops" USING btree ("race_id","assignment_id","lap");--> statement-breakpoint
CREATE UNIQUE INDEX "stints_race_driver_stint_uq" ON "stints" USING btree ("race_id","assignment_id","stint_number");