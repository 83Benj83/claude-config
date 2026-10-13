import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/** Construction des scripts Node (import des identifiants). */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./server-only-stub.ts", import.meta.url)),
    },
  },
  build: {
    ssr: fileURLToPath(new URL("./import-members.ts", import.meta.url)),
    outDir: fileURLToPath(new URL("./.build", import.meta.url)),
    emptyOutDir: true,
  },
});
