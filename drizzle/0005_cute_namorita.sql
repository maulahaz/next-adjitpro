CREATE TABLE "help_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"nama" text DEFAULT '' NOT NULL,
	"mime" text DEFAULT '' NOT NULL,
	"ukuran" integer DEFAULT 0 NOT NULL,
	"data" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "help_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"judul" text DEFAULT '' NOT NULL,
	"tanggal" date,
	"nama_pelapor" text DEFAULT '' NOT NULL,
	"user_id" text NOT NULL,
	"deskripsi" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Baru' NOT NULL,
	"komentar" text DEFAULT '' NOT NULL,
	"ditanggapi_oleh" text DEFAULT '' NOT NULL,
	"ditanggapi_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "help_attach_ticket_uq" ON "help_attachments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "help_tickets_user_idx" ON "help_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "help_tickets_status_idx" ON "help_tickets" USING btree ("status");