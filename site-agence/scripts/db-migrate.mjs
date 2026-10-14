/**
 * Applique les migrations SQL de `supabase/migrations`, dans l'ordre, une seule
 * fois chacune (table `schema_migrations`). Lancé par Vercel avant chaque
 * construction de la version en ligne (`vercel.json`) ; ignoré pour les
 * versions d'essai, qui partagent la même base.
 *
 * Connexion : `POSTGRES_URL_NON_POOLING` (fournie par l'intégration Supabase),
 * certificat vérifié avec l'autorité de Supabase (`supabase/prod-ca-2021.crt`).
 *
 * En local : `node --env-file=<fichier> scripts/db-migrate.mjs`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { rootCertificates } from "node:tls";
import pg from "pg";

const root = join(import.meta.dirname, "..");
const migrationsDir = join(root, "supabase", "migrations");
/** Verrou partagé : deux constructions simultanées n'appliquent pas deux fois la même migration. */
const LOCK_ID = 7_310_241;

if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
  console.log(`Migrations ignorées (version ${process.env.VERCEL_ENV}).`);
  process.exit(0);
}

const connection = process.env.POSTGRES_URL_NON_POOLING;
if (!connection) {
  console.error("POSTGRES_URL_NON_POOLING manque : la base Supabase n'est pas reliée au projet.");
  process.exit(1);
}

// Pas de `connectionString` : son `sslmode` remplacerait la vérification du certificat ci-dessous.
const url = new URL(connection);
const client = new pg.Client({
  host: url.hostname,
  port: Number(url.port) || 5432,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1) || "postgres",
  ssl: {
    servername: url.hostname,
    ca: [...rootCertificates, readFileSync(join(root, "supabase", "prod-ca-2021.crt"), "utf8")],
  },
});

async function migrate() {
  await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
  await client.query("create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  await client.query("alter table public.schema_migrations enable row level security");
  await client.query("revoke all on public.schema_migrations from anon, authenticated");

  const { rows } = await client.query("select name from public.schema_migrations");
  const applied = new Set(rows.map((row) => row.name));
  const files = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    await client.query("begin");
    try {
      await client.query(readFileSync(join(migrationsDir, file), "utf8"));
      await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`Migration appliquée : ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw new Error(`${file} : ${error.message}`);
    }
  }
  console.log(`Base à jour (${files.length} migrations).`);
}

try {
  await client.connect();
  await migrate();
} catch (error) {
  console.error(`Migrations impossibles : ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
