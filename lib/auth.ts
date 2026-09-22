import "server-only"

import { cache } from "react"

import { createClient, type ServerSupabaseClient } from "@/lib/supabase/server"
import type { Profile } from "@/types/domain"

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthorizationError"
  }
}

export type SessionContext = {
  supabase: ServerSupabaseClient
  userId: string
  email: string | null
  profile: Profile
}

/**
 * Sesión del request actual (memoizada por request con React.cache).
 * getClaims valida la firma del JWT; el perfil se lee con RLS (cada usuario ve el propio).
 */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) return null

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle()
  if (!profile) return null

  return {
    supabase,
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    profile,
  }
})

export async function requireStaff(): Promise<SessionContext> {
  const session = await getSession()
  if (!session) throw new AuthorizationError("Tu sesión expiró. Volvé a iniciar sesión.")
  if (!session.profile.activo) {
    throw new AuthorizationError("Tu usuario está inactivo. Pedile a un administrador que lo habilite.")
  }
  return session
}

export async function requireAdmin(): Promise<SessionContext> {
  const session = await requireStaff()
  if (session.profile.rol !== "admin") {
    throw new AuthorizationError("Solo un administrador puede realizar esta operación.")
  }
  return session
}
