/** Contrato de respuesta de todas las Server Actions (compartido cliente/servidor). */

export type FieldErrors = Record<string, string[] | undefined>

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: FieldErrors }

export class ActionError extends Error {
  readonly fieldErrors?: FieldErrors

  constructor(message: string, fieldErrors?: FieldErrors) {
    super(message)
    this.name = "ActionError"
    this.fieldErrors = fieldErrors
  }
}

/** Convierte un ActionResult en valor o excepción (para usar dentro de useMutation). */
export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new ActionError(result.error, result.fieldErrors)
  return result.data
}
