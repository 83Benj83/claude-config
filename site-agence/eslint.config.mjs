import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Fichiers générés.
    "coverage/**",
    "preview/dist/**",
    "preview/dist-local/**",
    "preview/.seed-build/**",
  ]),
  {
    rules: {
      // Retirer un champ par décomposition (`{ secret, ...rest }`) est voulu.
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    },
  },
]);

export default eslintConfig;
