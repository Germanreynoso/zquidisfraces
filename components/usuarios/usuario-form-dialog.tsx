"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, RefreshCw } from "lucide-react"
import { Controller, useForm } from "react-hook-form"

import { SelectField, TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useCrearUsuario } from "@/hooks/use-usuarios"
import { ROL_OPTIONS } from "@/lib/constants"
import { handleMutationError } from "@/lib/form-errors"
import { crearUsuarioSchema, type CrearUsuarioInput } from "@/lib/validations/usuarios"

const VACIO: CrearUsuarioInput = { nombre: "", email: "", password: "", rol: "empleado" }

/** Contraseña temporal legible (sin caracteres ambiguos). */
function generarPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  const values = crypto.getRandomValues(new Uint32Array(length))
  return Array.from(values, (value) => chars[value % chars.length]).join("")
}

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

export function UsuarioFormDialog({ open, onOpenChange }: Props) {
  const crear = useCrearUsuario()
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<CrearUsuarioInput>({
    resolver: zodResolver(crearUsuarioSchema),
    defaultValues: VACIO,
  })

  useEffect(() => {
    if (open) {
      form.reset(VACIO)
      setShowPassword(false)
    }
  }, [open, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await crear.mutateAsync(values)
      onOpenChange(false)
    } catch (error) {
      handleMutationError(error, form.setError)
    }
  })

  return (
    <Dialog open={open} onOpenChange={(value) => !crear.isPending && onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            El usuario queda habilitado al instante. Compartile la contraseña temporal por un canal seguro.
          </DialogDescription>
        </DialogHeader>
        <form id="usuario-form" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <TextField control={form.control} name="nombre" label="Nombre" required autoComplete="off" />
            <TextField control={form.control} name="email" label="Email" type="email" required autoComplete="off" />
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="usuario-password">
                    Contraseña temporal
                    <span aria-hidden className="text-destructive">
                      *
                    </span>
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      {...field}
                      id="usuario-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      aria-invalid={fieldState.invalid}
                      className="font-mono"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-xs"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                      <InputGroupButton
                        size="icon-xs"
                        onClick={() => {
                          form.setValue("password", generarPassword(), { shouldValidate: true })
                          setShowPassword(true)
                        }}
                        aria-label="Generar contraseña"
                      >
                        <RefreshCw />
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>Mínimo 8 caracteres. Podés generarla automáticamente.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <SelectField
              control={form.control}
              name="rol"
              label="Rol"
              required
              options={ROL_OPTIONS}
              description="Empleado: operación diaria. Administrador: acceso total, precios, stock y usuarios."
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={crear.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="usuario-form" disabled={crear.isPending}>
            {crear.isPending && <Spinner />}
            Crear usuario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
