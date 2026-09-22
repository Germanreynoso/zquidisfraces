"use client"

import { useEffect, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { MoneyField, NumberField, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { ImageUpload } from "@/components/inventario/image-upload"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { useActualizarDisfraz, useCrearDisfraz } from "@/hooks/use-disfraces"
import { CATEGORIA_OPTIONS, STORAGE_BUCKET_DISFRACES, TALLES_SUGERIDOS } from "@/lib/constants"
import { handleMutationError } from "@/lib/form-errors"
import { storagePathFromPublicUrl } from "@/lib/storage"
import { createClient } from "@/lib/supabase/client"
import { disfrazCreateSchema, type DisfrazCreateInput } from "@/lib/validations/disfraces"
import type { DisfrazVista } from "@/types/domain"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  disfraz?: DisfrazVista | null
  onSaved?: (id: string) => void
}

const VACIO: DisfrazCreateInput = {
  codigo: "",
  nombre: "",
  categoria: "otros",
  talle: "",
  descripcion: "",
  cantidad_total: 1,
  stock_minimo: 1,
  precio_alquiler: 0,
  precio_reposicion: 0,
  imagen_url: null,
}

function toFormValues(disfraz?: DisfrazVista | null): DisfrazCreateInput {
  if (!disfraz) return VACIO
  return {
    codigo: disfraz.codigo,
    nombre: disfraz.nombre,
    categoria: disfraz.categoria,
    talle: disfraz.talle,
    descripcion: disfraz.descripcion ?? "",
    cantidad_total: disfraz.cantidad_total,
    stock_minimo: disfraz.stock_minimo,
    precio_alquiler: disfraz.precio_alquiler,
    precio_reposicion: disfraz.precio_reposicion,
    imagen_url: disfraz.imagen_url,
  }
}

/** Alta y edición de disfraces. La cantidad solo se define en el alta; luego se usa "Ajustar stock". */
export function DisfrazFormSheet({ open, onOpenChange, disfraz, onSaved }: Props) {
  const isEdit = Boolean(disfraz)
  const crear = useCrearDisfraz()
  const actualizar = useActualizarDisfraz()
  const pending = crear.isPending || actualizar.isPending
  const uploadedPaths = useRef<string[]>([])

  const form = useForm<DisfrazCreateInput>({
    resolver: zodResolver(disfrazCreateSchema),
    defaultValues: toFormValues(disfraz),
  })

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(disfraz))
      uploadedPaths.current = []
    }
  }, [open, disfraz, form])

  /** Borra imágenes subidas en esta sesión que no quedaron asociadas al disfraz. */
  function cleanupUploads(keepUrl: string | null) {
    const keep = storagePathFromPublicUrl(keepUrl)
    const orphan = uploadedPaths.current.filter((path) => path !== keep)
    uploadedPaths.current = []
    if (orphan.length) void createClient().storage.from(STORAGE_BUCKET_DISFRACES).remove(orphan)
  }

  function close() {
    cleanupUploads(null)
    onOpenChange(false)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      let id: string
      if (disfraz) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { cantidad_total, ...base } = values
        id = (await actualizar.mutateAsync({ id: disfraz.id, input: base })).id
      } else {
        id = (await crear.mutateAsync(values)).id
      }
      cleanupUploads(values.imagen_url)
      onSaved?.(id)
      onOpenChange(false)
    } catch (error) {
      handleMutationError(error, form.setError)
    }
  })

  return (
    <Sheet open={open} onOpenChange={(value) => (!value ? !pending && close() : onOpenChange(value))}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? "Editar disfraz" : "Nuevo disfraz"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modificá los datos del disfraz. Para cambiar cantidades usá “Ajustar stock”."
              : "Cargá el disfraz con su stock inicial. Todas las unidades quedan disponibles."}
          </SheetDescription>
        </SheetHeader>

        <form id="disfraz-form" onSubmit={onSubmit} noValidate className="flex-1 overflow-y-auto p-4">
          <FieldGroup>
            <Controller
              control={form.control}
              name="imagen_url"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Foto</FieldLabel>
                  <ImageUpload
                    value={field.value}
                    onChange={field.onChange}
                    onUploaded={(path) => uploadedPaths.current.push(path)}
                    disabled={pending}
                  />
                </Field>
              )}
            />
            <FieldSeparator />
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <TextField control={form.control} name="codigo" label="Código" required placeholder="SH-001" />
              <TextField control={form.control} name="nombre" label="Nombre" required placeholder="Hombre Araña" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                control={form.control}
                name="categoria"
                label="Categoría"
                required
                options={CATEGORIA_OPTIONS}
              />
              <TextField
                control={form.control}
                name="talle"
                label="Talle"
                required
                placeholder="M, Infantil 6-8…"
                list="talles-sugeridos"
              />
              <datalist id="talles-sugeridos">
                {TALLES_SUGERIDOS.map((talle) => (
                  <option key={talle} value={talle} />
                ))}
              </datalist>
            </div>
            <TextareaField
              control={form.control}
              name="descripcion"
              label="Descripción"
              placeholder="Piezas incluidas, accesorios, cuidados…"
            />
            <FieldSeparator />
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField control={form.control} name="precio_alquiler" label="Precio de alquiler" required />
              <MoneyField
                control={form.control}
                name="precio_reposicion"
                label="Precio de reposición"
                required
                description="Se sugiere como cargo si el disfraz no se devuelve."
              />
              <NumberField
                control={form.control}
                name="cantidad_total"
                label={isEdit ? "Cantidad total" : "Cantidad inicial"}
                required
                min={0}
                disabled={isEdit}
                description={isEdit ? "Se modifica desde “Ajustar stock”." : undefined}
              />
              <NumberField
                control={form.control}
                name="stock_minimo"
                label="Stock mínimo disponible"
                required
                min={0}
                description="Se alerta cuando hay menos unidades disponibles."
              />
            </div>
          </FieldGroup>
        </form>

        <SheetFooter className="flex-row justify-end border-t">
          <Button variant="outline" onClick={close} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="disfraz-form" disabled={pending}>
            {pending && <Spinner />}
            {isEdit ? "Guardar cambios" : "Crear disfraz"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
