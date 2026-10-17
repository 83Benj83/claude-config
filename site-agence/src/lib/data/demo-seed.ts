import { AGENCY_RESOURCES } from "@/content/resources";
import { addDays, isWeekend } from "../dates";
import type { Callback, Channel, Contract, IsoDate, Lead, Member, Message, Prospect, Resource } from "../types";

/**
 * Données d'exemple du mode démo et de l'aperçu interactif : une équipe
 * fictive, ses identifiants de test et un historique de prospection réaliste.
 * Tout est déterministe (mêmes données à chaque génération pour un jour donné).
 */

type DemoMember = Member & { demoPassword: string };

function demo(
  id: string,
  fullName: string,
  jobTitle: string,
  department: string,
  managerId: string | null,
  overrides: Partial<Member> = {},
): DemoMember {
  return {
    id,
    login: id,
    fullName,
    jobTitle,
    department,
    managerId,
    avatarUrl: null,
    isProspector: true,
    isAdmin: false,
    active: true,
    sortOrder: 0,
    welcomedAt: "2026-01-05T09:00:00.000Z",
    lastLoginAt: null,
    lastSeenAt: null,
    // Mot de passe de démonstration : identifiant + « 2026 ».
    demoPassword: `${id}2026`,
    ...overrides,
  };
}

export const DEMO_MEMBERS: readonly DemoMember[] = [
  demo("camille", "Camille Renaud", "Fondatrice & directrice", "Direction", null, { isAdmin: true, isProspector: false }),
  demo("mehdi", "Mehdi Belkacem", "Responsable commercial", "Commercial", "camille", { isAdmin: true, sortOrder: 1 }),
  demo("ines", "Inès Marchetti", "Lead développeuse", "Production", "camille", { isProspector: false, sortOrder: 2 }),
  demo("lea", "Léa Fontaine", "Chargée de prospection", "Commercial", "mehdi", { sortOrder: 3 }),
  demo("yanis", "Yanis Haddad", "Chargé de prospection", "Commercial", "mehdi", { sortOrder: 4 }),
  demo("clara", "Clara Nguyen", "Chargée de prospection", "Commercial", "mehdi", { sortOrder: 5 }),
  demo("theo", "Théo Garnier", "Chargé de prospection", "Commercial", "mehdi", { sortOrder: 6 }),
  demo("amandine", "Amandine Roux", "Business developer", "Commercial", "mehdi", { sortOrder: 7 }),
  demo("karim", "Karim Ouali", "Business developer", "Commercial", "mehdi", { sortOrder: 8 }),
  demo("hugo", "Hugo Lefebvre", "Designer UI/UX", "Production", "ines", { isProspector: false, sortOrder: 9 }),
  // Identifiant pas encore utilisé : montre l'écran de bienvenue à la première connexion.
  demo("recrue", "Nouvelle recrue", "Chargé de prospection", "Commercial", "mehdi", { sortOrder: 10, welcomedAt: null }),
];

/** Rythme moyen de prospects par jour ouvré, et villes de prédilection. */
const PROFILES: Record<string, { pace: number; cities: string[] }> = {
  mehdi: { pace: 5, cities: ["Lyon", "Villeurbanne"] },
  lea: { pace: 13, cities: ["Lyon", "Villeurbanne", "Annecy"] },
  yanis: { pace: 11, cities: ["Marseille", "Aix-en-Provence", "Toulon"] },
  clara: { pace: 15, cities: ["Bordeaux", "Toulouse"] },
  theo: { pace: 9, cities: ["Lille", "Lyon"] },
  amandine: { pace: 12, cities: ["Nantes", "Rennes", "Bordeaux"] },
  karim: { pace: 7, cities: ["Montpellier", "Marseille", "Nice"] },
};

/** Membres qui ont déjà prospecté aujourd'hui, pour animer le classement du jour. */
const ACTIVE_TODAY = new Set(["clara", "yanis", "lea", "karim"]);

const HISTORY_DAYS = 45;

const NAME_STARTS = [
  "Le Bistrot", "La Table", "Le Comptoir", "La Cantine", "L'Atelier", "Le Café", "La Brasserie", "Le Bouchon",
  "La Trattoria", "Pizzeria", "Crêperie", "Le Petit", "Chez", "La Maison", "Le Jardin", "La Terrasse", "Sushi",
  "Le Grill", "La Guinguette", "Burger",
];
const NAME_ENDS = [
  "du Marché", "des Halles", "de Marius", "de Léon", "du Port", "des Arts", "Saint-Paul", "Gourmand", "des Amis",
  "de la Gare", "du Coin", "Zinc", "Paulette", "Bella Napoli", "Kyo", "du Vieux Quartier", "des Canuts",
  "de Lucie", "Sous les Tilleuls", "du Square", "Fernand", "Mama Rosa", "Bonheur", "des Pêcheurs", "Lumière",
  "du Théâtre", "Gaston", "Olive", "de la Place", "Cocotte",
];

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
}

const pick = <T,>(random: () => number, items: readonly T[]): T => items[Math.floor(random() * items.length)];

/** Moyens de contact pondérés (le téléphone et Instagram dominent). */
const CHANNEL_WEIGHTS: [Channel, number][] = [
  ["telephone", 34], ["instagram", 24], ["email", 16], ["visite", 10], ["facebook", 8], ["formulaire", 5], ["linkedin", 2], ["autre", 1],
];

function pickChannel(random: () => number): Channel {
  const total = CHANNEL_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [channel, weight] of CHANNEL_WEIGHTS) {
    roll -= weight;
    if (roll < 0) return channel;
  }
  return "telephone";
}

/**
 * Numéros de démonstration : uniquement dans les plages que l'Arcep réserve
 * aux œuvres de fiction (04 65 71…, 06 39 98…), pour n'appeler personne par erreur.
 */
const two = (n: number) => String(n % 100).padStart(2, "0");
export const fictionalLandline = (n: number) => `04 65 71 ${two(Math.floor(n / 100))} ${two(n)}`;
const fictionalMobile = (a: number, b: number) => `06 39 98 ${two(a)} ${two(b)}`;

function contactFor(channel: Channel, name: string, random: () => number): string | null {
  const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, "");
  switch (channel) {
    case "telephone":
    {
      // Mêmes tirages qu'avant (données reproductibles), numéro dans la plage de fiction.
      random();
      random();
      random();
      return fictionalMobile(Math.floor(random() * 100), Math.floor(random() * 100));
    }
    case "instagram":
      return `@${slug.slice(0, 18)}`;
    case "email":
      return `contact@${slug.slice(0, 16)}.fr`;
    default:
      return null;
  }
}

/** Historique de prospects des 45 derniers jours, relatif à `today`. */
export function generateDemoProspects(today: IsoDate): Prospect[] {
  const prospects: Prospect[] = [];
  for (const [memberId, profile] of Object.entries(PROFILES)) {
    const random = seededRandom(hash(memberId));
    for (let offset = HISTORY_DAYS; offset >= 0; offset -= 1) {
      const date = addDays(today, -offset);
      if (offset === 0 && !ACTIVE_TODAY.has(memberId)) continue;
      if (isWeekend(date) && random() < 0.85) continue;
      if (random() < 0.08) continue; // jour off
      const count = Math.max(1, Math.round(profile.pace * (0.5 + random()) * (offset === 0 ? 0.6 : 1)));
      for (let index = 0; index < count; index += 1) {
        const city = pick(random, profile.cities);
        // Un vivier de noms par ville : certains établissements sont recontactés.
        const cityRandom = seededRandom(hash(city) + Math.floor(random() * 260));
        const name = `${pick(cityRandom, NAME_STARTS)} ${pick(cityRandom, NAME_ENDS)}`;
        const channel = pickChannel(random);
        const hour = 9 + Math.floor((index / count) * 9);
        prospects.push({
          id: `demo-${memberId}-${date}-${index}`,
          memberId,
          name,
          city,
          channel,
          contact: contactFor(channel, name, random),
          note: random() < 0.12 ? pick(random, ["Rappeler la semaine prochaine", "Intéressé, attend un devis", "Site actuel très lent", "Pas de site, seulement Instagram", "Gérant absent, repasser"]) : null,
          date,
          createdAt: `${date}T${String(hour).padStart(2, "0")}:${String(Math.floor(random() * 60)).padStart(2, "0")}:00.000Z`,
        });
      }
    }
  }
  return prospects;
}

/** Ressources de l'agence (contacts, liens, modèles du guide). */
export const DEMO_RESOURCES: readonly Resource[] = AGENCY_RESOURCES;

/** Liste « À contacter » de démonstration : des commerces fictifs, sans site web, surtout à appeler. */
export function demoLeads(today: IsoDate): Lead[] {
  const base = {
    status: "open" as const,
    doneBy: null,
    doneAt: null,
    prospectId: null,
    addedBy: null,
    batchId: null,
    outcome: null,
    address: null,
    tips: [] as string[],
    listDay: today,
    createdAt: `${today}T06:00:00.000Z`,
  };
  const phone = fictionalLandline;
  const leads: Lead[] = [
    { ...base, id: "demo-lead-1", name: "Pizzeria Il Forno", city: "Lyon", category: "Pizzeria", phone: phone(1), email: null, instagram: "https://www.instagram.com/ilforno.demo/", facebook: null, note: "Pas de site, 4,6 sur Google", address: "8 rue Mercière, 69002 Lyon", tips: ["Pas de site : seulement Instagram (1 200 abonnés)", "Pizzas au feu de bois, ouvert depuis 2015", "Angle : carte en ligne + commande à emporter"] },
    { ...base, id: "demo-lead-2", name: "Salon Coupe Nette", city: "Lyon", category: "Coiffeur", phone: null, email: "contact@coupenette.demo", instagram: null, facebook: "https://www.facebook.com/coupenette.demo", note: null },
    { ...base, id: "demo-lead-3", name: "Boulangerie du Port", city: "Marseille", category: "Boulangerie", phone: fictionalLandline(2), email: null, instagram: null, facebook: null, note: "Ouvert le dimanche", address: "2 quai du Port, 13002 Marseille", tips: ["Aucun site ni réseau social trouvé", "Clientèle de touristes sur le Vieux-Port", "Angle : commandes de gâteaux en ligne"] },
  ];
  const cities = ["Lyon", "Marseille", "Toulon"];
  for (let n = 4; n <= 15; n += 1) {
    leads.push({
      ...base,
      id: `demo-lead-${n}`,
      name: `Commerce de démonstration ${n}`,
      city: cities[n % cities.length],
      category: n % 2 ? "Restaurant" : "Artisan",
      phone: phone(n),
      email: null,
      instagram: null,
      facebook: null,
      note: null,
    });
  }
  return leads;
}

/**
 * Exemples du mode démo et de l'aperçu local : quelques rappels, messages et
 * contrats pour voir chaque rubrique remplie. Jamais envoyés dans une vraie base.
 */
export function demoExamples(today: IsoDate): { callbacks: Callback[]; messages: Message[]; contracts: Contract[] } {
  const at = (day: IsoDate, time: string) => `${day}T${time}:00.000Z`;
  const callback = (id: string, overrides: Partial<Callback>): Callback => ({
    id,
    name: "",
    city: null,
    phone: null,
    contactName: null,
    dueOn: today,
    dueTime: null,
    priority: "moyenne",
    note: null,
    addedBy: "lea",
    leadId: null,
    status: "pending",
    doneBy: null,
    doneAt: null,
    createdAt: at(addDays(today, -3), "09:00"),
    ...overrides,
  });
  const message = (id: string, authorId: string, channel: string, text: string, createdAt: string, reactions: Record<string, string[]> = {}): Message => ({
    id,
    authorId,
    text,
    attachments: [],
    createdAt,
    channel,
    replyTo: null,
    pinned: false,
    reactions,
  });
  const contract = (id: string, overrides: Partial<Contract>): Contract => ({
    id,
    client: "",
    city: null,
    contact: null,
    pack: "Pro",
    options: null,
    amount: null,
    monthly: null,
    status: "maquette",
    signedOn: addDays(today, -10),
    deliveredOn: null,
    siteUrl: null,
    broughtBy: null,
    note: null,
    createdAt: at(addDays(today, -10), "10:00"),
    updatedAt: at(addDays(today, -2), "10:00"),
    ...overrides,
  });
  return {
    callbacks: [
      callback("demo-rappel-1", { name: "Le Comptoir du Marché", city: "Lyon", phone: fictionalLandline(21), contactName: "Sophie, la gérante", dueOn: addDays(today, -1), priority: "haute", note: "Voulait réfléchir au pack Pro." }),
      callback("demo-rappel-2", { name: "Crêperie de Lucie", city: "Annecy", phone: fictionalLandline(22), dueTime: "15:00", addedBy: "yanis", note: "Rappeler après le service du midi." }),
      callback("demo-rappel-3", { name: "Salon Belle Mèche", city: "Toulon", phone: fictionalLandline(23), dueOn: addDays(today, 3), priority: "faible", addedBy: "clara" }),
    ],
    messages: [
      message("demo-msg-1", "mehdi", "general", "Bonjour à tous ! Objectif de la semaine : 60 appels chacun. On fait le point vendredi.", at(today, "07:30"), { "👍": ["lea", "clara"] }),
      message("demo-msg-2", "lea", "prospection", "Les boulangeries répondent mieux en milieu d'après-midi, après le rush du midi.", at(today, "08:15"), { "💡": ["yanis"] }),
      message("demo-msg-3", "clara", "astuces", "Phrase qui marche : « Je ne vends rien aujourd'hui, je vous montre juste à quoi ressemblerait votre site. »", at(addDays(today, -1), "16:40")),
    ],
    contracts: [
      contract("demo-contrat-1", { client: "Pizzeria Il Forno", city: "Lyon", pack: "Pro", amount: 490, monthly: 29, status: "developpement", broughtBy: "Léa Fontaine" }),
      contract("demo-contrat-2", { client: "Fleuriste Pétale", city: "Bordeaux", pack: "Essentiel", amount: 290, status: "termine", signedOn: addDays(today, -30), deliveredOn: addDays(today, -12), broughtBy: "Clara Nguyen" }),
    ],
  };
}
