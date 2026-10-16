# Enseignes déjà contactées : sources

Fichier produit : `deja-contactes.json` (298 enseignes, dédoublonnées par adresse mail).
Champs : name, city, channel, contact, date (YYYY-MM-DD), note. Les noms et villes sont sans accents (saisie ASCII) ; le « nom » est celui de l'objet du mail.

## Sources fouillées

1. **Gmail website.creator2k26@gmail.com** (source principale, tout est en `channel: email`)
   - Boîte « Envoyés » entière, pagination complète : mails « Un site internet pour X ? » (08/10 au 14/10/2026), mails d'avril et août 2026 (autre modèle), mails Yes Tea.
   - Fil « SUIVI PROSPECTION – liste commune » lu en entier : réservations EN COURS / ENVOYÉ / EXCLU des comptes 2 et 3. Les « EXCLU » ne sont pas des enseignes contactées (non incluses).
   - Boîte de réception et mails de rebond (mailer-daemon) : réponses et rebonds reportés dans `note`.
   - Libellés : Prospection/1 Envoyé (174 fils), 2 Relance 1 (19), Rebond (7), Suivi commun (1). Brouillons : aucun.
2. **Chat claude.ai « Prospection »** (858c74e7-f742-41f2-b6d2-727791249741, 46 tours) : sert à recouper et à nommer les envois d'avril/août sans objet (Kuje Café, Mellow Coffee Spot, Elmer Pigeon, Jean-Eudes Acciari, Au Bonheur du mal à Sedan). Aucune autre conversation claude.ai n'a donné de contact par téléphone, Instagram, visite ou formulaire.
3. **Google Drive / Sheets** : recherches par mots-clés (prospection, contact, enseigne, Toulon, commerce) et fichiers récents : aucun fichier de prospection ou de suivi (seul résultat sans rapport : « DOCUMENT E-COMMERCE YOMI DENZEL »).
4. **Dépôt /home/claude/claude-config** : aucune liste d'enseignes contactées. Seul `site-agence/data/leads-var-2026-10.json` (10 commerces) est une liste « À contacter » avec téléphones : à contacter, non contactés. `site-agence/preview/seed-data.ts`, `src/lib/data/demo-seed.ts` et `tests/e2e/fixtures/prospects.xlsx` sont des données de démo/test (Lyon, Marseille fictifs).

## Comptes

| Lot | Nb |
| --- | --- |
| Toulon | 129 |
| Marseille (14/10) | 93 |
| Hyères | 46 |
| La Seyne-sur-Mer | 11 |
| Six-Fours, Ollioules, Sanary, Saint-Mandrier | 3 + 3 + 2 + 1 |
| Ville non indiquée (avril/août) | 9 |
| Sedan | 1 |
| Total | 298 |

## Points à savoir

- **Rebonds (adresse introuvable) : 10.** Contactés mais jamais reçus : Dames des Halles, Chez Charlie (à refaire par Instagram, pas fait à ce jour), L'Atelier à Vins, Cave de Claret, La Salinoise, L'Abri-Côtier, Evanescence, Plathai, L'instant d'Oré, The Laboratoire.
- **Réponses reçues :** Yes Tea (positive, maquette envoyée), Le Ponpon (refus), Café de la Pointe (hésitants, ont des amis pour le site), Fromagerie Rigaou (fermée depuis oct. 2024, demande de retrait), Librairie du Port (réponse automatique, nouvelle adresse mail).
- **Relances J+5 envoyées le 13/10** aux envois du 08/10 (19 fils, noté dans `note`). Les relances des 14/10 et suivants n'apparaissent pas dans les fils lus (mais la lecture Gmail ne montre que les premiers messages de chaque fil).
- **Yes Tea :** premier contact non daté dans Gmail ; la date 2026-10-10 est celle du premier mail trouvé (maquette).
- Le fil de suivi mentionne aussi des commerces seulement « repérés » ou « sans mail » (jamais contactés) : non inclus.
- Aucune donnée inventée : les champs inconnus sont vides.
