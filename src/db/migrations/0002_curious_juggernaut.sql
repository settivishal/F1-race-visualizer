CREATE TYPE "public"."data_tier" AS ENUM('FULL', 'LAPS');--> statement-breakpoint
CREATE TABLE "circuits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ergast_circuit_id" text NOT NULL,
	"name" text NOT NULL,
	"locality" text,
	"country" text,
	"latitude" real,
	"longitude" real,
	"length_km" real,
	"turns" integer,
	"first_grand_prix" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circuits_ergast_circuit_id_unique" UNIQUE("ergast_circuit_id")
);
--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "ergast_driver_id" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "circuit_id" uuid;--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "data_tier" "data_tier" DEFAULT 'FULL' NOT NULL;--> statement-breakpoint
ALTER TABLE "races" ADD COLUMN "ergast_round" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "ergast_constructor_id" text;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_circuit_id_circuits_id_fk" FOREIGN KEY ("circuit_id") REFERENCES "public"."circuits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_ergast_driver_id_unique" UNIQUE("ergast_driver_id");--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_ergast_constructor_id_unique" UNIQUE("ergast_constructor_id");