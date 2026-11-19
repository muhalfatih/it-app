CREATE TABLE "content_card_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"position" integer NOT NULL,
	"source" text NOT NULL,
	"object_key" text,
	"media_kind" text,
	"mime" text,
	"size" bigint,
	"original_name" text,
	"url" text,
	"provider" text,
	"provider_ref" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_card_media_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "content_card_media_source_check" CHECK (source in ('file', 'embed')),
	CONSTRAINT "content_card_media_kind_check" CHECK (media_kind is null or media_kind in ('image', 'video')),
	CONSTRAINT "content_card_media_provider_check" CHECK (provider is null or provider in ('youtube', 'drive', 'tautan')),
	CONSTRAINT "content_card_media_shape_check" CHECK ((source = 'file' and object_key is not null and media_kind is not null and mime is not null and size is not null and original_name is not null) or (source = 'embed' and url is not null and provider is not null))
);
--> statement-breakpoint
ALTER TABLE "content_card" ADD COLUMN "thumbnail_media_id" integer;--> statement-breakpoint
ALTER TABLE "content_card_media" ADD CONSTRAINT "content_card_media_card_id_content_card_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."content_card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_card_media" ADD CONSTRAINT "content_card_media_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_card_media_card_idx" ON "content_card_media" USING btree ("card_id","position");--> statement-breakpoint
ALTER TABLE "content_card" ADD CONSTRAINT "content_card_thumbnail_media_id_content_card_media_id_fk" FOREIGN KEY ("thumbnail_media_id") REFERENCES "public"."content_card_media"("id") ON DELETE set null ON UPDATE no action;