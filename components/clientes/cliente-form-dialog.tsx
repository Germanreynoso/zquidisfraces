"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { TextareaField, TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { useActualizarCliente, useCrearCliente } from "@/hooks/use-clientes"
import type { ClienteCreado } from "@/lib/actions/clientes"
import { handleMutationError } from "@/lib/form-errors"
import { CLIENTE_VACIO, clienteSchema, type ClienteInput } from "@/lib/validations/clientes"
import type { Cliente } from "@/types/domain"

type ClienteFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si se pasa, el diálogo edita ese cliente. */
  cliente?: Pick<Cliente, "id" | "nombre" | "apellido" | "dni" | "telefono" | "email" | "direccion" | "notas"> | null
  onSaved?: (cliente: ClienteCreado) => void
}

function toFormValues(cliente: ClienteFormDialogProps["cliente"]): ClienteInput {
  if (!cliente) return CLIENTE_VACIO
  return {
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    dni: cliente.dni,
    telefono: cliente.telefono ?? "",
    email: cliente.email ?? "",
    direccion: cliente.direccion ?? "",
    notas: cliente.notas ?? "",
  }
}

/** Alta y edición de clientes. Reutilizable desde el listado, el detalle y los selectores. */
export function ClienteFormDialog({ open, onOpenChange, cliente, onSaved }: ClienteFormDialogProps) {
  const isEdit = Boolean(cliente)
  const crear = useCrearCliente()
  const actualizar = useActualizarCliente()
  const pending = crear.isPending || actualizar.isPending

  const form = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: toFormValues(cliente),
  })

  useEffect(() => {
    if (open) form.reset(toFormValues(cliente))
  }, [open, cliente, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = cliente ? await actualizar.mutateAsync({ id: cliente.id, input: values }) : await crear.mutateAsync(values)
      onSaved?.(saved)
      onOpenChange(false)
    } catch (error) {
      handleMutationError(error, form.setError)
    }
  })

  return (
    <Dialog open={open} onOpenChange={(value) => !pending && onOpenChange(value)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Actualizá los datos de contacto." : "Registrá los datos para poder alquilar o reservar."}
          </DialogDescription>
        </DialogHeader>
        <form id="cliente-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TextField control={form.control} name="nombre" label="Nombre" required autoComplete="given-name" />
            <TextField control={form.control} name="apellido" label="Apellido" required autoComplete="family-name" />
            <TextField
              control={form.control}
              name="dni"
              label="DNI / Pasaporte"
              required
              placeholder="30111222"
              inputMode="text"
            />
            <TextField control={form.control} name="telefono" label="Teléfono" type="tel" autoComplete="tel" />
            <TextField
              control={form.control}
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              className="sm:col-span-2"
            />
            <TextField
              control={form.control}
              name="direccion"
              label="Dirección"
              autoComplete="street-address"
              className="sm:col-span-2"
            />
            <TextareaField control={form.control} name="notas" label="Notas" rows={2} className="sm:col-span-2" />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="cliente-form" disabled={pending}>
            {pending && <Spinner />}
            {isEdit ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
