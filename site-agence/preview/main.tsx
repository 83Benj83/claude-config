import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { CsvExport } from "@/lib/actions-contract";
import { Loading, Notice, PreviewApp } from "./app";
import { PreviewRepository } from "./repository";
import { createPreviewSession } from "./session";
import { PreviewStore, type Db } from "./store";
import "./styles.css";

declare const __LOCAL_MOCK__: boolean;

type Claude = { use(name: string): Promise<unknown> };
type Downloads = { save(request: { filename: string; data: string }): Promise<unknown> };

// Thème choisi sur cet appareil, appliqué avant le premier rendu.
try {
  const theme = localStorage.getItem("theme");
  if (theme === "dark" || theme === "light") document.documentElement.setAttribute("data-theme", theme);
} catch {
  // Stockage indisponible : thème du système.
}

const root = createRoot(document.getElementById("app")!);
root.render(<Loading />);

async function openDb(claude: Claude | undefined): Promise<Db | null> {
  if (claude) return (await claude.use("db")) as Db | null;
  if (__LOCAL_MOCK__) return (await import("./mock-db")).createMockDb();
  return null;
}

async function boot() {
  const claude = (window as unknown as { claude?: Claude }).claude;
  const db = await openDb(claude);
  if (!db) {
    root.render(
      <Notice title="Ouvre cet aperçu depuis claude.ai.">
        Il a besoin de ta session claude.ai pour lire et enregistrer les données partagées de l&apos;équipe.
      </Notice>,
    );
    return;
  }

  const store = new PreviewStore(db);
  store.start();
  const download = async ({ filename, content }: CsvExport) => {
    const downloads = claude ? ((await claude.use("downloads")) as Downloads | null) : null;
    if (!downloads) throw new Error("Téléchargement indisponible dans cette vue.");
    await downloads.save({ filename, data: content });
  };

  root.render(
    <StrictMode>
      <PreviewApp store={store} repository={new PreviewRepository(store)} session={createPreviewSession()} download={download} />
    </StrictMode>,
  );
}

void boot();
