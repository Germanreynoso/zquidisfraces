"use server"

import { z } from "zod"

import type { ActionResult } from "@/lib/action-result"
import { requireAdmin, requireStaff } from "@/lib/auth"
import { clienteSchema, normalizarDni, type ClienteInput } from "@/lib/validations/clientes"

import { runAction } from "./run-action"

const idSchema = z.uuid({ message: "Identificador inválido" })

export type ClienteCreado = { id: string; nombre: string; apellido: string; dni: string }

function toRow(data: ClienteInput) {
  const nullIfEmpty = (value: string) => (value.length > 0 ? value : null)
  return {
    nombre: data.nombre,
    apellido: data.apellido,
    dni: normalizarDni(data.dni),
    telefono: nullIfEmpty(data.telefono),
    email: nullIfEmpty(data.email.toLowerCase()),
    direccion: nullIfEmpty(data.direccion),
    notas: nullIfEmpty(data.notas),
  }
}

export async function crearCliente(input: unknown): Promise<ActionResult<ClienteCreado>> {
  return runAction("clientes.crear", async () => {
    const data = clienteSchema.parse(input)
    const { supabase } = await requireStaff()
    const { data: row, error } = await supabase
      .from("clientes")
      .insert(toRow(data))
      .select("id, nombre, apellido, dni")
      .single()
    if (error) throw error
    return row
  })
}

export async function actualizarCliente(id: string, input: unknown): Promise<ActionResult<ClienteCreado>> {
  return runAction("clientes.actualizar", async () => {
    const clienteId = idSchema.parse(id)
    const data = clienteSchema.parse(input)
    const { supabase } = await requireStaff()
    const { data: row, error } = await supabase
      .from("clientes")
      .update(toRow(data))
      .eq("id", clienteId)
      .select("id, nombre, apellido, dni")
      .single()
    if (error) throw error
    return row
  })
}

/** Baja lógica: conserva el historial de alquileres. */
export async function cambiarEstadoCliente(id: string, activo: boolean): Promise<ActionResult> {
  return runAction("clientes.cambiar_estado", async () => {
    const clienteId = idSchema.parse(id)
    const { supabase } = await requireAdmin()
    const { error } = await supabase.from("clientes").update({ activo }).eq("id", clienteId)
    if (error) throw error
  })
}
