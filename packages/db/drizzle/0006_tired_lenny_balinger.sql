CREATE TABLE "internet_complaint" (
	"id" serial PRIMARY KEY NOT NULL,
	"building_id" integer NOT NULL,
	"room" text NOT NULL,
	"issue" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"others_affected" text NOT NULL,
	"description" text,
	"reported_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "internet_complaint_issue_check" CHECK ("internet_complaint"."issue" in ('a', 'b', 'c', 'd', 'e', 'f')),
	CONSTRAINT "internet_complaint_others_check" CHECK ("internet_complaint"."others_affected" in ('ya', 'tidak', 'tidak_tahu'))
);
--> statement-breakpoint
CREATE TABLE "service_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"unit_id" integer NOT NULL,
	"wa_number" text NOT NULL,
	"fee_agreed" boolean NOT NULL,
	"rundown_key" text,
	"rundown_name" text,
	"rundown_mime" text,
	"rundown_size" integer,
	"status" text DEFAULT 'diajukan' NOT NULL,
	"follow_up" text,
	"planner_entry_id" integer,
	"manager_note" text,
	"cancelled_staff" jsonb,
	"requested_by" text NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_request_planner_entry_id_unique" UNIQUE("planner_entry_id"),
	CONSTRAINT "service_request_dates_check" CHECK ("service_request"."end_date" >= "service_request"."start_date"),
	CONSTRAINT "service_request_fee_check" CHECK ("service_request"."fee_agreed" = true),
	CONSTRAINT "service_request_status_check" CHECK ("service_request"."status" in ('diajukan', 'disetujui', 'ditolak', 'dibatalkan')),
	CONSTRAINT "service_request_follow_up_check" CHECK ("service_request"."follow_up" is null or "service_request"."follow_up" in ('planner', 'tugas')),
	CONSTRAINT "service_request_diajukan_check" CHECK ("service_request"."status" <> 'diajukan' or ("service_request"."follow_up" is null and "service_request"."planner_entry_id" is null and "service_request"."decided_by" is null and "service_request"."decided_at" is null)),
	CONSTRAINT "service_request_disetujui_check" CHECK ("service_request"."status" <> 'disetujui' or ("service_request"."follow_up" is not null and ("service_request"."follow_up" = 'planner') = ("service_request"."planner_entry_id" is not null))),
	CONSTRAINT "service_request_ditolak_check" CHECK ("service_request"."status" <> 'ditolak' or ("service_request"."manager_note" is not null and "service_request"."follow_up" is null)),
	CONSTRAINT "service_request_dibatalkan_check" CHECK ("service_request"."status" <> 'dibatalkan' or ("service_request"."manager_note" is not null and "service_request"."planner_entry_id" is null and "service_request"."cancelled_staff" is not null))
);
--> statement-breakpoint
CREATE TABLE "service_request_staff" (
	"request_id" integer NOT NULL,
	"position" integer NOT NULL,
	"task_type_id" integer NOT NULL,
	CONSTRAINT "service_request_staff_request_id_position_pk" PRIMARY KEY("request_id","position")
);
--> statement-breakpoint
ALTER TABLE "manager_task" ADD COLUMN "service_request_id" integer;--> statement-breakpoint
ALTER TABLE "internet_complaint" ADD CONSTRAINT "internet_complaint_building_id_building_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."building"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internet_complaint" ADD CONSTRAINT "internet_complaint_reported_by_user_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request" ADD CONSTRAINT "service_request_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request" ADD CONSTRAINT "service_request_planner_entry_id_planner_entry_id_fk" FOREIGN KEY ("planner_entry_id") REFERENCES "public"."planner_entry"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request" ADD CONSTRAINT "service_request_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request" ADD CONSTRAINT "service_request_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_staff" ADD CONSTRAINT "service_request_staff_request_id_service_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_request_staff" ADD CONSTRAINT "service_request_staff_task_type_id_task_type_id_fk" FOREIGN KEY ("task_type_id") REFERENCES "public"."task_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "internet_complaint_started_at_idx" ON "internet_complaint" USING btree ("started_at");--> statement-breakpoint
ALTER TABLE "manager_task" ADD CONSTRAINT "manager_task_service_request_id_service_request_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_request"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "manager_task_service_request_idx" ON "manager_task" USING btree ("service_request_id");