"use server"

import { redirect } from "next/navigation"

import type { ActionResult } from "@/lib/action-result"
import { logger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/server"
import { loginSchema, safeNextPath, type LoginInput } from "@/lib/validations/auth"

/**
 * Inicia sesión con email y contraseña. En caso de éxito redirige (no devuelve).
 * Los mensajes no revelan si el email existe.
 */
export async function signIn(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Revisá el email y la contraseña." }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    logger.warn("auth.sign_in_failed", { code: error.code, status: error.status })
    if (error.status === 429 || error.code === "over_request_rate_limit") {
      return { ok: false, error: "Demasiados intentos. Esperá unos minutos y volvé a probar." }
    }
    if (error.code === "email_not_confirmed") {
      return { ok: false, error: "El email todavía no fue confirmado." }
    }
    return { ok: false, error: "Email o contraseña incorrectos." }
  }

  logger.info("auth.sign_in")
  redirect(safeNextPath(parsed.data.next))
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
