import type { Channel } from "./types";

/** Moyens de contact proposés lors de l'ajout d'un prospect, dans l'ordre d'affichage. */
export const CHANNELS: { value: Channel; label: string; contactHint: string }[] = [
  { value: "telephone", label: "Téléphone", contactHint: "06 12 34 56 78" },
  { value: "email", label: "E-mail", contactHint: "contact@restaurant.fr" },
  { value: "instagram", label: "Instagram", contactHint: "@lerestaurant" },
  { value: "facebook", label: "Facebook", contactHint: "Nom de la page" },
  { value: "linkedin", label: "LinkedIn", contactHint: "Nom du gérant" },
  { value: "visite", label: "Sur place", contactHint: "Personne rencontrée" },
  { value: "formulaire", label: "Formulaire", contactHint: "Adresse du site" },
  { value: "autre", label: "Autre", contactHint: "Précise le moyen" },
];

const LABELS = new Map(CHANNELS.map((channel) => [channel.value, channel.label]));

export function isChannel(value: unknown): value is Channel {
  return typeof value === "string" && LABELS.has(value as Channel);
}

export function channelLabel(channel: Channel): string {
  return LABELS.get(channel) ?? "Autre";
}
