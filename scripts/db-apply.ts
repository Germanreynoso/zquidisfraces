/**
 * Aplica las migraciones pendientes (y opcionalmente el seed) a un Postgres de Supabase.
 *
 *   pnpm db:apply            → migraciones pendientes
 *   pnpm db:apply --seed     → migraciones pendientes + supabase/seed.sql (idempotente)
 *
 * Requiere SUPABASE_DB_URL en .env.local (botón "Connect" → Session pooler → URI).
 * Registra lo aplicado en supabase_migrations.schema_migrations, la misma tabla que usa la CLI de Supabase,
 * así después se puede seguir con `supabase db push` sin reaplicar nada.
 */
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config()

const ROOT = process.cwd()

function fail(message: string): never {
  console.error(`✘ ${message}`)
  process.exit(1)
}

async function main() {
  const url = process.env.SUPABASE_DB_URL
  if (!url) fail("Falta SUPABASE_DB_URL en .env.local (Supabase → Connect → Session pooler → URI).")
  if (url.includes("[YOUR-PASSWORD]")) fail("Reemplazá [YOUR-PASSWORD] en SUPABASE_DB_URL por la contraseña de la base.")

  const sql = postgres(url, { ssl: "require", max: 1, onnotice: (n) => console.log(`  · ${n.message}`), prepare: false })

  try {
    const [{ version }] = await sql`select current_setting('server_version') as version`
    console.log(`Conectado a Postgres ${version}`)

    await sql`create schema if not exists supabase_migrations`
    await sql`
      create table if not exists supabase_migrations.schema_migrations (
        version text primary key,
        statements text[],
        name text
      )
    `
    const applied = new Set(
      (await sql<{ version: string }[]>`select version from supabase_migrations.schema_migrations`).map((r) => r.version)
    )

    const files = readdirSync(join(ROOT, "supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort()

    for (const file of files) {
      const [version, ...rest] = file.replace(/\.sql$/, "").split("_")
      if (applied.has(version)) {
        console.log(`  = ${file} (ya aplicada)`)
        continue
      }
      const content = readFileSync(join(ROOT, "supabase/migrations", file), "utf8")
      await sql.begin(async (tx) => {
        await tx.unsafe(content)
        await tx`
          insert into supabase_migrations.schema_migrations (version, name, statements)
          values (${version}, ${rest.join("_")}, ${[content]})
        `
      })
      console.log(`  ✔ ${file}`)
    }

    if (process.argv.includes("--seed")) {
      await sql.unsafe(readFileSync(join(ROOT, "supabase/seed.sql"), "utf8"))
      console.log("  ✔ supabase/seed.sql")
    }

    console.log("✔ Base de datos al día.")
  } finally {
    await sql.end()
  }
}

main().catch((error: unknown) => {
  const e = error as { message?: string; detail?: string; hint?: string; where?: string }
  console.error(`✘ ${e.message ?? String(error)}`)
  if (e.detail) console.error(`  detail: ${e.detail}`)
  if (e.hint) console.error(`  hint: ${e.hint}`)
  if (e.where) console.error(`  where: ${e.where}`)
  process.exit(1)
})
