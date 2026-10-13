import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      // Couche d'intégration (Supabase, session, chargement des pages) : couverte par les tests e2e.
      exclude: [
        "src/lib/supabase/**",
        "src/lib/auth/**",
        "src/lib/data/supabase-repository.ts",
        "src/lib/data/index.ts",
        "src/lib/env.ts",
        "src/lib/server/**",
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
