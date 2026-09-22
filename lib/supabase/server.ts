import "server-only"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database.types"

export type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * Cliente para Server Components, Server Actions y Route Handlers.
 * Usa la sesión del usuario (cookies): todas las consultas pasan por RLS.
 * Crear uno por request; no reutilizar entre requests.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getPublicEnv()

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Llamado desde un Server Component (cookies de solo lectura): el middleware refresca la sesión.
        }
      },
    },
  })
}
