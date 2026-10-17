-- =====================================================================
-- Rappels repris de l'ancien outil de suivi de Paul (capture du 17/10/2026),
-- recopiés tels quels : commerce, numéro, jour, heure et note.
-- Enregistrés au nom de Paul. Rejouable sans danger : un rappel déjà présent
-- (même nom, même numéro) est ignoré.
-- =====================================================================

insert into public.callbacks (name, city, phone, due_on, due_time, priority, note, added_by)
select v.name, v.city, v.phone, v.due_on::date, v.due_time, v.priority, v.note, m.id
from (values
  ('Commerce sans nom', null, '06 82 24 51 76', '2026-10-17', '07:00', 'moyenne', 'le 16 le matin'),
  ('Le france', null, '04 94 61 69 51', '2026-10-17', '11:00', 'moyenne', 'a appelé à 11h et demander le patron'),
  ('La Promenade SARL LE ROM''IKA', null, '02 54 07 05 78', '2026-10-17', '14:00', 'moyenne', 'le 16 avant 16h'),
  ('Boulangerie - Pâtisserie - Viennoiserie "Victor Hugo"', null, '03 80 57 22 95', '2026-10-17', '17:45', 'moyenne', 'le 16 entre 17h30 et 18h'),
  ('Artisan Boulanger "Le Fournil St Arigle"', null, '03 86 61 49 40', '2026-10-17', null, 'moyenne', 'A appeler "quand la patronne est la mais jsp quand elle est la"'),
  ('Boulangerie Massat', null, '05 61 65 10 52', '2026-10-19', '11:00', 'moyenne', null),
  ('CF coiffure', 'Six-Fours-les-Plages', '04 94 88 65 96', '2026-11-20', null, 'faible', 'A rappeler dans 1 mois, 1 mois et demi')
) as v (name, city, phone, due_on, due_time, priority, note)
join public.members m on m.login_key = 'paul'
where not exists (
  select 1 from public.callbacks c where lower(c.name) = lower(v.name) and c.phone is not distinct from v.phone
);
