"use server"

import type { ActionResult } from "@/lib/action-result"
import { requireAdmin, type SessionContext } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  cambiarEstadoUsuarioSchema,
  cambiarRolSchema,
  crearUsuarioSchema,
} from "@/lib/validations/usuarios"
import type { Rol } from "@/types/domain"

import { runAction } from "./run-action"

export type UsuarioFila = {
  id: string
  nombre: string
  email: string | null
  rol: Rol
  activo: boolean
  created_at: string
  last_sign_in_at: string | null
}

export type UsuarioCreado = { id: string; perfilConfigurado: boolean }

/**
 * Regla de negocio violada: se expone como SQLSTATE P0001 para que runAction
 * muestre el mensaje tal cual (ver lib/errors.ts).
 */
class ReglaNegocioError extends Error {
  readonly code = "P0001"
}

/** Cantidad de admins activos, excluyendo opcionalmente a un usuario. */
async function contarAdminsActivos(session: SessionContext, excluirId?: string): Promise<number> {
  let query = session.supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("rol", "admin")
    .eq("activo", true)
  if (excluirId) query = query.neq("id", excluirId)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

async function obtenerPerfil(session: SessionContext, userId: string) {
  const { data, error } = await session.supabase
    .from("profiles")
    .select("id, rol, activo")
    .eq("id", userId)
    .single()
  if (error) throw error
  return data
}

export async function listarUsuarios(): Promise<ActionResult<UsuarioFila[]>> {
  return runAction("usuarios.listar", async () => {
    const session = await requireAdmin()
    const { data: perfiles, error } = await session.supabase
      .from("profiles")
      .select("id, nombre, email, rol, activo, created_at")
      .order("created_at", { ascending: true })
    if (error) throw error

    // El último acceso vive en auth.users: se consulta con service role y se tolera su falla.
    const ultimoAcceso = new Map<string, string | null>()
    try {
      const { data, error: authError } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (authError) throw authError
      for (const user of data.users) ultimoAcceso.set(user.id, user.last_sign_in_at ?? null)
    } catch (authError) {
      logger.warn("usuarios.listar_auth_fallo", { error: authError })
    }

    return (perfiles ?? []).map((perfil) => ({
      ...perfil,
      last_sign_in_at: ultimoAcceso.get(perfil.id) ?? null,
    }))
  })
}

export async function crearUsuario(input: unknown): Promise<ActionResult<UsuarioCreado>> {
  return runAction("usuarios.crear", async () => {
    const data = crearUsuarioSchema.parse(input)
    await requireAdmin()
    const admin = createAdminClient()

    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nombre: data.nombre },
    })

    if (error || !created.user) {
      const yaExiste =
        error?.code === "email_exists" ||
        error?.code === "user_already_exists" ||
        error?.message?.toLowerCase().includes("already been registered")
      if (yaExiste) throw new ReglaNegocioError("Ya existe un usuario con ese email.")
      if (error?.code === "weak_password") {
        throw new ReglaNegocioError("La contraseña es demasiado débil. Usá al menos 8 caracteres combinando letras y números.")
      }
      logger.error("usuarios.crear_auth_fallo", { code: error?.code, status: error?.status })
      throw new ReglaNegocioError("No se pudo crear el usuario en Supabase Auth. Intentá nuevamente.")
    }

    // El trigger de alta crea el perfil como empleado inactivo: se configura rol, nombre y se habilita.
    const { data: perfil, error: perfilError } = await admin
      .from("profiles")
      .update({ rol: data.rol, activo: true, nombre: data.nombre })
      .eq("id", created.user.id)
      .select("id")
      .maybeSingle()

    if (perfilError || !perfil) {
      logger.error("usuarios.crear_perfil_fallo", { userId: created.user.id, error: perfilError?.message })
      return { id: created.user.id, perfilConfigurado: false }
    }

    return { id: created.user.id, perfilConfigurado: true }
  })
}

export async function cambiarRolUsuario(input: unknown): Promise<ActionResult> {
  return runAction("usuarios.cambiar_rol", async () => {
    const data = cambiarRolSchema.parse(input)
    const session = await requireAdmin()

    if (data.userId === session.userId && data.rol !== "admin") {
      throw new ReglaNegocioError("No podés quitarte a vos mismo el rol de administrador.")
    }

    const perfil = await obtenerPerfil(session, data.userId)
    if (perfil.rol === data.rol) return

    if (perfil.rol === "admin" && perfil.activo && (await contarAdminsActivos(session, data.userId)) === 0) {
      throw new ReglaNegocioError("Debe quedar al menos un administrador activo.")
    }

    const { error } = await session.supabase.from("profiles").update({ rol: data.rol }).eq("id", data.userId)
    if (error) throw error
  })
}

export async function cambiarEstadoUsuario(input: unknown): Promise<ActionResult> {
  return runAction("usuarios.cambiar_estado", async () => {
    const data = cambiarEstadoUsuarioSchema.parse(input)
    const session = await requireAdmin()

    if (data.userId === session.userId && !data.activo) {
      throw new ReglaNegocioError("No podés desactivar tu propio usuario.")
    }

    const perfil = await obtenerPerfil(session, data.userId)
    if (perfil.activo === data.activo) return

    if (!data.activo && perfil.rol === "admin" && (await contarAdminsActivos(session, data.userId)) === 0) {
      throw new ReglaNegocioError("Debe quedar al menos un administrador activo.")
    }

    const { error } = await session.supabase.from("profiles").update({ activo: data.activo }).eq("id", data.userId)
    if (error) throw error
  })
}
