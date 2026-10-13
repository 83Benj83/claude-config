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
  name: line(2, 120, "Indique le nom du restaurant."),
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
    kind: z.enum(["email", "template", "link"], { error: "Choisis un type." }),
    title: line(2, 100, "Donne un titre."),
    value: z.string().trim().min(1, "Ce champ est obligatoire.").max(5000, "5000 caractères maximum."),
    note: optionalText(300),
    sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .superRefine((resource, ctx) => {
    if (resource.kind === "email" && !z.email().safeParse(resource.value).success) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Adresse e-mail invalide." });
    }
    if (resource.kind === "link" && !/^https?:\/\/\S+$/.test(resource.value)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Le lien doit commencer par https://" });
    }
  });

export type ResourceFormInput = z.infer<typeof resourceSchema>;

/** Premier message d'erreur par champ, pour l'affichage sous les inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}
