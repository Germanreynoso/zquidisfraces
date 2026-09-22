"use server"

import { z } from "zod"

import type { ActionResult } from "@/lib/action-result"
import { requireAdmin } from "@/lib/auth"
import { STORAGE_BUCKET_DISFRACES } from "@/lib/constants"
import { logger } from "@/lib/logger"
import { storagePathFromPublicUrl } from "@/lib/storage"
import { ajusteStockSchema, disfrazBaseSchema, disfrazCreateSchema } from "@/lib/validations/disfraces"

import { runAction } from "./run-action"

const idSchema = z.uuid({ message: "Identificador inválido" })

const nullIfEmpty = (value: string) => (value.length > 0 ? value : null)

export async function crearDisfraz(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("disfraces.crear", async () => {
    const data = disfrazCreateSchema.parse(input)
    const { supabase } = await requireAdmin()

    const { data: row, error } = await supabase
      .from("disfraces")
      .insert({ ...data, descripcion: nullIfEmpty(data.descripcion) })
      .select("id")
      .single()
    if (error) throw error
    return { id: row.id }
  })
}

export async function actualizarDisfraz(id: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("disfraces.actualizar", async () => {
    const disfrazId = idSchema.parse(id)
    const data = disfrazBaseSchema.parse(input)
    const { supabase } = await requireAdmin()

    const { data: anterior, error: readError } = await supabase
      .from("disfraces")
      .select("imagen_url")
      .eq("id", disfrazId)
      .single()
    if (readError) throw readError

    const { error } = await supabase
      .from("disfraces")
      .update({ ...data, descripcion: nullIfEmpty(data.descripcion) })
      .eq("id", disfrazId)
    if (error) throw error

    // Limpieza best-effort de la imagen reemplazada (si era del bucket propio).
    const oldPath = storagePathFromPublicUrl(anterior.imagen_url)
    if (oldPath && anterior.imagen_url !== data.imagen_url) {
      const { error: removeError } = await supabase.storage.from(STORAGE_BUCKET_DISFRACES).remove([oldPath])
      if (removeError) logger.warn("disfraces.imagen_huerfana", { path: oldPath, error: removeError.message })
    }

    return { id: disfrazId }
  })
}

export async function eliminarDisfraz(id: string): Promise<ActionResult> {
  return runAction("disfraces.eliminar", async () => {
    const disfrazId = idSchema.parse(id)
    const { supabase } = await requireAdmin()
    const { error } = await supabase.rpc("eliminar_disfraz", { p_disfraz_id: disfrazId })
    if (error) throw error
  })
}

export async function ajustarStock(input: unknown): Promise<ActionResult> {
  return runAction("disfraces.ajustar_stock", async () => {
    const data = ajusteStockSchema.parse(input)
    const { supabase } = await requireAdmin()
    const { error } = await supabase.rpc("ajustar_stock", {
      p_disfraz_id: data.disfraz_id,
      p_tipo: data.tipo,
      p_cantidad: data.cantidad,
      p_motivo: data.motivo,
      p_origen: data.origen,
    })
    if (error) throw error
  })
}
