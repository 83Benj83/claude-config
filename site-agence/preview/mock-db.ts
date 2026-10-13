/**
 * Base en mémoire, au même contrat que la capacité `db` : sert uniquement
 * aux tests locaux de l'aperçu (hors claude.ai). Jamais incluse dans la page
 * publiée.
 */
import { todayIso } from "@/lib/dates";
import type { Db } from "./store";
import { buildSeed } from "./seed-data";

type Listener = { collection: string; order?: { field: string; dir: "asc" | "desc" }; limit?: number; next: (snap: unknown) => void };

export async function createMockDb(): Promise<Db> {
  const collections = new Map<string, Map<string, Record<string, unknown>>>();
  for (const doc of await buildSeed(todayIso(), { iterations: 2_000 })) {
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
