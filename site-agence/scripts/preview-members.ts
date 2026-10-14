/**
 * Identifiants de l'aperçu (documents `members` et `credentials` exportés de
 * sa base) convertis pour le site : mêmes noms, postes, rôles et mots de passe
 * (seulement leurs empreintes, jamais le mot de passe lui-même).
 */
export type PreviewMember = {
  key: string;
  login: string;
  fullName: string;
  jobTitle: string;
  department: string | null;
  managerKey: string | null;
  isProspector: boolean;
  isAdmin: boolean;
  active: boolean;
  sortOrder: number;
  welcomedAt: string | null;
  passwordHash: string;
};

type Doc = Record<string, unknown>;

/** Un export peut envelopper les champs dans `data`. */
const fields = (doc: unknown): Doc => {
  const value = typeof doc === "object" && doc !== null ? (doc as Doc) : {};
  return typeof value.data === "object" && value.data !== null ? (value.data as Doc) : value;
};
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const HASH = /^pbkdf2\$\d{4,7}\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/;

export function membersFromPreview(members: Record<string, unknown>, credentials: Record<string, unknown>): { members: PreviewMember[]; problems: string[] } {
  const problems: string[] = [];
  const converted = Object.entries(members).flatMap(([key, doc]): PreviewMember[] => {
    const data = fields(doc);
    const passwordHash = text(fields(credentials[key]).passwordHash);
    const login = text(data.login);
    const fullName = text(data.fullName);
    if (!login || !fullName) {
      problems.push(`${key} : identifiant ou nom manquant.`);
      return [];
    }
    if (!HASH.test(passwordHash)) {
      problems.push(`${login} : empreinte du mot de passe absente ou illisible.`);
      return [];
    }
    return [
      {
        key,
        login,
        fullName,
        jobTitle: text(data.jobTitle) || "Membre de l'équipe",
        department: text(data.department) || null,
        managerKey: text(data.managerId) || null,
        isProspector: data.isProspector === true,
        isAdmin: data.isAdmin === true,
        active: data.active !== false,
        sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
        welcomedAt: text(data.welcomedAt) || null,
        passwordHash,
      },
    ];
  });
  if (converted.length > 0 && !converted.some((member) => member.isAdmin && member.active)) problems.push("aucun admin actif.");
  return { members: converted.sort((a, b) => a.sortOrder - b.sortOrder), problems };
}
