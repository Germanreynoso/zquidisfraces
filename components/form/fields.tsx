"use client"

import { useState } from "react"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form"
import type { Matcher } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatDate, parseDate, toISODate } from "@/lib/format"
import { cn } from "@/lib/utils"

type BaseFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPath<T>
  label: React.ReactNode
  description?: React.ReactNode
  className?: string
  disabled?: boolean
  required?: boolean
}

function Label({ children, required, htmlFor }: { children: React.ReactNode; required?: boolean; htmlFor: string }) {
  return (
    <FieldLabel htmlFor={htmlFor}>
      {children}
      {required && (
        <span aria-hidden className="text-destructive">
          *
        </span>
      )}
    </FieldLabel>
  )
}

// -----------------------------------------------------------------------------
// Texto
// -----------------------------------------------------------------------------
type TextFieldProps<T extends FieldValues> = BaseFieldProps<T> & {
  placeholder?: string
  type?: "text" | "email" | "tel" | "password" | "search"
  autoComplete?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  list?: string
  autoFocus?: boolean
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  disabled,
  required,
  type = "text",
  ...inputProps
}: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled} className={className}>
          <Label htmlFor={field.name} required={required}>
            {label}
          </Label>
          <Input
            {...field}
            {...inputProps}
            value={field.value ?? ""}
            id={field.name}
            type={type}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  disabled,
  required,
  placeholder,
  rows = 3,
}: BaseFieldProps<T> & { placeholder?: string; rows?: number }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled} className={className}>
          <Label htmlFor={field.name} required={required}>
            {label}
          </Label>
          <Textarea
            {...field}
            value={field.value ?? ""}
            id={field.name}
            rows={rows}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

// -----------------------------------------------------------------------------
// Números y montos (el estado del form guarda number | undefined)
// -----------------------------------------------------------------------------
type NumberFieldProps<T extends FieldValues> = BaseFieldProps<T> & {
  placeholder?: string
  min?: number
  max?: number
  step?: number
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  disabled,
  required,
  placeholder,
  min,
  max,
  step = 1,
  prefix,
  suffix,
}: NumberFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const inputProps = {
          id: field.name,
          name: field.name,
          ref: field.ref,
          onBlur: field.onBlur,
          type: "number" as const,
          inputMode: "decimal" as const,
          min,
          max,
          step,
          placeholder,
          disabled,
          value: field.value ?? "",
          "aria-invalid": fieldState.invalid,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            const raw = event.target.value
            field.onChange(raw === "" ? undefined : Number(raw))
          },
          className: "tabular",
        }
        return (
          <Field data-invalid={fieldState.invalid} data-disabled={disabled} className={className}>
            <Label htmlFor={field.name} required={required}>
              {label}
            </Label>
            {prefix || suffix ? (
              <InputGroup>
                {prefix && <InputGroupAddon>{prefix}</InputGroupAddon>}
                <InputGroupInput {...inputProps} />
                {suffix && <InputGroupAddon align="inline-end">{suffix}</InputGroupAddon>}
              </InputGroup>
            ) : (
              <Input {...inputProps} />
            )}
            {description && <FieldDescription>{description}</FieldDescription>}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )
      }}
    />
  )
}

export function MoneyField<T extends FieldValues>(props: Omit<NumberFieldProps<T>, "prefix" | "step" | "min">) {
  return <NumberField {...props} prefix="$" step={100} min={0} />
}

// -----------------------------------------------------------------------------
// Select
// -----------------------------------------------------------------------------
type SelectOption = { value: string; label: string }

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  disabled,
  required,
  options,
  placeholder = "Seleccionar…",
}: BaseFieldProps<T> & { options: readonly SelectOption[]; placeholder?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled} className={className}>
          <Label htmlFor={field.name} required={required}>
            {label}
          </Label>
          <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={disabled} name={field.name}>
            <SelectTrigger id={field.name} aria-invalid={fieldState.invalid} className="w-full" onBlur={field.onBlur}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

// -----------------------------------------------------------------------------
// Fecha (el estado del form guarda "YYYY-MM-DD")
// -----------------------------------------------------------------------------
type DatePickerProps = {
  id?: string
  value: string | undefined
  onChange: (value: string | undefined) => void
  disabled?: boolean
  disabledDays?: Matcher | Matcher[]
  placeholder?: string
  invalid?: boolean
  className?: string
}

export function DatePicker({
  id,
  value,
  onChange,
  disabled,
  disabledDays,
  placeholder = "Elegir fecha",
  invalid,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseDate(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid}
          className={cn("w-full justify-start font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarIcon />
          {value ? formatDate(value, "EEE dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={es}
          selected={selected}
          defaultMonth={selected}
          disabled={disabledDays}
          onSelect={(date) => {
            onChange(date ? toISODate(date) : undefined)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  disabled,
  required,
  disabledDays,
}: BaseFieldProps<T> & { disabledDays?: Matcher | Matcher[] }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} data-disabled={disabled} className={className}>
          <Label htmlFor={field.name} required={required}>
            {label}
          </Label>
          <DatePicker
            id={field.name}
            value={field.value}
            onChange={field.onChange}
            disabled={disabled}
            disabledDays={disabledDays}
            invalid={fieldState.invalid}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
