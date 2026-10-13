import "server-only";
import { requireAdmin, requireMember } from "../auth/session";
import { getRepository } from "../data";
import { todayIso } from "../dates";

/**
 * Contexte d'un écran : membre connecté (sinon redirection), repository et
 * date du jour à Paris. À appeler sous `<Suspense>` : tout est lu à la requête.
 */
export async function screenContext({ admin = false }: { admin?: boolean } = {}) {
  const me = admin ? await requireAdmin() : await requireMember();
  // getRepository attend la requête (connection()) : la date est donc celle du jour, pas du build.
  const repository = await getRepository();
  return { me, repository, today: todayIso() };
}
