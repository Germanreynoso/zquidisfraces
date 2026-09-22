import "server-only"

import { createClient } from "@supabase/supabase-js"

import { getPublicEnv, getServiceRoleKey } from "@/lib/env"
import type { Database } from "@/types/database.types"

/**
 * Cliente con service role: SALTEA RLS. Usar solo en el servidor, para tareas administrativas
 * (gestión de usuarios de Auth) y siempre después de verificar que quien llama es admin.
 */
export function createAdminClient() {
  const { url } = getPublicEnv()
  return createClient<Database>(url, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
