"use server"

import type { ActionResult } from "@/lib/action-result"
import { requireAdmin, requireStaff } from "@/lib/auth"
import { cancelarAlquilerSchema, crearAlquilerSchema, pagoSchema } from "@/lib/validations/alquileres"

import { runAction } from "./run-action"

/** Registra un alquiler: valida stock y reservas, mueve stock y registra la seña (todo en la base). */
export async function crearAlquiler(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("alquileres.crear", async () => {
    const data = crearAlquilerSchema.parse(input)
    const { supabase } = await requireStaff()

    const { data: id, error } = await supabase.rpc("crear_alquiler", {
      p_cliente_id: data.cliente_id,
      p_fecha_devolucion: data.fecha_devolucion,
      p_items: data.items.map(({ disfraz_id, cantidad }) => ({ disfraz_id, cantidad })),
      p_sena: data.sena,
      p_metodo_pago: data.metodo_pago,
      p_fecha_alquiler: data.fecha_alquiler,
      ...(data.observaciones ? { p_observaciones: data.observaciones } : {}),
      ...(data.reserva_id ? { p_reserva_id: data.reserva_id } : {}),
    })
    if (error) throw error
    return { id }
  })
}

/** Cancela un alquiler activo y devuelve las unidades al stock (solo admin). */
export async function cancelarAlquiler(input: unknown): Promise<ActionResult> {
  return runAction("alquileres.cancelar", async () => {
    const data = cancelarAlquilerSchema.parse(input)
    const { supabase } = await requireAdmin()
    const { error } = await supabase.rpc("cancelar_alquiler", {
      p_alquiler_id: data.alquiler_id,
      ...(data.motivo ? { p_motivo: data.motivo } : {}),
    })
    if (error) throw error
  })
}

/** Registra un pago (saldo o cargo extra); la base impide pagar más que el saldo pendiente. */
export async function registrarPago(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("alquileres.registrar_pago", async () => {
    const data = pagoSchema.parse(input)
    const { supabase } = await requireStaff()
    const { data: id, error } = await supabase.rpc("registrar_pago", {
      p_alquiler_id: data.alquiler_id,
      p_monto: data.monto,
      p_metodo: data.metodo,
      p_tipo: data.tipo,
      p_fecha: data.fecha,
      ...(data.observaciones ? { p_observaciones: data.observaciones } : {}),
    })
    if (error) throw error
    return { id }
  })
}
