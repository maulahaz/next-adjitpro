CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"waktu" timestamp with time zone DEFAULT now() NOT NULL,
	"user" text DEFAULT 'anon' NOT NULL,
	"aksi" text NOT NULL,
	"sheet" text DEFAULT '' NOT NULL,
	"record_id" text DEFAULT '' NOT NULL,
	"detail" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capital_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tanggal" date,
	"investor_id" text NOT NULL,
	"tipe" text NOT NULL,
	"jumlah" bigint DEFAULT 0 NOT NULL,
	"catatan" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counters" (
	"name" text PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investors" (
	"id" text PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"kontak" text DEFAULT '' NOT NULL,
	"rekening" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Aktif' NOT NULL,
	"tanggal_daftar" date,
	"catatan" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"username" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profit_distributions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"investor_id" text NOT NULL,
	"porsi" numeric(9, 4) DEFAULT '0' NOT NULL,
	"jumlah_laba" bigint DEFAULT 0 NOT NULL,
	"tanggal" date,
	"catatan" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_funding" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"investor_id" text NOT NULL,
	"jumlah" bigint DEFAULT 0 NOT NULL,
	"tanggal" date,
	"status" text DEFAULT 'Aktif' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"tanggal" date,
	"tipe" text NOT NULL,
	"jumlah" bigint DEFAULT 0 NOT NULL,
	"keterangan" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"pihak_ketiga_id" text,
	"tanggal_mulai" date,
	"tanggal_selesai_rencana" date,
	"tanggal_selesai_aktual" date,
	"status" text DEFAULT 'Draft' NOT NULL,
	"catatan" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "third_parties" (
	"id" text PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"kontak" text DEFAULT '' NOT NULL,
	"catatan" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"salt" text DEFAULT '' NOT NULL,
	"hash_algo" text DEFAULT 'bcrypt' NOT NULL,
	"nama" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'investor' NOT NULL,
	"investor_id" text,
	"third_party_id" text,
	"status" text DEFAULT 'Aktif' NOT NULL,
	"tanggal_dibuat" date,
	"last_login" timestamp with time zone,
	"catatan" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_waktu_idx" ON "audit_log" USING btree ("waktu");--> statement-breakpoint
CREATE INDEX "capital_investor_idx" ON "capital_transactions" USING btree ("investor_id");--> statement-breakpoint
CREATE INDEX "investors_nama_idx" ON "investors" USING btree ("nama");--> statement-breakpoint
CREATE INDEX "dist_project_idx" ON "profit_distributions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "dist_investor_idx" ON "profit_distributions" USING btree ("investor_id");--> statement-breakpoint
CREATE INDEX "funding_project_idx" ON "project_funding" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "funding_investor_idx" ON "project_funding" USING btree ("investor_id");--> statement-breakpoint
CREATE INDEX "ptx_project_idx" ON "project_transactions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_pihak_ketiga_idx" ON "projects" USING btree ("pihak_ketiga_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");