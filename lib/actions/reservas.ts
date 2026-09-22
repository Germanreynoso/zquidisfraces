"use server"

import type { ActionResult } from "@/lib/action-result"
import { requireStaff } from "@/lib/auth"
import { estadoReservaSchema, reservaSchema } from "@/lib/validations/reservas"

import { runAction } from "./run-action"

/** Crea una reserva. La RPC valida disponibilidad por rango y bloquea los disfraces (sin sobre-reservas). */
export async function crearReserva(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("reservas.crear", async () => {
    const data = reservaSchema.parse(input)
    const { supabase } = await requireStaff()

    const { data: id, error } = await supabase.rpc("crear_reserva", {
      p_cliente_id: data.cliente_id,
      p_fecha_inicio: data.fecha_inicio,
      p_fecha_fin: data.fecha_fin,
      p_items: data.items.map((item) => ({ disfraz_id: item.disfraz_id, cantidad: item.cantidad })),
      p_estado: data.estado,
      ...(data.observaciones ? { p_observaciones: data.observaciones } : {}),
    })
    if (error) throw error
    return { id }
  })
}

/** Confirma o cancela una reserva vigente (las transiciones inválidas las rechaza la base). */
export async function actualizarEstadoReserva(input: unknown): Promise<ActionResult> {
  return runAction("reservas.actualizar_estado", async () => {
    const data = estadoReservaSchema.parse(input)
    const { supabase } = await requireStaff()

    const { error } = await supabase.rpc("actualizar_estado_reserva", {
      p_reserva_id: data.id,
      p_estado: data.estado,
    })
    if (error) throw error
  })
}
