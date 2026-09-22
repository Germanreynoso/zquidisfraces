"use server"

import type { ActionResult } from "@/lib/action-result"
import { requireStaff } from "@/lib/auth"
import { devolucionSchema } from "@/lib/validations/devoluciones"

import { runAction } from "./run-action"

/**
 * Registra la devolución: por item, OK vuelve a disponible, dañadas a mantenimiento y faltantes a extraviadas.
 * Marca el alquiler como devuelto, suma los cargos y, si corresponde, registra el cobro.
 */
export async function registrarDevolucion(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction("devoluciones.registrar", async () => {
    const data = devolucionSchema.parse(input)
    const { supabase } = await requireStaff()

    const { data: id, error } = await supabase.rpc("registrar_devolucion", {
      p_alquiler_id: data.alquiler_id,
      p_items: data.items.map((item) => ({
        alquiler_item_id: item.alquiler_item_id,
        cantidad_ok: item.cantidad_ok,
        cantidad_danada: item.cantidad_danada,
        cantidad_faltante: item.cantidad_faltante,
        observaciones: item.observaciones || null,
      })),
      p_fecha_devolucion_real: data.fecha_devolucion_real,
      p_costo_reparacion: data.costo_reparacion,
      p_costo_reposicion: data.costo_reposicion,
      p_monto_cobrado: data.monto_cobrado,
      p_metodo_pago: data.metodo_pago,
      ...(data.observaciones ? { p_observaciones: data.observaciones } : {}),
    })
    if (error) throw error
    return { id }
  })
}
