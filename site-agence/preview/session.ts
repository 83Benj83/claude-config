/**
 * Session de l'aperçu : quel identifiant est connecté sur cet appareil.
 * Gardée dans le navigateur (localStorage si disponible, sinon en mémoire) ;
 * elle expire si le mot de passe change ou si l'identifiant est désactivé.
 */
export type PreviewSession = {
  read(): { memberId: string; version: number } | null;
  open(memberId: string, version: number): void;
  close(): void;
};

const KEY = "apercu-session";

export function createPreviewSession(): PreviewSession {
  let memory: { memberId: string; version: number } | null = null;
  return {
    read() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const value = JSON.parse(raw) as unknown;
          if (value && typeof value === "object" && typeof (value as { memberId?: unknown }).memberId === "string" && typeof (value as { version?: unknown }).version === "number") {
            return value as { memberId: string; version: number };
          }
        }
      } catch {
        // Stockage indisponible (navigation privée, aperçu) : session en mémoire.
      }
      return memory;
    },
    open(memberId, version) {
      memory = { memberId, version };
      try {
        localStorage.setItem(KEY, JSON.stringify(memory));
      } catch {
        // Session en mémoire uniquement.
      }
    },
    close() {
      memory = null;
      try {
        localStorage.removeItem(KEY);
      } catch {
        // Rien à effacer.
      }
    },
  };
}
