/**
 * Fichiers acceptés dans l'échange. Le type est déduit de l'extension (liste
 * fermée), puis vérifié sur les premiers octets du fichier : un fichier
 * renommé ne passe pas, et chaque fichier est servi sous un type connu.
 */
import type { AttachmentKind } from "./types";

type FileType = {
  extensions: readonly string[];
  type: string;
  kind: AttachmentKind;
  signature: Signature;
};
type Signature = "jpeg" | "png" | "gif" | "webp" | "pdf" | "zip" | "text";

const OFFICE = "application/vnd.openxmlformats-officedocument";

export const FILE_TYPES: readonly FileType[] = [
  {
    extensions: ["jpg", "jpeg"],
    type: "image/jpeg",
    kind: "image",
    signature: "jpeg",
  },
  { extensions: ["png"], type: "image/png", kind: "image", signature: "png" },
  {
    extensions: ["webp"],
    type: "image/webp",
    kind: "image",
    signature: "webp",
  },
  { extensions: ["gif"], type: "image/gif", kind: "image", signature: "gif" },
  {
    extensions: ["pdf"],
    type: "application/pdf",
    kind: "file",
    signature: "pdf",
  },
  {
    extensions: ["docx"],
    type: `${OFFICE}.wordprocessingml.document`,
    kind: "file",
    signature: "zip",
  },
  {
    extensions: ["xlsx"],
    type: `${OFFICE}.spreadsheetml.sheet`,
    kind: "file",
    signature: "zip",
  },
  {
    extensions: ["pptx"],
    type: `${OFFICE}.presentationml.presentation`,
    kind: "file",
    signature: "zip",
  },
  { extensions: ["txt"], type: "text/plain", kind: "file", signature: "text" },
  { extensions: ["csv"], type: "text/csv", kind: "file", signature: "text" },
];

/** Valeur de l'attribut `accept` du sélecteur de fichiers. */
export const FILE_ACCEPT = FILE_TYPES.flatMap((fileType) => fileType.extensions.map((extension) => `.${extension}`)).join(",");

/** Ce que l'échange accepte, en clair. */
export const ACCEPTED_FILES_LABEL = "photos, PDF, Word, Excel, PowerPoint, texte";

const extensionOf = (name: string) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";

export function fileTypeOf(name: string): FileType | null {
  const extension = extensionOf(name);
  return FILE_TYPES.find((fileType) => fileType.extensions.includes(extension)) ?? null;
}

const startsWith = (bytes: Uint8Array, prefix: readonly number[], offset = 0) => prefix.every((byte, index) => bytes[offset + index] === byte);
const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

/** Les premiers octets correspondent-ils au type annoncé ? (`head` : au moins 16 octets du début.) */
export function matchesSignature(fileType: FileType, head: Uint8Array): boolean {
  switch (fileType.signature) {
    case "jpeg":
      return startsWith(head, [0xff, 0xd8, 0xff]);
    case "png":
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "gif":
      return startsWith(head, ascii("GIF87a")) || startsWith(head, ascii("GIF89a"));
    case "webp":
      return startsWith(head, ascii("RIFF")) && startsWith(head, ascii("WEBP"), 8);
    case "pdf":
      return startsWith(head, ascii("%PDF-"));
    case "zip":
      return startsWith(head, [0x50, 0x4b, 0x03, 0x04]);
    case "text":
      // Texte : pas d'octet nul ni de balise HTML en tête.
      return !head.includes(0) && !/^\s*</.test(new TextDecoder().decode(head));
  }
}

/** Nom affiché : sans chemin ni caractères de contrôle, 120 caractères au plus (extension gardée). */
export function cleanFileName(name: string): string {
  const base = (name.split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Découpe par caractères (et non par unités UTF-16) : un emoji n'est jamais coupé en deux.
  const characters = Array.from(base);
  if (characters.length <= 120) return base || "fichier";
  const extension = extensionOf(base);
  return `${characters.slice(0, 115 - extension.length).join("").trimEnd()}….${extension}`;
}

/** Poids lisible : « 820 Ko », « 1,4 Mo ». */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}
