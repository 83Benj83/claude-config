import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { CsvExport } from "@/lib/actions-contract";
import { Loading, Notice, PreviewApp } from "./app";
import { PreviewRepository, type PreviewFiles } from "./repository";
import { createPreviewSession } from "./session";
import { PreviewStore, type Db } from "./store";
import "./styles.css";

declare const __LOCAL_MOCK__: boolean;

type Claude = { use(name: string): Promise<unknown> };
type Downloads = { save(request: { filename: string; data: string }): Promise<unknown> };
type Assets = { upload(blob: Blob, options?: { type?: string }): Promise<{ id: string }>; delete(ref: string): Promise<unknown> };

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

/** Fichiers de l'échange : ceux de l'Artifact (`null` pour qui ne peut pas en envoyer). */
async function openFiles(claude: Claude | undefined): Promise<PreviewFiles | null> {
  if (claude) {
    const assets = (await claude.use("assets")) as Assets | null;
    if (!assets) return null;
    return {
      upload: async (blob, type) => (await assets.upload(blob, { type })).id,
      remove: async (id) => {
        try {
          await assets.delete(id);
        } catch {
          // Fichier de quelqu'un d'autre ou déjà supprimé : le message, lui, est bien retiré.
        }
      },
      url: (id) => `/_blob/${id}`,
    };
  }
  if (__LOCAL_MOCK__) return (await import("./mock-db")).createMockFiles();
  return null;
}

async function boot() {
  const claude = (window as unknown as { claude?: Claude }).claude;
  const db = await openDb(claude);
  if (!db) {
    root.render(
      <Notice title="Connecte-toi à claude.ai pour ouvrir l'espace.">
        Clique sur « Connexion » en haut à droite de la page (crée un compte claude.ai gratuit si tu n&apos;en as pas, avec l&apos;adresse
        que tu as donnée à Paul), puis rouvre ce lien : tu pourras alors te connecter avec ton identifiant et ton mot de passe Astrinova.
      </Notice>,
    );
    return;
  }

  const store = new PreviewStore(db);
  store.start();
  const files = await openFiles(claude);
  // Tout le monde voit les fichiers, même sans pouvoir en envoyer.
  const fileUrl = (id: string) => (files ? files.url(id) : `/_blob/${encodeURIComponent(id)}`);
  const download = async ({ filename, content }: CsvExport) => {
    const downloads = claude ? ((await claude.use("downloads")) as Downloads | null) : null;
    if (!downloads) throw new Error("Téléchargement indisponible dans cette vue.");
    await downloads.save({ filename, data: content });
  };

  root.render(
    <StrictMode>
      <PreviewApp
        store={store}
        repository={new PreviewRepository(store, files)}
        session={createPreviewSession()}
        download={download}
        fileUrl={fileUrl}
        canUpload={files !== null}
      />
    </StrictMode>,
  );
}

void boot();
