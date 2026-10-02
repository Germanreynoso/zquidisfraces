import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants"

/**
 * Preparación de fotos antes de subirlas al bucket.
 * Las fotos de celular pesan varios MB: se redimensionan y recomprimen en el navegador
 * para entrar en el límite del bucket y que la galería cargue rápido.
 */

export const LADO_MAXIMO = 1600
const CALIDAD_JPEG = 0.82
/** Por debajo de este tamaño no vale la pena recomprimir. */
const TAMANO_SEGURO = 900 * 1024

export type DecisionImagen = { redimensionar: boolean; motivo: "formato" | "peso" | "medidas" | "ninguno" }

/** Decide si hay que reprocesar la imagen (función pura: se testea sin navegador). */
export function decidirRedimension(
  tipo: string,
  bytes: number,
  ancho: number,
  alto: number,
  ladoMaximo = LADO_MAXIMO
): DecisionImagen {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(tipo)) return { redimensionar: true, motivo: "formato" }
  if (Math.max(ancho, alto) > ladoMaximo) return { redimensionar: true, motivo: "medidas" }
  if (bytes > TAMANO_SEGURO) return { redimensionar: true, motivo: "peso" }
  return { redimensionar: false, motivo: "ninguno" }
}

export function medidasDestino(ancho: number, alto: number, ladoMaximo = LADO_MAXIMO) {
  const lado = Math.max(ancho, alto)
  if (lado <= ladoMaximo) return { ancho, alto }
  const escala = ladoMaximo / lado
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) }
}

export type ResultadoPreparacion = { archivo: File; comprimida: boolean; error?: string }

/**
 * Devuelve el archivo listo para subir. Si no se puede procesar (formato raro de celular,
 * navegador sin soporte), devuelve el original y el llamador decide qué hacer con el tamaño.
 */
export async function prepararImagen(archivo: File): Promise<ResultadoPreparacion> {
  if (typeof document === "undefined") return { archivo, comprimida: false }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(archivo)
  } catch {
    return {
      archivo,
      comprimida: false,
      error:
        archivo.size > MAX_IMAGE_BYTES
          ? "No se pudo procesar la imagen y pesa más de 5 MB. Probá con otra foto o en formato JPG."
          : undefined,
    }
  }

  const decision = decidirRedimension(archivo.type, archivo.size, bitmap.width, bitmap.height)
  if (!decision.redimensionar) {
    bitmap.close()
    return { archivo, comprimida: false }
  }

  const { ancho, alto } = medidasDestino(bitmap.width, bitmap.height)
  const lienzo = document.createElement("canvas")
  lienzo.width = ancho
  lienzo.height = alto
  const contexto = lienzo.getContext("2d")
  if (!contexto) {
    bitmap.close()
    return { archivo, comprimida: false }
  }
  contexto.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => lienzo.toBlob(resolve, "image/jpeg", CALIDAD_JPEG))
  if (!blob) return { archivo, comprimida: false }

  const nombre = archivo.name.replace(/\.[^.]+$/, "") || "foto"
  return {
    archivo: new File([blob], `${nombre}.jpg`, { type: "image/jpeg", lastModified: Date.now() }),
    comprimida: true,
  }
}
