CREATE TABLE "project_ledgers" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"tanggal" date,
	"jenis" text DEFAULT 'Debet' NOT NULL,
	"nominal" bigint DEFAULT 0 NOT NULL,
	"keterangan" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "pledger_project_idx" ON "project_ledgers" USING btree ("project_id");