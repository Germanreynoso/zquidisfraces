import { createBrowserClient } from "@supabase/ssr"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database.types"

export type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>

let client: BrowserSupabaseClient | undefined

/** Cliente para Client Components. Singleton: una sola instancia por pestaña. */
export function createClient(): BrowserSupabaseClient {
  if (client) return client
  const { url, anonKey } = getPublicEnv()
  client = createBrowserClient<Database>(url, anonKey)
  return client
}
