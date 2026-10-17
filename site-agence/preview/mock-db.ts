/**
 * Base en mémoire, au même contrat que la capacité `db` : sert uniquement
 * aux tests locaux de l'aperçu (hors claude.ai). Jamais incluse dans la page
 * publiée.
 */
import { todayIso } from "@/lib/dates";
import { demoExamples } from "@/lib/data/demo-seed";
import { parseLead } from "@/lib/leads";
import parisLeads from "../data/leads-paris-2026-10.json";
import varLeads from "../data/leads-var-2026-10.json";
import type { Db } from "./store";
import { buildSeed } from "./seed-data";

/** Les listes « À contacter » réelles (Paris et Var), comme dans la base de l'aperçu publié. */
function leadDocs(today: string) {
  return [...parisLeads, ...varLeads].flatMap((row, index) => {
    const parsed = parseLead(row, today);
    if (!parsed.ok) return [];
    const { listDay, ...lead } = parsed.lead;
    return [
      {
        collection: "leads",
        id: `lead-${index + 1}`,
        data: { ...lead, listDay, status: "open", doneBy: null, doneAt: null, prospectId: null, addedBy: null, batchId: null, outcome: null, createdAt: `${today}T06:00:00.000Z` },
      },
    ];
  });
}

/** Exemples de rappels, messages et contrats : base locale de test seulement. */
function exampleDocs(today: string) {
  const examples = demoExamples(today);
  return (["callbacks", "messages", "contracts"] as const).flatMap((collection) =>
    examples[collection].map(({ id, ...data }) => ({ collection, id, data: data as Record<string, unknown> })),
  );
}

type Listener = { collection: string; order?: { field: string; dir: "asc" | "desc" }; limit?: number; next: (snap: unknown) => void };

export async function createMockDb(): Promise<Db> {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();
  for (const doc of [...(await buildSeed(todayIso(), { iterations: 2_000 })), ...leadDocs(todayIso()), ...exampleDocs(todayIso())]) {
    if (!collections.has(doc.collection)) collections.set(doc.collection, new Map());
    collections.get(doc.collection)!.set(doc.id, structuredClone(doc.data));
  }
  const listeners = new Set<Listener>();

  const snapshot = (listener: Listener) => {
    let docs = [...(collections.get(listener.collection) ?? new Map()).entries()].map(([id, data]) => ({
      id,
      exists: true,
      data: () => structuredClone(data),
    }));
    if (listener.order) {
      const { field, dir } = listener.order;
      docs = docs.sort((a, b) => String(a.data()[field]).localeCompare(String(b.data()[field])) * (dir === "desc" ? -1 : 1));
    }
    return { docs: docs.slice(0, listener.limit ?? docs.length) };
  };
  const notify = (collection: string) => {
    for (const listener of listeners) if (listener.collection === collection) queueMicrotask(() => listener.next(snapshot(listener)));
  };

  const query = (collection: string, order?: Listener["order"], limit?: number) => ({
    orderBy: (field: string, dir: "asc" | "desc" = "asc") => query(collection, { field, dir }, limit),
    limit: (n: number) => query(collection, order, n),
    onSnapshot(next: (snap: never) => void) {
      const listener: Listener = { collection, order, limit, next: next as (snap: unknown) => void };
      listeners.add(listener);
      queueMicrotask(() => listener.next(snapshot(listener)));
      return () => listeners.delete(listener);
    },
  });

  return {
    collection: (collection: string) => ({
      ...query(collection),
      doc: (id: string) => ({
        async set(data: Record<string, unknown>) {
          if (!collections.has(collection)) collections.set(collection, new Map());
          collections.get(collection)!.set(id, structuredClone(data));
          notify(collection);
        },
        async delete() {
          collections.get(collection)?.delete(id);
          notify(collection);
        },
      }),
    }),
  } as Db;
}

/** Fichiers de test locaux : gardés en mémoire, affichés par des adresses `blob:`. */
export function createMockFiles() {
  const urls = new Map<string, string>();
  return {
    async upload(blob: Blob) {
      const id = crypto.randomUUID().replaceAll("-", "");
      urls.set(id, URL.createObjectURL(blob));
      return id;
    },
    async remove(id: string) {
      const url = urls.get(id);
      if (url) URL.revokeObjectURL(url);
      urls.delete(id);
    },
    url: (id: string) => urls.get(id) ?? "",
  };
}
