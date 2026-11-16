CREATE TABLE "building" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"requires_link" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_task" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "user_role_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "building_name_lower_idx" ON "building" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "channel_name_lower_idx" ON "channel" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "task_type_name_lower_idx" ON "task_type" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "unit_name_lower_idx" ON "unit" USING btree (lower("name"));