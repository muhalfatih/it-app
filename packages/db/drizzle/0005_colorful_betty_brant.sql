CREATE TABLE "attendance" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"status" text NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_user_id_date_pk" PRIMARY KEY("user_id","date"),
	CONSTRAINT "attendance_status_check" CHECK ("attendance"."status" in ('hadir', 'izin', 'izin_kegiatan', 'sakit', 'tanpa_keterangan'))
);
--> statement-breakpoint
CREATE TABLE "daily_report" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"obstacles" text DEFAULT '' NOT NULL,
	"priorities" text DEFAULT '' NOT NULL,
	"submitted_at" timestamp with time zone,
	"submitted_tasks" jsonb,
	"unlocked_at" timestamp with time zone,
	"unlocked_by" text,
	"frozen" jsonb,
	"frozen_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_report_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "daily_report_answer" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"task_key" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_report_answer_user_id_date_task_key_pk" PRIMARY KEY("user_id","date","task_key"),
	CONSTRAINT "daily_report_answer_status_check" CHECK ("daily_report_answer"."status" in ('T', 'TL'))
);
--> statement-breakpoint
CREATE TABLE "holiday" (
	"date" date PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manager_task" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manager_task_dates_check" CHECK ("manager_task"."end_date" >= "manager_task"."start_date")
);
--> statement-breakpoint
CREATE TABLE "manager_task_assignee" (
	"task_id" integer NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "manager_task_assignee_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "self_task" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report" ADD CONSTRAINT "daily_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report" ADD CONSTRAINT "daily_report_unlocked_by_user_id_fk" FOREIGN KEY ("unlocked_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_answer" ADD CONSTRAINT "daily_report_answer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_task" ADD CONSTRAINT "manager_task_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_task_assignee" ADD CONSTRAINT "manager_task_assignee_task_id_manager_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."manager_task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_task_assignee" ADD CONSTRAINT "manager_task_assignee_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "self_task" ADD CONSTRAINT "self_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "self_task_user_date_idx" ON "self_task" USING btree ("user_id","date");