import { getCurrentMember } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { readAttachment } from "@/lib/services/messages";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fichier de l'échange, servi seulement à un membre connecté. Les photos
 * s'affichent, le reste se télécharge ; rien n'est jamais interprété comme
 * une page (type fixé à l'envoi, `nosniff`, bac à sable).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member?.welcomedAt) return new Response("Connexion requise.", { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Fichier introuvable.", { status: 404 });

  const found = await readAttachment(await getRepository(), member, id);
  if (!found) return new Response("Fichier introuvable.", { status: 404 });
  const { file, bytes } = found;

  const asciiName =
    file.name
      .normalize("NFD")
      .replace(/[^\x20-\x7e]/g, "")
      .replace(/["\\]/g, "") || "fichier";
  const disposition = file.kind === "image" ? "inline" : "attachment";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      // Pas de copie durable : un message supprimé (ou une déconnexion) rend le fichier inaccessible.
      "Cache-Control": "private, no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
