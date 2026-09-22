import { differenceInCalendarDays, parseISO } from "date-fns"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { friendlyDbMessage, GENERIC_ERROR, isDbError } from "@/lib/errors"
import { addDaysISO, todayISO } from "@/lib/format"
import { logger } from "@/lib/logger"
import { construirReporte } from "@/lib/reportes/construir"
import { generarExcel } from "@/lib/reportes/export-excel"
import { generarPdf } from "@/lib/reportes/export-pdf"
import { FORMATOS_EXPORTACION, MIME_TYPE, nombreArchivo, TIPOS_REPORTE } from "@/lib/reportes/tipos"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_DIAS_RANGO = 366 * 3

const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Fecha inválida (YYYY-MM-DD)" }).refine(
  (value) => !Number.isNaN(parseISO(value).getTime()),
  { message: "Fecha inválida" }
)

const querySchema = z
  .object({
    formato: z.enum(FORMATOS_EXPORTACION, { message: "Formato inválido: use pdf o xlsx" }),
    desde: fechaISO.optional(),
    hasta: fechaISO.optional(),
    agrupacion: z.enum(["dia", "semana", "mes"]).default("dia"),
  })
  .transform((value) => {
    const hasta = value.hasta ?? todayISO()
    const desde = value.desde ?? addDaysISO(hasta, -29)
    return { ...value, desde, hasta }
  })
  .refine((value) => value.hasta >= value.desde, { message: "El rango de fechas es inválido" })
  .refine((value) => differenceInCalendarDays(parseISO(value.hasta), parseISO(value.desde)) <= MAX_DIAS_RANGO, {
    message: "El rango máximo es de 3 años",
  })

/** Exporta un reporte en PDF o Excel. Usa la sesión del usuario: los datos pasan por RLS. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const started = Date.now()
  const { tipo: tipoParam } = await params

  const tipo = z.enum(TIPOS_REPORTE).safeParse(tipoParam)
  if (!tipo.success) {
    return NextResponse.json({ error: "Reporte inexistente" }, { status: 404 })
  }

  const session = await getSession()
  if (!session || !session.profile.activo) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const query = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!query.success) {
    return NextResponse.json(
      { error: query.error.issues[0]?.message ?? "Parámetros inválidos" },
      { status: 400 }
    )
  }

  const { formato, desde, hasta, agrupacion } = query.data

  try {
    const tabla = await construirReporte(tipo.data, session.supabase, { desde, hasta, agrupacion })
    const cuerpo = formato === "pdf" ? generarPdf(tabla) : await generarExcel(tabla)
    const filename = nombreArchivo(tipo.data, desde, hasta, formato)

    logger.info("reportes.export", {
      tipo: tipo.data,
      formato,
      filas: tabla.filas.length,
      bytes: cuerpo.byteLength,
      ms: Date.now() - started,
    })

    return new Response(cuerpo, {
      status: 200,
      headers: {
        "Content-Type": MIME_TYPE[formato],
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(cuerpo.byteLength),
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    const mensaje = isDbError(error) ? friendlyDbMessage(error) : null
    logger.error("reportes.export_error", {
      tipo: tipo.data,
      formato,
      ms: Date.now() - started,
      code: isDbError(error) ? error.code : undefined,
      error: isDbError(error) ? error.message : error,
    })
    return NextResponse.json({ error: mensaje ?? GENERIC_ERROR }, { status: 500 })
  }
}
