import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Muat variabel env agar uji integrasi bisa memakai DATABASE_URL.
config({ path: ".env.local" });
config({ path: ".env" });

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    root,
    // Uji integrasi DB dimatikan bila DATABASE_URL tidak tersedia.
    env: {},
  },
});
