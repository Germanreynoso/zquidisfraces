/**
 * Traducción de errores de Postgres/PostgREST a mensajes aptos para el usuario.
 * Regla: solo se muestran textos que controlamos; el resto se reemplaza por un mensaje genérico
 * (el detalle técnico va al log del servidor).
 */

export type DbError = { code?: string; message?: string; details?: string | null; hint?: string | null }

export const GENERIC_ERROR = "Ocurrió un error inesperado. Intentá nuevamente."

const UNIQUE_MESSAGES: Record<string, string> = {
  disfraces_codigo_unico: "Ya existe un disfraz con ese código.",
  clientes_dni_unico: "Ya existe un cliente con ese DNI.",
  devoluciones_alquiler_unico: "Este alquiler ya tiene una devolución registrada.",
  alquiler_items_unico: "El disfraz está repetido en el alquiler.",
  reserva_items_unico: "El disfraz está repetido en la reserva.",
}

const CHECK_MESSAGES: Record<string, string> = {
  disfraces_codigo_len: "El código debe tener entre 1 y 32 caracteres.",
  disfraces_nombre_len: "El nombre debe tener entre 1 y 120 caracteres.",
  disfraces_talle_len: "El talle debe tener entre 1 y 30 caracteres.",
  disfraces_precios_no_negativos: "Los precios no pueden ser negativos.",
  disfraces_stock_minimo_no_negativo: "El stock mínimo no puede ser negativo.",
  clientes_dni_formato: "El DNI debe tener entre 5 y 15 letras o números.",
  clientes_email_formato: "El email no es válido.",
  alquileres_sin_sobrepago: "El pago supera el saldo pendiente.",
  alquileres_sena_tope: "La seña no puede superar el total.",
}

function constraintFrom(error: DbError): string | undefined {
  const text = `${error.message ?? ""} ${error.details ?? ""}`
  return text.match(/constraint "([^"]+)"/)?.[1]
}

export function isDbError(value: unknown): value is DbError {
  return typeof value === "object" && value !== null && ("code" in value || "message" in value)
}

/** Devuelve un mensaje seguro para mostrar, o null si el error no es reconocido. */
export function friendlyDbMessage(error: DbError): string | null {
  switch (error.code) {
    // RAISE EXCEPTION en nuestras funciones: el mensaje ya está redactado para el usuario.
    case "P0001":
      return error.message ?? null
    case "42501":
      return error.message?.includes("row-level security") || error.message?.includes("permission denied")
        ? "No tenés permisos para realizar esta operación."
        : (error.message ?? "No tenés permisos para realizar esta operación.")
    case "23505": {
      const constraint = constraintFrom(error)
      return (constraint && UNIQUE_MESSAGES[constraint]) ?? "Ya existe un registro con esos datos."
    }
    case "23514": {
      const constraint = constraintFrom(error)
      return (constraint && CHECK_MESSAGES[constraint]) ?? "Algún dato no cumple las reglas del sistema."
    }
    case "23503":
      return "El registro está relacionado con otros datos y no puede eliminarse."
    case "22P02":
      return "Alguno de los datos enviados tiene un formato inválido."
    case "PGRST116":
      return "No se encontró el registro solicitado."
    default:
      return null
  }
}
