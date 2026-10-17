import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/** Construction des scripts Node (import des identifiants, reprise de l'aperçu, listes à contacter). */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./server-only-stub.ts", import.meta.url)),
    },
  },
  build: {
    ssr: true,
    outDir: fileURLToPath(new URL("./.build", import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        "import-members": fileURLToPath(new URL("./import-members.ts", import.meta.url)),
        "import-preview": fileURLToPath(new URL("./import-preview.ts", import.meta.url)),
        "add-leads": fileURLToPath(new URL("./add-leads.ts", import.meta.url)),
        "leads-seed": fileURLToPath(new URL("./leads-seed.ts", import.meta.url)),
      },
    },
  },
});
