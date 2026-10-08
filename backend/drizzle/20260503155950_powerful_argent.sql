CREATE TABLE "weekly_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"mood" integer NOT NULL,
	"most_excited_person" text,
	"one_thing_to_change" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "dating_status" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "things_i_like" text;--> statement-breakpoint
ALTER TABLE "weekly_checkins" ADD CONSTRAINT "weekly_checkins_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;