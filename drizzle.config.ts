import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Muat .env.local lalu .env (Next.js memakai .env.local untuk dev).
config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL belum diisi. Salin .env.example ke .env.local lalu isi DATABASE_URL.",
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
