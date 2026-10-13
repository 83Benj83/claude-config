import { z } from "zod";
import { addDays, isIsoDate } from "./dates";
import { EDITABLE_PAST_DAYS, MAX_DAILY_COUNT } from "./rules";
import type { IsoDate } from "./types";

/** Texte d'une ligne, sans caractères de contrôle (retours chariot, tabulations…). */
const NO_CONTROL_CHARS = /^[^\p{Cc}]*$/u;
const CONTROL_CHARS_MESSAGE = "Caractères non autorisés.";

export const entrySchema = z.object({
  date: z.string().refine(isIsoDate, "Date invalide."),
  count: z.coerce
    .number({ error: "Indique un nombre." })
    .int("Le nombre doit être entier.")
    .min(0, "Le nombre ne peut pas être négatif.")
    .max(MAX_DAILY_COUNT, `Maximum ${MAX_DAILY_COUNT} par jour.`),
});

export type EntryInput = z.infer<typeof entrySchema>;

/** Une saisie n'est acceptée que pour aujourd'hui et les jours récents. */
export function isEditableDate(date: IsoDate, today: IsoDate): boolean {
  return date <= today && date >= addDays(today, -EDITABLE_PAST_DAYS);
}

export const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide.").max(254),
  password: z.string().min(1, "Mot de passe requis.").max(128),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Indique ton prénom et ton nom.")
    .max(80, "80 caractères maximum.")
    .regex(NO_CONTROL_CHARS, CONTROL_CHARS_MESSAGE),
  email: z.email("Adresse e-mail invalide.").max(254),
  password: z
    .string()
    .min(10, "10 caractères minimum.")
    .max(128, "128 caractères maximum."),
  inviteCode: z.string().trim().min(1, "Code d'invitation requis.").max(128),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .regex(NO_CONTROL_CHARS, CONTROL_CHARS_MESSAGE)
    .transform((value) => (value === "" ? null : value));

export const memberUpdateSchema = z.object({
  id: z.string().min(1).max(64),
  fullName: z.string().trim().min(2, "Nom trop court.").max(80, "80 caractères maximum.").regex(NO_CONTROL_CHARS, CONTROL_CHARS_MESSAGE),
  jobTitle: z.string().trim().min(2, "Poste trop court.").max(80, "80 caractères maximum.").regex(NO_CONTROL_CHARS, CONTROL_CHARS_MESSAGE),
  department: optionalText(60),
  managerId: z
    .string()
    .max(64)
    .transform((value) => (value === "" ? null : value)),
  avatarUrl: optionalText(500).refine(
    (value) => value === null || /^https:\/\//.test(value),
    "L'URL de la photo doit commencer par https://",
  ),
  isProspector: z.boolean(),
  isAdmin: z.boolean(),
});

export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;

/** Premier message d'erreur par champ, pour l'affichage sous les inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}
