/**
 * Échange : salons, réactions et mise en forme du texte. Fonctions pures,
 * communes au site et à l'aperçu.
 */

export const CHAT_CHANNELS = [
  { id: "general", label: "Général", description: "Tout ce qui concerne l'équipe", adminOnly: false },
  { id: "prospection", label: "Prospection", description: "Retours du terrain, bons plans, réponses reçues", adminOnly: false },
  { id: "contrats", label: "Contrats & maquettes", description: "Avancement des sites et des maquettes", adminOnly: false },
  { id: "astuces", label: "Astuces", description: "Phrases qui marchent, objections, modèles", adminOnly: false },
  { id: "annonces", label: "Annonces", description: "Informations importantes (réservé aux admins)", adminOnly: true },
] as const;

export type ChatChannelId = (typeof CHAT_CHANNELS)[number]["id"];

export const DEFAULT_CHANNEL: ChatChannelId = "general";

export const isChatChannel = (value: unknown): value is ChatChannelId => CHAT_CHANNELS.some((channel) => channel.id === value);

/** Réactions proposées (peu nombreuses : un clic suffit). */
export const REACTIONS = ["👍", "✅", "🔥", "👀", "🎉"] as const;
export const isReaction = (value: unknown): value is (typeof REACTIONS)[number] => REACTIONS.some((reaction) => reaction === value);

export type TextPart = { kind: "text" | "link" | "mention"; value: string };

const TOKEN = /(https:\/\/[^\s<>"']+|@[\p{L}\d._-]{2,40})/gu;

/** Découpe un message : adresses cliquables (https seulement) et @mentions. Jamais de HTML. */
export function splitMessageText(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: "text", value: text.slice(last, index) });
    let value = match[0];
    let trailing = "";
    if (value.startsWith("http")) {
      const stripped = value.replace(/[.,;:!?)\]]+$/, "");
      trailing = value.slice(stripped.length);
      value = stripped;
    }
    parts.push({ kind: value.startsWith("@") ? "mention" : "link", value });
    if (trailing) parts.push({ kind: "text", value: trailing });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });
  return parts;
}
