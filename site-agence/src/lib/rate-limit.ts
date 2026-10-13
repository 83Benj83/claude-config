/**
 * Limiteur de débit en mémoire (fenêtre glissante), par clé (adresse IP,
 * identifiant…). Il freine les essais en série sur la connexion. Sur un
 * hébergement multi-instances, chaque instance a son propre compteur : c'est
 * un garde-fou, à compléter par le pare-feu de l'hébergeur si besoin.
 *
 * `isAllowed(clé)` compte un essai ; avec `{ peek: true }`, il vérifie
 * seulement que la limite n'est pas atteinte, sans rien compter.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return function isAllowed(key: string, now: number = Date.now(), { peek = false } = {}): boolean {
    const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    hits.set(key, peek ? recent : [...recent, now]);
    // Nettoyage occasionnel pour ne pas garder les clés inactives indéfiniment.
    if (hits.size > 5_000) {
      for (const [entryKey, times] of hits) {
        if (times.every((time) => now - time >= windowMs)) hits.delete(entryKey);
      }
    }
    return true;
  };
}
