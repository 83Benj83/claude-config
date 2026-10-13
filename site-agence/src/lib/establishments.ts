import type { Channel, IsoDate, Member, Prospect } from "./types";

/**
 * Reconnaissance des établissements déjà contactés.
 * Deux saisies désignent le même restaurant quand leurs noms normalisés
 * (sans accents, ponctuation, articles ni « restaurant ») et leurs villes
 * normalisées sont identiques : « Restaurant Le Petit Zinc » à « LYON »
 * et « le petit zinc » à « Lyon » sont reconnus comme un seul établissement.
 */

/** Mots génériques ignorés dans les noms d'établissements. */
const NAME_STOPWORDS = new Set(["restaurant", "resto", "le", "la", "les", "l", "chez", "the", "au", "aux"]);

/** Texte en minuscules, sans accents ni ponctuation, espaces réduits. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/['’`]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function significantTokens(text: string): string[] {
  const tokens = normalizeText(text).split(" ").filter(Boolean);
  const meaningful = tokens.filter((token) => !NAME_STOPWORDS.has(token));
  // « Le Resto » ne doit pas devenir une clé vide.
  return meaningful.length > 0 ? meaningful : tokens;
}

/** Clé de comparaison d'un nom d'établissement. */
export function nameKey(name: string): string {
  return significantTokens(name).join(" ");
}

/** Clé de comparaison d'une ville (« Saint-Étienne » → « saint etienne »). */
export function cityKey(city: string): string {
  return normalizeText(city.replace(/\bst\b\.?/gi, "saint").replace(/\bste\b\.?/gi, "sainte"));
}

export type Contact = {
  prospectId: string;
  memberId: string;
  memberName: string;
  date: IsoDate;
  channel: Channel;
  contact: string | null;
  note: string | null;
};

/** Un restaurant et l'historique de ses prises de contact par l'équipe. */
export type Establishment = {
  key: string;
  name: string;
  city: string;
  contacts: Contact[];
  lastDate: IsoDate;
};

const establishmentKey = (prospect: Pick<Prospect, "name" | "city">) =>
  `${nameKey(prospect.name)}|${cityKey(prospect.city)}`;

/** Regroupe les prospects par établissement, du plus récemment contacté au plus ancien. */
export function groupEstablishments(prospects: readonly Prospect[], members: readonly Member[]): Establishment[] {
  const names = new Map(members.map((member) => [member.id, member.fullName]));
  const groups = new Map<string, Prospect[]>();
  for (const prospect of prospects) {
    const key = establishmentKey(prospect);
    groups.set(key, [...(groups.get(key) ?? []), prospect]);
  }

  const establishments: Establishment[] = [];
  for (const [key, items] of groups) {
    const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    establishments.push({
      key,
      // L'orthographe la plus récente fait foi.
      name: sorted[0].name,
      city: sorted[0].city,
      lastDate: sorted[0].date,
      contacts: sorted.map((prospect) => ({
        prospectId: prospect.id,
        memberId: prospect.memberId,
        memberName: names.get(prospect.memberId) ?? "Ancien membre",
        date: prospect.date,
        channel: prospect.channel,
        contact: prospect.contact,
        note: prospect.note,
      })),
    });
  }
  return establishments.sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name, "fr"));
}

/** Score de pertinence d'un nom pour une recherche (0 = ne correspond pas). */
function matchScore(establishmentName: string, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const tokens = significantTokens(establishmentName);
  const key = tokens.join(" ");
  const query = queryTokens.join(" ");
  if (key === query) return 100;
  let score = 0;
  for (const queryToken of queryTokens) {
    if (tokens.includes(queryToken)) score += 10;
    else if (tokens.some((token) => token.startsWith(queryToken))) score += 6;
    else if (key.includes(queryToken)) score += 3;
    else return 0; // chaque mot cherché doit apparaître
  }
  return key.startsWith(query) ? score + 5 : score;
}

/** Mots significatifs d'une recherche (au moins 2 caractères). */
export function searchTokens(query: string): string[] {
  return significantTokens(query).filter((token) => token.length >= 2);
}

/**
 * Recherche d'établissements par nom, éventuellement filtrée par ville.
 * Tolère accents, majuscules, articles et mots partiels (« petit zi » trouve « Le Petit Zinc »).
 */
export function searchEstablishments(
  establishments: readonly Establishment[],
  query: string,
  city = "",
  limit = 50,
): Establishment[] {
  const tokens = searchTokens(query);
  const wantedCity = cityKey(city);
  if (tokens.length === 0) return [];
  return establishments
    .filter((establishment) => !wantedCity || cityKey(establishment.city).startsWith(wantedCity))
    .map((establishment) => ({ establishment, score: matchScore(establishment.name, tokens) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || b.establishment.lastDate.localeCompare(a.establishment.lastDate))
    .slice(0, limit)
    .map((match) => match.establishment);
}

export type DuplicateCheck = {
  /** Même nom et même ville : déjà contacté. */
  sameCity: Establishment | null;
  /** Même nom dans d'autres villes (peut-être une chaîne, ou une erreur de ville). */
  otherCities: Establishment[];
};

/** Vérifie, pendant la saisie, si un établissement a déjà été contacté. */
export function checkDuplicate(establishments: readonly Establishment[], name: string, city: string): DuplicateCheck {
  const wantedName = nameKey(name);
  if (wantedName.length < 2) return { sameCity: null, otherCities: [] };
  const wantedCity = cityKey(city);
  const sameName = establishments.filter((establishment) => nameKey(establishment.name) === wantedName);
  return {
    sameCity: wantedCity ? (sameName.find((e) => cityKey(e.city) === wantedCity) ?? null) : null,
    otherCities: sameName.filter((e) => !wantedCity || cityKey(e.city) !== wantedCity),
  };
}

/** Villes déjà saisies par l'équipe (pour l'auto-complétion), les plus fréquentes d'abord. */
export function knownCities(prospects: readonly Prospect[], limit = 30): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const prospect of prospects) {
    const key = cityKey(prospect.city);
    const current = counts.get(key);
    counts.set(key, { label: current?.label ?? prospect.city.trim(), count: (current?.count ?? 0) + 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"))
    .slice(0, limit)
    .map((entry) => entry.label);
}
