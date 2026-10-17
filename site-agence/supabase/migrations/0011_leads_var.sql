-- =====================================================================
-- Liste « À contacter » : 10 commerces du Var sans site web (octobre 2026)
-- Généré par `npm run leads:seed-sql` à partir du fichier de données : ne pas modifier à la main.
-- Ajoutés une seule fois, au jour de la mise en ligne ; un commerce déjà présent
-- (même nom, même ville) est ignoré.
-- =====================================================================

insert into public.leads (name, city, category, phone, email, instagram, facebook, note, address, tips, list_day)
select v.name, v.city, v.category, v.phone, v.email, v.instagram, v.facebook, v.note, v.address, v.tips, (now() at time zone 'Europe/Paris')::date
from (values
  ('Le Salon', 'Toulon', 'Coiffure', '06 07 91 44 97', null, null, null, 'Coiffure, 15 bd Bazeilles. Source: pagesjaunes.fr/pros/60760848. Aucun site web listé sur la fiche PJ, mobile (appeler en journée). Salon indépendant.', null, array[]::text[]),
  ('83 Barber Shop', 'Toulon', 'Coiffure', '04 22 44 58 75', null, null, null, 'Barbier, 33 av 1er Bataillon de Choc. Source: pagesjaunes.fr/pros/60944549. Aucun site web listé sur la fiche PJ, fixe. Cible idéale (prise de RDV en ligne).', null, array[]::text[]),
  ('Barber Majestic', 'Toulon', 'Coiffure', '04 23 10 03 50', null, null, null, 'Barber shop, 19 rue Jean Jaurès. Source: pagesjaunes.fr/pros/63419987 (tél +33423100350). Aucun site web listé sur la fiche PJ.', null, array[]::text[]),
  ('Le Fleuriste (Donovan Rousseau)', 'Hyères', 'Fleuriste', '09 83 58 74 46', null, null, null, '13 av Paul Bourget. Source: pagesjaunes.fr/pros/62530360 (mis à jour oct. 2026). Seulement Instagram/Facebook, 4,8/5 Google (89 avis). Potentiel commande/livraison en ligne.', null, array[]::text[]),
  ('Meca Passion Performance', 'La Seyne-sur-Mer', 'Auto / garage', '04 83 42 51 11', null, null, null, 'Garage mécanique/tuning, 361 av Henri Guillaume. Source: pagesjaunes.fr/pros/61749436. Aucun site web listé sur la fiche PJ.', null, array[]::text[]),
  ('Garage de la Colle d''Artaud', 'La Seyne-sur-Mer', 'Auto / garage', '04 94 94 12 83', null, null, null, 'Réparation, carrosserie, occasion, 426 rte Gendarmes d''Ouvéa. Source: pagesjaunes.fr/pros/00273758. Seulement Facebook/YouTube, pas de site: vitrine + stock occasion.', null, array[]::text[]),
  ('Carole Esthétique', 'Toulon', 'Beauté / bien-être', '04 94 06 47 99', null, null, null, 'Institut de beauté, 1 chemin Pont de Bois. Source: pagesjaunes.fr/pros/51593252. Aucun site web listé sur la fiche PJ. Besoin de RDV en ligne/vitrine.', null, array[]::text[]),
  ('N & B Estetic', 'Toulon', 'Beauté / bien-être', '07 71 06 46 66', null, null, null, 'Institut, 450 D chemin Bonnes Herbes. Source: pagesjaunes.fr/pros/57402849. Seulement une page Facebook, pas de site. Mobile.', null, array[]::text[]),
  ('Energie Gaz', 'La Seyne-sur-Mer', 'Artisan bâtiment (plomberie/chauffage)', '04 94 74 78 52', null, null, null, 'Plombier-chauffagiste, 460 av Marcel Paul. Source: 118000.fr/e_C0058585232. Site non vérifié (non cité sur la fiche): à confirmer en appel/Google avant pitch.', null, array[]::text[]),
  ('Leajade', 'La Garde', 'Restauration', '09 53 11 27 84', null, null, null, 'Restauration rapide, 43 impasse Louis Blériot. Source: pagesjaunes.fr/pros/54075118. Aucun site listé sur la fiche PJ; pas confirmé s''il s''agit d''une enseigne unique ou multi-sites.', null, array[]::text[])
) as v (name, city, category, phone, email, instagram, facebook, note, address, tips)
where not exists (
  select 1 from public.leads l where lower(l.name) = lower(v.name) and lower(l.city) = lower(v.city)
);
