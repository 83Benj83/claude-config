import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * Aperçu interactif : les écrans du site empaquetés dans une seule page,
 * branchée sur la base partagée de l'Artifact. `npm run preview:build`.
 * PREVIEW_MOCK=1 ajoute une base locale en mémoire pour tester hors claude.ai.
 */
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  plugins: [tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  define: { __LOCAL_MOCK__: JSON.stringify(process.env.PREVIEW_MOCK === "1") },
  build: {
    outDir: process.env.PREVIEW_MOCK === "1" ? "dist-local" : "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 100_000_000,
    rolldownOptions: {
      output: { codeSplitting: false },
      // Directives « use client » des bibliothèques : sans objet dans une page sans serveur.
      onwarn(warning, warn) {
        if (warning.code !== "MODULE_LEVEL_DIRECTIVE") warn(warning);
      },
    },
  },
});
