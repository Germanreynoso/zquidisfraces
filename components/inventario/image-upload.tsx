"use client"

import { useRef, useState } from "react"
import { Camera, ImagePlus, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, STORAGE_BUCKET_DISFRACES } from "@/lib/constants"
import { prepararImagen } from "@/lib/imagen"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type ImageUploadProps = {
  value: string | null
  onChange: (url: string | null) => void
  /** Rutas subidas en esta sesión del formulario (para limpiarlas si no se guarda). */
  onUploaded?: (path: string) => void
  disabled?: boolean
}

const EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

/**
 * Sube la foto directo a Supabase Storage (las políticas permiten escribir solo a admins)
 * y devuelve su URL pública, que se guarda con el disfraz.
 * Las fotos grandes se achican en el navegador antes de subirlas.
 */
export function ImageUpload({ value, onChange, onUploaded, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const camaraRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(original: File) {
    setError(null)
    setUploading(true)
    try {
      const { archivo, comprimida, error: errorPreparacion } = await prepararImagen(original)
      if (errorPreparacion) {
        setError(errorPreparacion)
        return
      }
      if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(archivo.type)) {
        setError("Formato no soportado. Usá una foto JPG, PNG o WEBP.")
        return
      }
      if (archivo.size > MAX_IMAGE_BYTES) {
        setError("La imagen sigue pesando más de 5 MB. Probá con una foto de menor resolución.")
        return
      }

      const supabase = createClient()
      const path = `${crypto.randomUUID()}.${EXTENSION[archivo.type]}`
      const { error: errorSubida } = await supabase.storage
        .from(STORAGE_BUCKET_DISFRACES)
        .upload(path, archivo, { cacheControl: "31536000", contentType: archivo.type, upsert: false })
      if (errorSubida) throw errorSubida

      const { data } = supabase.storage.from(STORAGE_BUCKET_DISFRACES).getPublicUrl(path)
      onUploaded?.(path)
      onChange(data.publicUrl)
      toast.success(comprimida ? "Foto cargada (se optimizó para la web)" : "Foto cargada")
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : ""
      setError(
        mensaje.toLowerCase().includes("row-level security") || mensaje.toLowerCase().includes("unauthorized")
          ? "No tenés permisos para subir imágenes: solo un administrador puede hacerlo."
          : "No se pudo subir la imagen. Revisá la conexión y probá de nuevo."
      )
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
      if (camaraRef.current) camaraRef.current.value = ""
    }
  }

  const elegirArchivo = () => inputRef.current?.click()

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-4">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={elegirArchivo}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files?.[0]
            if (file) void upload(file)
          }}
          className={cn(
            "group relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed bg-muted/40 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60",
            dragging && "border-primary bg-accent/60",
            error && "border-destructive/60"
          )}
          aria-label={value ? "Cambiar foto" : "Subir foto"}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Vista previa del disfraz" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs">
              <ImagePlus className="size-6" />
              Subir foto
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 grid place-items-center bg-background/70">
              <Spinner />
            </span>
          )}
        </button>

        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Opcional. Se guarda junto con el disfraz y aparece en el listado.
            <br />
            Si la foto es grande, se achica sola antes de subirla.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={elegirArchivo} disabled={disabled || uploading}>
              <Upload />
              {value ? "Cambiar" : "Elegir archivo"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => camaraRef.current?.click()}
              disabled={disabled || uploading}
            >
              <Camera />
              Tomar foto
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setError(null)
                  onChange(null)
                }}
                disabled={disabled || uploading}
              >
                <Trash2 />
                Quitar
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
        }}
      />
      {/* En el celular abre la cámara; en escritorio, el selector de archivos. */}
      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
        }}
      />
    </div>
  )
}
