/**
 * Genera types/database.types.ts a partir de las migraciones, sin Docker, introspectando PGlite.
 * El formato replica el de `supabase gen types typescript`, así puede reemplazarse por el oficial:
 *   npx supabase gen types typescript --project-id <id> --schema public > types/database.types.ts
 * Uso: pnpm gen:types
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm"

type PgType = { oid: number; typname: string; typtype: string; typelem: number; nspname: string }
type Column = {
  relname: string
  relkind: string
  attname: string
  atttypid: number
  attnotnull: boolean
  atthasdef: boolean
  attgenerated: string
  attidentity: string
}
type ForeignKey = {
  conname: string
  relname: string
  columns: string[]
  refrelname: string
  refcolumns: string[]
  is_one_to_one: boolean
}
type Fn = {
  proname: string
  pronargs: number
  pronargdefaults: number
  proretset: boolean
  prorettype: number
  alltypes: number[]
  argmodes: string[] | null
  argnames: string[] | null
}

const root = process.cwd()
const OUTPUT = join(root, "types", "database.types.ts")

function tsScalar(t: PgType, types: Map<number, PgType>): string {
  if (t.typtype === "e") return `Database["public"]["Enums"]["${t.typname}"]`
  if (t.typname.startsWith("_") && t.typelem) {
    const elem = types.get(t.typelem)
    return elem ? `${tsScalar(elem, types)}[]` : "unknown[]"
  }
  switch (t.typname) {
    case "bool":
      return "boolean"
    case "int2":
    case "int4":
    case "int8":
    case "float4":
    case "float8":
    case "numeric":
      return "number"
    case "json":
    case "jsonb":
      return "Json"
    case "void":
      return "undefined"
    case "uuid":
    case "text":
    case "varchar":
    case "bpchar":
    case "date":
    case "time":
    case "timetz":
    case "timestamp":
    case "timestamptz":
    case "interval":
      return "string"
    default:
      return "unknown"
  }
}

const indent = (n: number) => "  ".repeat(n)

async function main() {
  const db = new PGlite({ extensions: { pg_trgm } })
  await db.exec(readFileSync(join(root, "scripts/db/supabase-stubs.sql"), "utf8"))
  for (const f of readdirSync(join(root, "supabase/migrations")).filter((x) => x.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(root, "supabase/migrations", f), "utf8"))
  }

  const types = new Map<number, PgType>()
  for (const t of (
    await db.query<PgType>(
      `select t.oid::int as oid, t.typname, t.typtype, t.typelem::int as typelem, n.nspname
         from pg_type t join pg_namespace n on n.oid = t.typnamespace`
    )
  ).rows) {
    types.set(t.oid, t)
  }

  const enums = (
    await db.query<{ typname: string; labels: string[] }>(
      `select t.typname, array_agg(e.enumlabel order by e.enumsortorder) as labels
         from pg_type t
         join pg_enum e on e.enumtypid = t.oid
         join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
        group by t.typname
        order by t.typname`
    )
  ).rows

  const columns = (
    await db.query<Column>(
      `select c.relname, c.relkind::text as relkind, a.attname, a.atttypid::int as atttypid, a.attnotnull,
              a.atthasdef, a.attgenerated::text as attgenerated, a.attidentity::text as attidentity
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         join pg_attribute a on a.attrelid = c.oid
        where n.nspname = 'public' and c.relkind in ('r', 'v') and a.attnum > 0 and not a.attisdropped
        order by c.relname, a.attname`
    )
  ).rows

  const fks = (
    await db.query<ForeignKey>(
      `select con.conname, c.relname,
              array(select a.attname from unnest(con.conkey) k join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k) as columns,
              fc.relname as refrelname,
              array(select a.attname from unnest(con.confkey) k join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k) as refcolumns,
              exists (
                select 1 from pg_index i
                 where i.indrelid = con.conrelid and i.indisunique and i.indpred is null
                   and (i.indkey::int2[])::int2[] @> con.conkey and array_length(i.indkey::int2[], 1) = array_length(con.conkey, 1)
              ) as is_one_to_one
         from pg_constraint con
         join pg_class c on c.oid = con.conrelid
         join pg_namespace n on n.oid = c.relnamespace
         join pg_class fc on fc.oid = con.confrelid
         join pg_namespace fn on fn.oid = fc.relnamespace
        where con.contype = 'f' and n.nspname = 'public' and fn.nspname = 'public'
        order by c.relname, con.conname`
    )
  ).rows

  const fns = (
    await db.query<Fn>(
      `select p.proname, p.pronargs, p.pronargdefaults, p.proretset, p.prorettype::int as prorettype,
              coalesce(p.proallargtypes::int[], p.proargtypes::int[]) as alltypes,
              p.proargmodes::text[] as argmodes, p.proargnames as argnames
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         join pg_type rt on rt.oid = p.prorettype
        where n.nspname = 'public' and rt.typname <> 'trigger' and p.prokind = 'f'
        order by p.proname`
    )
  ).rows

  await db.close()

  const relations = new Map<string, { kind: string; cols: Column[] }>()
  for (const c of columns) {
    const rel = relations.get(c.relname) ?? { kind: c.relkind, cols: [] }
    rel.cols.push(c)
    relations.set(c.relname, rel)
  }

  const typeOf = (oid: number) => {
    const t = types.get(oid)
    return t ? tsScalar(t, types) : "unknown"
  }

  const relationshipsOf = (relname: string, level: number) => {
    const list = fks.filter((f) => f.relname === relname)
    if (!list.length) return "[]"
    const items = list.map(
      (f) =>
        `${indent(level + 1)}{\n` +
        `${indent(level + 2)}foreignKeyName: "${f.conname}"\n` +
        `${indent(level + 2)}columns: [${f.columns.map((c) => `"${c}"`).join(", ")}]\n` +
        `${indent(level + 2)}isOneToOne: ${f.is_one_to_one}\n` +
        `${indent(level + 2)}referencedRelation: "${f.refrelname}"\n` +
        `${indent(level + 2)}referencedColumns: [${f.refcolumns.map((c) => `"${c}"`).join(", ")}]\n` +
        `${indent(level + 1)}},`
    )
    return `[\n${items.join("\n")}\n${indent(level)}]`
  }

  const out: string[] = []
  out.push(
    "// Archivo generado por scripts/gen-types.ts a partir de supabase/migrations. NO editar a mano.",
    "// Equivalente a `supabase gen types typescript --schema public`.",
    "",
    "export type Json =",
    "  | string",
    "  | number",
    "  | boolean",
    "  | null",
    "  | { [key: string]: Json | undefined }",
    "  | Json[]",
    "",
    "export type Database = {",
    "  // Permite instanciar createClient con las opciones correctas",
    "  __InternalSupabase: {",
    '    PostgrestVersion: "12.2.3 (519615d)"',
    "  }",
    "  public: {",
    "    Tables: {"
  )

  for (const [name, rel] of [...relations].filter(([, r]) => r.kind === "r")) {
    out.push(`${indent(3)}${name}: {`)
    out.push(`${indent(4)}Row: {`)
    for (const c of rel.cols) {
      out.push(`${indent(5)}${c.attname}: ${typeOf(c.atttypid)}${c.attnotnull ? "" : " | null"}`)
    }
    out.push(`${indent(4)}}`)
    out.push(`${indent(4)}Insert: {`)
    for (const c of rel.cols) {
      if (c.attgenerated === "s") {
        out.push(`${indent(5)}${c.attname}?: never`)
        continue
      }
      const optional = !c.attnotnull || c.atthasdef || c.attidentity !== ""
      out.push(`${indent(5)}${c.attname}${optional ? "?" : ""}: ${typeOf(c.atttypid)}${c.attnotnull ? "" : " | null"}`)
    }
    out.push(`${indent(4)}}`)
    out.push(`${indent(4)}Update: {`)
    for (const c of rel.cols) {
      if (c.attgenerated === "s") {
        out.push(`${indent(5)}${c.attname}?: never`)
        continue
      }
      out.push(`${indent(5)}${c.attname}?: ${typeOf(c.atttypid)}${c.attnotnull ? "" : " | null"}`)
    }
    out.push(`${indent(4)}}`)
    out.push(`${indent(4)}Relationships: ${relationshipsOf(name, 4)}`)
    out.push(`${indent(3)}}`)
  }
  out.push(`${indent(2)}}`, `${indent(2)}Views: {`)

  for (const [name, rel] of [...relations].filter(([, r]) => r.kind === "v")) {
    out.push(`${indent(3)}${name}: {`)
    out.push(`${indent(4)}Row: {`)
    // Postgres no conoce la nulabilidad de columnas de vistas: el generador oficial las marca todas como null.
    for (const c of rel.cols) out.push(`${indent(5)}${c.attname}: ${typeOf(c.atttypid)} | null`)
    out.push(`${indent(4)}}`)
    out.push(`${indent(4)}Relationships: []`)
    out.push(`${indent(3)}}`)
  }
  out.push(`${indent(2)}}`, `${indent(2)}Functions: {`)

  for (const fn of fns) {
    const modes = fn.argmodes ?? fn.alltypes.map(() => "i")
    const names = fn.argnames ?? []
    const inputs: { name: string; type: string; optional: boolean }[] = []
    const tableCols: { name: string; type: string }[] = []
    const inputIdx = modes.map((m, i) => (m === "i" || m === "b" ? i : -1)).filter((i) => i >= 0)
    const firstDefault = inputIdx.length - fn.pronargdefaults
    inputIdx.forEach((argIndex, position) => {
      inputs.push({
        name: names[argIndex] ?? `arg${position}`,
        type: typeOf(fn.alltypes[argIndex]),
        optional: position >= firstDefault,
      })
    })
    modes.forEach((m, i) => {
      if (m === "t" || m === "o") tableCols.push({ name: names[i] ?? `col${i}`, type: typeOf(fn.alltypes[i]) })
    })

    out.push(`${indent(3)}${fn.proname}: {`)
    if (inputs.length === 0) {
      out.push(`${indent(4)}Args: never`)
    } else {
      out.push(`${indent(4)}Args: {`)
      for (const a of inputs) out.push(`${indent(5)}${a.name}${a.optional ? "?" : ""}: ${a.type}`)
      out.push(`${indent(4)}}`)
    }
    if (tableCols.length) {
      out.push(`${indent(4)}Returns: {`)
      for (const c of tableCols) out.push(`${indent(5)}${c.name}: ${c.type}`)
      out.push(`${indent(4)}}${fn.proretset ? "[]" : ""}`)
    } else {
      out.push(`${indent(4)}Returns: ${typeOf(fn.prorettype)}${fn.proretset ? "[]" : ""}`)
    }
    out.push(`${indent(3)}}`)
  }
  out.push(`${indent(2)}}`, `${indent(2)}Enums: {`)
  for (const e of enums) {
    out.push(`${indent(3)}${e.typname}:`)
    for (const l of e.labels) out.push(`${indent(4)}| "${l}"`)
  }
  out.push(`${indent(2)}}`, `${indent(2)}CompositeTypes: {`, `${indent(3)}[_ in never]: never`, `${indent(2)}}`, "  }", "}")

  out.push(`
type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
${enums.map((e) => `      ${e.typname}: [${e.labels.map((l) => `"${l}"`).join(", ")}],`).join("\n")}
    },
  },
} as const
`)

  writeFileSync(OUTPUT, out.join("\n"), "utf8")
  console.log(`✔ Tipos generados en ${OUTPUT}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
