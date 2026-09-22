import { STORAGE_BUCKET_DISFRACES } from "@/lib/constants"

/**
 * Extrae la ruta del objeto dentro del bucket a partir de su URL pública.
 * Devuelve null si la URL no pertenece al bucket de disfraces (p. ej. una imagen externa).
 */
export function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET_DISFRACES}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  const path = url.slice(index + marker.length).split("?")[0]
  return path ? decodeURIComponent(path) : null
}
