"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, Database, RotateCcw, SendHorizontal, Sparkles } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { useSession } from "@/components/session-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type Mensaje = {
  role: "user" | "assistant"
  content: string
  consultas?: { herramienta: string; ok: boolean }[]
}

const SUGERENCIAS = [
  "¿Qué devoluciones están atrasadas?",
  "¿Cuántos disfraces de terror hay disponibles?",
  "¿Tengo 3 trajes de Elsa libres el sábado que viene?",
  "¿Cuánto cobré este mes?",
  "¿Qué clientes me deben plata?",
  "¿Qué se alquiló más en los últimos 90 días?",
]

const NOMBRE_HERRAMIENTA: Record<string, string> = {
  resumen_negocio: "Resumen del negocio",
  buscar_disfraces: "Inventario",
  disponibilidad: "Disponibilidad por fechas",
  buscar_clientes: "Clientes",
  buscar_alquileres: "Alquileres",
  detalle_alquiler: "Detalle de alquiler",
  buscar_reservas: "Reservas",
  alertas: "Alertas",
  ingresos: "Ingresos",
  mas_alquilados: "Ranking de disfraces",
}

export function AsistenteView() {
  const { profile } = useSession()
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [entrada, setEntrada] = useState("")
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const finRef = useRef<HTMLDivElement>(null)
  const campoRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [mensajes, cargando])

  async function enviar(texto: string) {
    const pregunta = texto.trim()
    if (!pregunta || cargando) return

    const nuevos: Mensaje[] = [...mensajes, { role: "user", content: pregunta }]
    setMensajes(nuevos)
    setEntrada("")
    setError(null)
    setCargando(true)

    try {
      const respuesta = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensajes: nuevos.map(({ role, content }) => ({ role, content })),
        }),
      })
      const datos = (await respuesta.json()) as {
        respuesta?: string
        consultas?: { herramienta: string; ok: boolean }[]
        error?: string
      }
      if (!respuesta.ok) throw new Error(datos.error ?? "No se pudo consultar al asistente.")
      setMensajes((actual) => [
        ...actual,
        { role: "assistant", content: datos.respuesta ?? "", consultas: datos.consultas },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo consultar al asistente.")
    } finally {
      setCargando(false)
      campoRef.current?.focus()
    }
  }

  return (
    <>
      <PageHeader
        title="Asistente"
        description="Preguntale por el estado del negocio: consulta la base en el momento."
        actions={
          mensajes.length > 0 && (
            <Button variant="outline" onClick={() => setMensajes([])} disabled={cargando}>
              <RotateCcw />
              Nueva consulta
            </Button>
          )
        }
      />

      <Card className="flex min-h-[60vh] flex-1 flex-col gap-0 overflow-hidden p-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {mensajes.length === 0 && (
            <div className="mx-auto max-w-lg space-y-5 py-8 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-6" />
              </span>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">
                  Hola{profile.nombre ? `, ${profile.nombre.split(" ")[0]}` : ""}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Consulto stock, alquileres, clientes, reservas e ingresos en tiempo real. No modifico nada.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGERENCIAS.map((s) => (
                  <Button key={s} variant="outline" size="sm" className="h-auto py-1.5 text-left" onClick={() => enviar(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {mensajes.map((mensaje, index) => (
            <div
              key={index}
              className={cn("flex gap-3", mensaje.role === "user" ? "justify-end" : "justify-start")}
            >
              {mensaje.role === "assistant" && (
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="size-4" />
                </span>
              )}
              <div className={cn("max-w-[42rem] space-y-1.5", mensaje.role === "user" && "flex flex-col items-end")}>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                    mensaje.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-muted/40 text-foreground"
                  )}
                >
                  {mensaje.content}
                </div>
                {mensaje.consultas && mensaje.consultas.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Database className="size-3.5" />
                    {[...new Set(mensaje.consultas.map((c) => NOMBRE_HERRAMIENTA[c.herramienta] ?? c.herramienta))].join(
                      " · "
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {cargando && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </span>
              <Spinner />
              Consultando la base…
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div ref={finRef} />
        </div>

        <form
          className="flex items-end gap-2 border-t bg-background/60 p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void enviar(entrada)
          }}
        >
          <Textarea
            ref={campoRef}
            value={entrada}
            onChange={(event) => setEntrada(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void enviar(entrada)
              }
            }}
            placeholder="Escribí tu pregunta… (Enter para enviar, Shift+Enter para otra línea)"
            rows={1}
            maxLength={2000}
            disabled={cargando}
            className="max-h-32 min-h-9 resize-none"
          />
          <Button type="submit" size="icon" disabled={cargando || !entrada.trim()} aria-label="Enviar">
            <SendHorizontal />
          </Button>
        </form>
      </Card>

      <p className="text-xs text-muted-foreground">
        El asistente solo consulta: no crea ni modifica datos. Puede equivocarse al interpretar una pregunta, así que
        verificá lo importante en la pantalla correspondiente.
      </p>
    </>
  )
}
