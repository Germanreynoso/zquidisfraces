import type { FieldValues, Path, UseFormSetError } from "react-hook-form"
import { toast } from "sonner"

import { ActionError } from "@/lib/action-result"
import { GENERIC_ERROR } from "@/lib/errors"

/**
 * Muestra el error de una mutación: los errores por campo van al formulario y el mensaje general a un toast.
 */
export function handleMutationError<T extends FieldValues>(error: unknown, setError?: UseFormSetError<T>) {
  if (error instanceof ActionError) {
    if (setError && error.fieldErrors) {
      for (const [field, messages] of Object.entries(error.fieldErrors)) {
        if (messages?.[0]) setError(field as Path<T>, { type: "server", message: messages[0] })
      }
    }
    toast.error(error.message)
    return
  }
  toast.error(GENERIC_ERROR)
}
