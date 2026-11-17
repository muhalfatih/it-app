CREATE TABLE "content_card_comment" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_card_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"kind" text NOT NULL,
	"from_stage" text,
	"to_stage" text,
	"channel_id" integer,
	"note" text,
	"actor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_card_event_kind_check" CHECK (kind in ('maju', 'kembali', 'centang', 'batal_centang', 'otomatis', 'catatan_sistem')),
	CONSTRAINT "content_card_event_stage_check" CHECK ((from_stage is null or from_stage in ('ide', 'draft', 'review', 'disetujui', 'tayang')) and (to_stage is null or to_stage in ('ide', 'draft', 'review', 'disetujui', 'tayang'))),
	CONSTRAINT "content_card_event_note_check" CHECK (kind not in ('kembali', 'batal_centang') or note is not null)
);
--> statement-breakpoint
CREATE TABLE "content_card_publication" (
	"card_id" integer NOT NULL,
	"channel_id" integer NOT NULL,
	"url" text,
	"checked_by" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_card_publication_card_id_channel_id_pk" PRIMARY KEY("card_id","channel_id")
);
--> statement-breakpoint
ALTER TABLE "content_card" ADD COLUMN "caption" text;--> statement-breakpoint
ALTER TABLE "content_card" ADD COLUMN "stage_changed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "content_card" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "content_card_comment" ADD CONSTRAINT "content_card_comment_card_id_content_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."content_card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_card_comment" ADD CONSTRAINT "content_card_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_card_event" ADD CONSTRAINT "content_card_event_card_id_content_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."content_card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_card_event" ADD CONSTRAINT "content_card_event_channel_id_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_card_event" ADD CONSTRAINT "content_card_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_card_publication" ADD CONSTRAINT "content_card_publication_card_id_content_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."content_card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_card_publication" ADD CONSTRAINT "content_card_publication_channel_id_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_card_publication" ADD CONSTRAINT "content_card_publication_checked_by_user_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_card_comment_card_idx" ON "content_card_comment" USING btree ("card_id","created_at");--> statement-breakpoint
CREATE INDEX "content_card_event_card_idx" ON "content_card_event" USING btree ("card_id","created_at");