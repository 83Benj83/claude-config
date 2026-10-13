import { todayIso } from "../dates";
import type { DateRange, Entry, IsoDate, Member, MemberPatch } from "../types";
import { DEMO_MEMBERS, generateDemoEntries } from "./demo-seed";
import type { Repository } from "./repository";

type DemoState = {
  members: Member[];
  /** Clé `memberId|date`, une seule saisie par personne et par jour. */
  entries: Map<string, Entry>;
};

const entryKey = (memberId: string, date: IsoDate) => `${memberId}|${date}`;

export function createDemoState(today: IsoDate): DemoState {
  return {
    members: DEMO_MEMBERS.map((member) => ({ ...member })),
    entries: new Map(generateDemoEntries(today).map((e) => [entryKey(e.memberId, e.date), e])),
  };
}

/**
 * Stockage en mémoire du mode démo. Les modifications durent tant que le
 * serveur tourne ; un redémarrage remet les données d'exemple.
 */
export class DemoRepository implements Repository {
  constructor(private readonly state: DemoState) {}

  async listMembers(): Promise<Member[]> {
    return this.state.members.map((member) => ({ ...member }));
  }

  async getMember(id: string): Promise<Member | null> {
    const member = this.state.members.find((m) => m.id === id);
    return member ? { ...member } : null;
  }

  async listEntries({ from, to }: DateRange): Promise<Entry[]> {
    return [...this.state.entries.values()]
      .filter((entry) => entry.date >= from && entry.date <= to)
      .map((entry) => ({ ...entry }));
  }

  async upsertEntry(entry: Entry): Promise<void> {
    this.state.entries.set(entryKey(entry.memberId, entry.date), { ...entry });
  }

  async updateMember(id: string, patch: MemberPatch): Promise<void> {
    this.state.members = this.state.members.map((member) =>
      member.id === id ? { ...member, ...patch } : member,
    );
  }
}

const globalForDemo = globalThis as typeof globalThis & { __demoState?: DemoState };

/** État partagé par toutes les requêtes du process (survit au rechargement à chaud). */
export function getDemoRepository(): DemoRepository {
  globalForDemo.__demoState ??= createDemoState(todayIso());
  return new DemoRepository(globalForDemo.__demoState);
}
