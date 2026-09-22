import { z } from "zod"

/**
 * Variables de entorno validadas de forma perezosa: se leen en tiempo de request,
 * así `next build` no falla si faltan y el error es explícito cuando se usan.
 * Las NEXT_PUBLIC_* deben referenciarse literalmente para que Next las incluya en el bundle.
 */
const publicSchema = z.object({
  url: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida" }),
  anonKey: z.string().min(1, { message: "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY)" }),
})

export type PublicEnv = z.infer<typeof publicSchema>

let cachedPublic: PublicEnv | undefined

export function getPublicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic
  const parsed = publicSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    // Acepta la clave nueva ("publishable", sb_publishable_…) o la legacy ("anon", JWT).
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
  if (!parsed.success) {
    throw new Error(
      `Configuración de Supabase inválida: ${parsed.error.issues.map((i) => i.message).join("; ")}. ` +
        "Copiá .env.example a .env.local y completá los valores."
    )
  }
  cachedPublic = parsed.data
  return cachedPublic
}

export type GroqConfig = { apiKey: string; model: string }

/** Configuración del asistente (Groq). Solo servidor. */
export function getGroqConfig(): GroqConfig {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error("Falta GROQ_API_KEY (solo servidor). El asistente necesita una clave de Groq en .env.local.")
  }
  return { apiKey, model: process.env.GROQ_MODEL || "openai/gpt-oss-120b" }
}

export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY (solo servidor). Revisá .env.local.")
  }
  return key
}
