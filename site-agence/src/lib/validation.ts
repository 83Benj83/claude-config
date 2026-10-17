import { z } from "zod";
import { isChannel } from "./channels";
import { addDays, isIsoDate } from "./dates";
import { EDITABLE_PAST_DAYS, MIN_PASSWORD_LENGTH } from "./rules";
import type { Channel, IsoDate } from "./types";

/** Texte d'une ligne, sans caractères de contrôle (retours chariot, tabulations…). */
const NO_CONTROL_CHARS = /^[^\p{Cc}]*$/u;
const CONTROL_CHARS_MESSAGE = "Caractères non autorisés.";

const line = (min: number, max: number, minMessage: string) =>
  z
    .string({ error: minMessage })
    .trim()
    .min(min, minMessage)
    .max(max, `${max} caractères maximum.`)
    .regex(NO_CONTROL_CHARS, CONTROL_CHARS_MESSAGE);

const optionalLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .regex(NO_CONTROL_CHARS, CONTROL_CHARS_MESSAGE)
    .transform((value) => (value === "" ? null : value));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .transform((value) => (value === "" ? null : value));

/** Une saisie n'est acceptée que pour aujourd'hui et les jours récents. */
export function isEditableDate(date: IsoDate, today: IsoDate): boolean {
  return date <= today && date >= addDays(today, -EDITABLE_PAST_DAYS);
}

export const prospectSchema = z.object({
  name: line(2, 120, "Indique le nom du commerce."),
  city: line(2, 80, "Indique la ville."),
  channel: z.string().refine(isChannel, "Choisis le moyen de contact.").transform((value) => value as Channel),
  contact: optionalLine(160),
  note: optionalText(500),
  date: z.string().refine(isIsoDate, "Date invalide."),
});

export const loginSchema = z.object({
  login: z.string().trim().min(1, "Choisis ton identifiant.").max(60),
  password: z.string().min(1, "Entre ton mot de passe.").max(200),
});

/** Première connexion : la personne confirme son nom ; le poste est fixé par les admins. */
export const welcomeSchema = z.object({
  fullName: line(2, 80, "Indique ton prénom et ton nom."),
});

export const memberSchema = z.object({
  id: z
    .string()
    .max(64)
    .transform((value) => (value === "" ? null : value)),
  login: line(2, 40, "Choisis un identifiant (2 caractères minimum)."),
  fullName: line(2, 80, "Indique le prénom et le nom."),
  jobTitle: line(2, 80, "Indique le poste."),
  department: optionalLine(60),
  managerId: z
    .string()
    .max(64)
    .transform((value) => (value === "" ? null : value)),
  avatarUrl: optionalLine(500).refine(
    (value) => value === null || /^https:\/\//.test(value),
    "L'URL de la photo doit commencer par https://",
  ),
  /** Vide = mot de passe inchangé (obligatoire à la création, vérifié par l'action). */
  password: z
    .string()
    .max(200)
    .refine((value) => value === "" || value.length >= MIN_PASSWORD_LENGTH, `${MIN_PASSWORD_LENGTH} caractères minimum.`),
  isProspector: z.boolean(),
  isAdmin: z.boolean(),
  active: z.boolean(),
});

export type MemberInput = z.infer<typeof memberSchema>;

export const resourceSchema = z
  .object({
    id: z
      .string()
      .max(64)
      .transform((value) => (value === "" ? null : value)),
    kind: z.enum(["email", "phone", "template", "link"], { error: "Choisis un type." }),
    title: line(2, 100, "Donne un titre."),
    value: z.string().trim().min(1, "Ce champ est obligatoire.").max(5000, "5000 caractères maximum."),
    note: optionalText(300),
    sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .superRefine((resource, ctx) => {
    if (resource.kind === "email" && !z.email().safeParse(resource.value).success) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Adresse e-mail invalide." });
    }
    if (resource.kind === "phone" && !/^\+?[\d .()-]{6,20}$/.test(resource.value)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Numéro de téléphone invalide." });
    }
    if (resource.kind === "link" && !/^https?:\/\/\S+$/.test(resource.value)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Le lien doit commencer par https://" });
    }
  });

export type ResourceFormInput = z.infer<typeof resourceSchema>;

/** Montant en euros saisi librement (« 490 », « 490,50 », vide = non renseigné). */
const optionalEuros = (max: number) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === "") return null;
      const amount = Number(value.replace(/\s|€/g, "").replace(",", "."));
      if (!Number.isFinite(amount) || amount < 0 || amount > max) {
        ctx.addIssue({ code: "custom", message: `Montant entre 0 et ${max} €.` });
        return z.NEVER;
      }
      return Math.round(amount * 100) / 100;
    });

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === "" || isIsoDate(value), "Date invalide.")
  .transform((value) => (value === "" ? null : value));

export const contractSchema = z.object({
  id: z
    .string()
    .max(64)
    .transform((value) => (value === "" ? null : value)),
  client: line(2, 120, "Indique le nom du commerce."),
  city: optionalLine(80),
  contact: optionalLine(160),
  pack: z.enum(["Essentiel", "Pro", "Signature", "Sur mesure"], { error: "Choisis le pack." }),
  options: optionalText(300),
  amount: optionalEuros(100_000),
  monthly: optionalEuros(10_000),
  status: z.enum(["maquette", "developpement", "validation", "termine"], { error: "Choisis l'étape." }),
  signedOn: z.string().refine(isIsoDate, "Indique la date de signature."),
  deliveredOn: optionalDate,
  siteUrl: optionalLine(300).refine((value) => value === null || /^https?:\/\/\S+$/.test(value), "Le lien doit commencer par https://"),
  broughtBy: z
    .string()
    .max(64)
    .transform((value) => (value === "" ? null : value)),
  note: optionalText(500),
});

/** Premier message d'erreur par champ, pour l'affichage sous les inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Rappels                                                             */
/* ------------------------------------------------------------------ */

export const CALLBACK_PRIORITIES = ["faible", "moyenne", "haute", "urgente"] as const;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const CALLBACK_PHONE = /^\+?[\d .()-]{8,30}$/;

/** Un appel à refaire : commerce, quand, et ce qu'il faut savoir avant de rappeler. */
export const callbackSchema = z.object({
  name: line(2, 120, "Indique le nom du commerce."),
  city: optionalLine(80),
  phone: optionalLine(30).refine((v) => v === null || (CALLBACK_PHONE.test(v) && v.replace(/\D/g, "").length >= 9), "Numéro de téléphone invalide."),
  contactName: optionalLine(80),
  dueOn: z.string().refine(isIsoDate, "Choisis le jour du rappel."),
  dueTime: z
    .string()
    .trim()
    .refine((v) => v === "" || TIME.test(v), "Heure invalide.")
    .transform((v) => (v === "" ? null : v)),
  priority: z.enum(CALLBACK_PRIORITIES, { error: "Choisis l'importance." }),
  note: optionalText(500),
});
export type CallbackInput = z.output<typeof callbackSchema>;

/* ------------------------------------------------------------------ */
/* Maquettes                                                           */
/* ------------------------------------------------------------------ */

export const mockupSchema = z.object({
  id: z
    .string()
    .max(64)
    .transform((value) => (value === "" ? null : value)),
  client: line(2, 120, "Indique le nom du commerce."),
  city: optionalLine(80),
  contact: optionalLine(160),
  status: z.enum(["en_cours", "terminee"], { error: "Choisis l'état." }),
  startedOn: z.string().refine(isIsoDate, "Indique la date de début."),
  doneOn: optionalDate,
  previewUrl: optionalLine(300).refine((value) => value === null || /^https?:\/\/\S+$/.test(value), "Le lien doit commencer par https://"),
  madeBy: z
    .string()
    .max(64)
    .transform((value) => (value === "" ? null : value)),
  note: optionalText(500),
});
