# AGENTS.md

AdjitPro — Next.js 15 (App Router) port of a Google Apps Script investment-finance app.
Stack: React 19, TypeScript, PostgreSQL, Drizzle ORM, Tailwind CSS 3, shadcn/ui, Vitest.

**Language rule:** all user-facing strings, validation/error messages, and code comments are
Indonesian and intentionally match the legacy app *verbatim*. Do not translate or reword them —
identical messages are a product requirement (see `docs/MIGRATION_PLAN.md` §1.5). Match the
surrounding Indonesian style when adding comments.

## Commands

```powershell
npm run dev            # dev server -> http://localhost:3000
npm run build / npm start
npm run typecheck      # tsc --noEmit — the real correctness gate
npm test               # vitest run
npx vitest run tests/domain.test.ts        # single file
npx vitest run -t "allocateProRata"        # single test by name
```

Database / migration:

```powershell
npm run db:generate    # after editing src/lib/db/schema.ts, generate a migration into drizzle/
npm run db:migrate     # apply migrations (use this in prod — NOT db:push)
npm run db:seed        # idempotent default admin
npm run db:reset       # DESTRUCTIVE, dev only
npm run migrate:legacy -- --dir "<csv folder>" [--wipe] [--dry-run]
```

Gotchas:

- **`npm test` is destructive when `DATABASE_URL` is set.** The integration suite's `beforeAll`
  `TRUNCATE`s every table (including the seeded admin). Never run it against a DB with data you
  care about. Integration tests auto-skip when `DATABASE_URL` is unset.
- `npm run lint` (`next lint`) has no ESLint installed/config — it may prompt or fail. Gate on
  `npm run typecheck` + `npm run build` instead (`next.config.ts` already ignores ESLint in builds).
- `drizzle.config.ts` throws if `DATABASE_URL` is missing. Env load order is `.env.local` then `.env`.
- Never run `npm audit fix --force`: it forces Tailwind v4 and breaks the config. Known audit
  findings are intentionally accepted (README §8).

## Setup

- Node 20+, PostgreSQL 14+. `Copy-Item .env.example .env.local`, then
  `npm install && npm run db:migrate && npm run db:seed`.
- First login: `admin` / `admin123`.
- `@/*` maps to `./src/*` (tsconfig paths; also honored by the `tsx` scripts in `scripts/`).

## Architecture

- `src/lib/domain/*` — pure, DB-free logic (prorata, balances, project-totals, money, dates,
  permissions). Put testable rules here; covered by `tests/domain.test.ts`.
- `src/lib/services/*` — DB access + business rules; direct ports of the legacy `*.gs` modules
  (old→new mapping in README §5 and `docs/MIGRATION_PLAN.md` §2.1).
- `src/app/actions/*` — `"use server"` Server Actions; thin wrappers replacing legacy `apiXxx`.
  Return `ActionState` and route errors through `errorState()`.
- `src/lib/auth/*` — session (DB `sessions` table + `httpOnly` cookie), password, guards.
  **There is no `middleware.ts`**: authorization is enforced per page (`requireUserPage` /
  `requireRolesPage`) and per action (`requireWrite` / `requireRoles`). `src/app/(app)/layout.tsx`
  sets `dynamic = "force-dynamic"`.
- `src/lib/db/schema.ts` — single source of truth for the schema; migrations are generated into `drizzle/`.
- `src/components/app/data-table.tsx` — the **standard table** (search + pagination, 10 rows/page)
  used by every data list. Build rows as `<TableRow>` JSX and pass `head`/`rows`/`searchText`; pass
  `bordered={false}` when the table already sits inside a `Card`. Keep new tables on this component
  rather than hand-rolling `Table` markup.

## Invariants (do not break)

- Money is integer Rupiah (`bigint`); never floats. `porsi` is `numeric(9,4)`.
- IDs keep the legacy text format (`INV-0001`, `PRJ-0001`, …) and are allocated atomically via the
  `counters` table (`src/lib/services/ids.ts`). Don't change the format or bypass `counters`.
- `allocateProRata` uses largest-remainder rounding so the distributed total **always** equals the
  profit exactly; losses are negative and follow the same rule.
- Lifecycle: fund a `Draft` project → `Berjalan`; distribute profit once (→ `Selesai`); a profitable
  project must be distributed before `closeProject`; closing frees `project_funding`
  (`Aktif` → `Dibebaskan`). Withdrawals/placements cannot exceed the investor's idle balance.
- Legacy passwords (`sha256(salt + "::" + password)`) must keep verifying and auto-upgrade to bcrypt
  on successful login — preserve `legacyHashPassword` / `verifyPassword` semantics.
- Role scoping is server-side: `investor` sees only their own data; `client` sees only its third
  party's projects, and `rolesReadInternal` deliberately excludes `client`. There are two write
  exceptions, both re-verified in the service against the client's `thirdPartyId`:
  1. **Project CRUD** — `saveProject` / `deleteProject` take an optional `ProjectScope`; the actions
     allow `[admin, client]`, and a client's create forces `pihakKetigaId` to its own third party.
     Operator is read-only on `/projects`; client manages projects from `/my-projects`.
  2. **ProjectLedger** (`src/lib/services/project-ledgers.ts` + `src/app/actions/project-ledgers.ts`) —
     client-only write, read-only elsewhere (shown on the project detail page). Ledger IDs use
     `serial` (auto-increment), not the legacy text format — it is a new module, not from the old app.

## Data & sensitive files

- `mhz/` is a gitignored local export of the **real client** Google Sheet (sensitive) — never commit
  or expose it. `src/lib/db/data/` holds the committed CSV fixtures used to exercise `migrate:legacy`.
- `migrate:legacy` is idempotent (`ON CONFLICT DO NOTHING`), preserves legacy IDs, and syncs
  `counters`; `--wipe` truncates all tables first.
- Never commit `.env.local`.

## Docs

`docs/INSTALL.md`, `docs/DEPLOYMENT.md`, `docs/DATA_MIGRATION.md`,
`docs/MIGRATION_PLAN.md` (complete legacy→Next mapping and phase status), `docs/PRD.md`.
