"use client"

import { useState, useTransition } from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"

import { useSession } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { enviarResumenTelegram } from "@/lib/actions/telegram"
import { pluralize } from "@/lib/format"

/**
 * Envía el resumen diario a Telegram en el momento. Sirve para probar la configuración
 * del bot; el envío automático lo hace la tarea programada todas las mañanas.
 */
export function EnviarResumenTelegram() {
  const { isAdmin } = useSession()
  const [pendiente, startTransition] = useTransition()
  const [oculto, setOculto] = useState(false)

  if (!isAdmin || oculto) return null

  return (
    <Button
      variant="outline"
      disabled={pendiente}
      onClick={() =>
        startTransition(async () => {
          const resultado = await enviarResumenTelegram()
          if (resultado.ok) {
            const { vencidas, proximas, retiros, stock } = resultado.data
            toast.success("Resumen enviado a Telegram", {
              description: [
                pluralize(vencidas, "vencida"),
                `${proximas} por vencer`,
                pluralize(retiros, "retiro"),
                `${stock} de stock`,
              ].join(" · "),
            })
          } else {
            toast.error(resultado.error)
            // Si Telegram no está configurado, no tiene sentido seguir mostrando el botón.
            if (resultado.error.includes("Falta configurar Telegram")) setOculto(true)
          }
        })
      }
    >
      {pendiente ? <Spinner /> : <Send />}
      Enviar a Telegram
    </Button>
  )
}
