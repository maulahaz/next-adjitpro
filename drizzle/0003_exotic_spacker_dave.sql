CREATE TABLE "funding_contributions" (
	"id" text PRIMARY KEY NOT NULL,
	"funding_id" text NOT NULL,
	"investor_id" text NOT NULL,
	"jumlah" bigint DEFAULT 0 NOT NULL,
	"tanggal" date,
	"status" text DEFAULT 'Aktif' NOT NULL,
	"catatan" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funding_returns" (
	"id" text PRIMARY KEY NOT NULL,
	"funding_id" text NOT NULL,
	"tanggal" date,
	"jumlah" bigint DEFAULT 0 NOT NULL,
	"catatan" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fundings" (
	"id" text PRIMARY KEY NOT NULL,
	"pihak_ketiga_id" text,
	"nama" text NOT NULL,
	"target_modal" bigint DEFAULT 0 NOT NULL,
	"tanggal_mulai" date,
	"jatuh_tempo" date,
	"status" text DEFAULT 'Draft' NOT NULL,
	"catatan" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invest_agreements" (
	"id" text PRIMARY KEY NOT NULL,
	"funding_id" text NOT NULL,
	"profit_investor" numeric(5, 2) DEFAULT '0' NOT NULL,
	"profit_client" numeric(5, 2) DEFAULT '0' NOT NULL,
	"loss_rule" text DEFAULT 'Proporsional' NOT NULL,
	"jatuh_tempo" date,
	"principal_term" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investors" ADD COLUMN "email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "profit_distributions" ADD COLUMN "funding_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "funding_id" text;--> statement-breakpoint
-- Backfill: satu Funding "legacy" per pihak ketiga yang memiliki proyek
-- (plus satu untuk proyek tanpa pihak ketiga), lalu isi projects.funding_id.
WITH distinct_tp AS (
	SELECT DISTINCT pihak_ketiga_id FROM "projects"
), numbered AS (
	SELECT pihak_ketiga_id, row_number() OVER (ORDER BY pihak_ketiga_id NULLS LAST) AS rn
	FROM distinct_tp
), base AS (
	SELECT COALESCE((SELECT value FROM "counters" WHERE name = 'Fundings'), 0) AS value
)
INSERT INTO "fundings" (id, pihak_ketiga_id, nama, target_modal, tanggal_mulai, status, catatan)
SELECT
	'FND-' || lpad((base.value + numbered.rn)::text, 4, '0'),
	numbered.pihak_ketiga_id,
	CASE WHEN numbered.pihak_ketiga_id IS NULL
		THEN 'Legacy (tanpa pihak ketiga)'
		ELSE 'Legacy - ' || tp.nama END,
	0,
	CURRENT_DATE,
	'Berjalan',
	'Funding migrasi otomatis'
FROM numbered CROSS JOIN base
LEFT JOIN "third_parties" tp ON tp.id = numbered.pihak_ketiga_id;--> statement-breakpoint
UPDATE "projects" p
SET funding_id = f.id
FROM "fundings" f
WHERE f.catatan = 'Funding migrasi otomatis'
	AND f.pihak_ketiga_id IS NOT DISTINCT FROM p.pihak_ketiga_id;--> statement-breakpoint
INSERT INTO "counters" (name, value)
SELECT 'Fundings', COUNT(*) FROM "fundings" WHERE catatan = 'Funding migrasi otomatis'
ON CONFLICT (name) DO UPDATE SET value = GREATEST("counters".value, EXCLUDED.value);--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "funding_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "alokasi_budget" bigint;--> statement-breakpoint
ALTER TABLE "third_parties" ADD COLUMN "email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "third_parties" ADD COLUMN "alamat" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "third_parties" ADD COLUMN "status" text DEFAULT 'Aktif' NOT NULL;--> statement-breakpoint
CREATE INDEX "fcontrib_funding_idx" ON "funding_contributions" USING btree ("funding_id");--> statement-breakpoint
CREATE INDEX "fcontrib_investor_idx" ON "funding_contributions" USING btree ("investor_id");--> statement-breakpoint
CREATE INDEX "freturn_funding_idx" ON "funding_returns" USING btree ("funding_id");--> statement-breakpoint
CREATE INDEX "fundings_pihak_ketiga_idx" ON "fundings" USING btree ("pihak_ketiga_id");--> statement-breakpoint
CREATE INDEX "fundings_status_idx" ON "fundings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "iagree_funding_uq" ON "invest_agreements" USING btree ("funding_id");--> statement-breakpoint
CREATE INDEX "projects_funding_idx" ON "projects" USING btree ("funding_id");