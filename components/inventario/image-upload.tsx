"use client"

import { useRef, useState } from "react"
import { ImagePlus, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, STORAGE_BUCKET_DISFRACES } from "@/lib/constants"
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

/** Sube la imagen directo a Supabase Storage (las políticas permiten escribir solo a admins). */
export function ImageUpload({ value, onChange, onUploaded, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function upload(file: File) {
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Formato no soportado. Usá JPG, PNG o WEBP.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("La imagen supera los 5 MB.")
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const path = `${crypto.randomUUID()}.${EXTENSION[file.type]}`
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET_DISFRACES)
        .upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from(STORAGE_BUCKET_DISFRACES).getPublicUrl(path)
      onUploaded?.(path)
      onChange(data.publicUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      toast.error(
        message.toLowerCase().includes("row-level security")
          ? "No tenés permisos para subir imágenes."
          : "No se pudo subir la imagen. Intentá nuevamente."
      )
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex items-start gap-4">
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
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
          dragging && "border-primary bg-accent/60"
        )}
        aria-label={value ? "Cambiar imagen" : "Subir imagen"}
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
        <p className="text-muted-foreground">JPG, PNG o WEBP. Máximo 5 MB. Podés arrastrar el archivo.</p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <Upload />
            {value ? "Cambiar" : "Elegir archivo"}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)} disabled={disabled || uploading}>
              <Trash2 />
              Quitar
            </Button>
          )}
        </div>
      </div>
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
    </div>
  )
}
