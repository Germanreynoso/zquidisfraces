/**
 * Verifica el SQL completo sin Docker usando PGlite (Postgres compilado a WASM):
 *   stubs de Supabase → migraciones → seed → tests SQL (supabase/tests/*.sql).
 * Uso: pnpm verify:db
 */
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")
const sqlFiles = (dir: string) =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(dir, f))

async function run(db: PGlite, label: string, path: string) {
  const started = performance.now()
  try {
    await db.exec(read(path))
    console.log(`  ✔ ${label} ${path} (${Math.round(performance.now() - started)} ms)`)
  } catch (error) {
    console.error(`  ✘ ${label} ${path}`)
    throw error
  }
}

async function main() {
  const db = new PGlite({ extensions: { pg_trgm } })
  await db.exec("set timezone = 'UTC'")

  console.log("Supabase stubs")
  await run(db, "stubs", "scripts/db/supabase-stubs.sql")

  console.log("Migraciones")
  for (const file of sqlFiles("supabase/migrations")) await run(db, "migración", file)

  console.log("Seed")
  await run(db, "seed", "supabase/seed.sql")

  const counts = await db.query<{ tabla: string; filas: number }>(`
    select 'disfraces' as tabla, count(*)::int as filas from public.disfraces
    union all select 'clientes', count(*)::int from public.clientes
    union all select 'alquileres', count(*)::int from public.alquileres
    union all select 'reservas', count(*)::int from public.reservas
    union all select 'pagos', count(*)::int from public.pagos
    union all select 'devoluciones', count(*)::int from public.devoluciones
    union all select 'movimientos_stock', count(*)::int from public.movimientos_stock
    union all select 'alertas', count(*)::int from public.v_alertas
  `)
  console.table(counts.rows)

  console.log("Tests")
  for (const file of sqlFiles("supabase/tests")) await run(db, "test", file)

  await db.close()
  console.log("\nBase de datos verificada correctamente.")
}

main().catch((error: unknown) => {
  const e = error as { message?: string; detail?: string; hint?: string; where?: string; position?: string }
  console.error("\nFalló la verificación de la base de datos:")
  console.error(e.message ?? error)
  if (e.detail) console.error("detail:", e.detail)
  if (e.hint) console.error("hint:", e.hint)
  if (e.where) console.error("where:", e.where)
  if (e.position) console.error("position:", e.position)
  process.exit(1)
})
