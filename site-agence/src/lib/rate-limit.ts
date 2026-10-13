/**
 * Limiteur de débit en mémoire (fenêtre glissante), par clé (ex. adresse IP).
 * Il freine les essais en série sur la connexion et l'inscription. Sur un
 * hébergement multi-instances, chaque instance a son propre compteur : c'est
 * un garde-fou, à compléter par le pare-feu de l'hébergeur si besoin.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return function isAllowed(key: string, now: number = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    hits.set(key, [...recent, now]);
    // Nettoyage occasionnel pour ne pas garder les clés inactives indéfiniment.
    if (hits.size > 5_000) {
      for (const [entryKey, times] of hits) {
        if (times.every((time) => now - time >= windowMs)) hits.delete(entryKey);
      }
    }
    return true;
  };
}
