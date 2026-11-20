CREATE TABLE "equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"total" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_total_check" CHECK ("equipment"."total" > 0)
);
--> statement-breakpoint
CREATE TABLE "loan" (
	"id" serial PRIMARY KEY NOT NULL,
	"borrower_name" text NOT NULL,
	"unit_id" integer NOT NULL,
	"wa_number" text,
	"started_at" timestamp with time zone NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"returned_at" timestamp with time zone,
	"recorded_by" text NOT NULL,
	"returned_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loan_due_check" CHECK ("loan"."due_at" > "loan"."started_at"),
	CONSTRAINT "loan_returned_check" CHECK ("loan"."returned_at" >= "loan"."started_at"),
	CONSTRAINT "loan_returned_by_with_returned_at" CHECK (("loan"."returned_at" is null) = ("loan"."returned_by" is null))
);
--> statement-breakpoint
CREATE TABLE "loan_item" (
	"loan_id" integer NOT NULL,
	"equipment_id" integer NOT NULL,
	"qty" integer NOT NULL,
	"problem_qty" integer DEFAULT 0 NOT NULL,
	"problem_note" text,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	CONSTRAINT "loan_item_loan_id_equipment_id_pk" PRIMARY KEY("loan_id","equipment_id"),
	CONSTRAINT "loan_item_qty_check" CHECK ("loan_item"."qty" > 0),
	CONSTRAINT "loan_item_problem_qty_check" CHECK ("loan_item"."problem_qty" >= 0 and "loan_item"."problem_qty" <= "loan_item"."qty"),
	CONSTRAINT "loan_item_note_with_problem" CHECK (("loan_item"."problem_qty" > 0) = ("loan_item"."problem_note" is not null)),
	CONSTRAINT "loan_item_resolve_needs_problem" CHECK ("loan_item"."problem_qty" > 0 or ("loan_item"."resolved_at" is null and "loan_item"."resolved_by" is null)),
	CONSTRAINT "loan_item_resolved_by_with_at" CHECK (("loan_item"."resolved_at" is null) = ("loan_item"."resolved_by" is null))
);
--> statement-breakpoint
ALTER TABLE "loan" ADD CONSTRAINT "loan_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan" ADD CONSTRAINT "loan_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan" ADD CONSTRAINT "loan_returned_by_user_id_fk" FOREIGN KEY ("returned_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_item" ADD CONSTRAINT "loan_item_loan_id_loan_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_item" ADD CONSTRAINT "loan_item_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_item" ADD CONSTRAINT "loan_item_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_name_brand_lower_idx" ON "equipment" USING btree (lower("name"),lower("brand"));--> statement-breakpoint
CREATE INDEX "loan_returned_at_idx" ON "loan" USING btree ("returned_at");--> statement-breakpoint
CREATE INDEX "loan_due_at_idx" ON "loan" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "loan_item_equipment_id_idx" ON "loan_item" USING btree ("equipment_id");