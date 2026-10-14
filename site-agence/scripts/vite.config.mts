import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/** Construction des scripts Node (import des identifiants, reprise de l'aperçu). */
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
      },
    },
  },
});
