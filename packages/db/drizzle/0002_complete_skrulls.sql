CREATE TABLE "content_card" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"stage" text DEFAULT 'ide' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_card_entry_unique" UNIQUE("entry_id"),
	CONSTRAINT "content_card_stage_check" CHECK (stage in ('ide', 'draft', 'review', 'disetujui', 'tayang'))
);
--> statement-breakpoint
CREATE TABLE "planner_assignment" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"task_type_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	CONSTRAINT "planner_assignment_dates_check" CHECK ("planner_assignment"."end_date" >= "planner_assignment"."start_date")
);
--> statement-breakpoint
CREATE TABLE "planner_entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"activity_start" date,
	"activity_end" date,
	"publish_date" date NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planner_entry_activity_check" CHECK (("planner_entry"."activity_start" is null and "planner_entry"."activity_end" is null) or ("planner_entry"."activity_start" is not null and "planner_entry"."activity_end" is not null and "planner_entry"."activity_end" >= "planner_entry"."activity_start"))
);
--> statement-breakpoint
CREATE TABLE "planner_entry_channel" (
	"entry_id" integer NOT NULL,
	"channel_id" integer NOT NULL,
	CONSTRAINT "planner_entry_channel_entry_id_channel_id_pk" PRIMARY KEY("entry_id","channel_id")
);
--> statement-breakpoint
ALTER TABLE "content_card" ADD CONSTRAINT "content_card_entry_id_planner_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."planner_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_assignment" ADD CONSTRAINT "planner_assignment_entry_id_planner_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."planner_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_assignment" ADD CONSTRAINT "planner_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_assignment" ADD CONSTRAINT "planner_assignment_task_type_id_task_type_id_fk" FOREIGN KEY ("task_type_id") REFERENCES "public"."task_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_entry" ADD CONSTRAINT "planner_entry_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_entry_channel" ADD CONSTRAINT "planner_entry_channel_entry_id_planner_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."planner_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_entry_channel" ADD CONSTRAINT "planner_entry_channel_channel_id_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "planner_assignment_user_dates_idx" ON "planner_assignment" USING btree ("user_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "planner_assignment_entry_idx" ON "planner_assignment" USING btree ("entry_id");