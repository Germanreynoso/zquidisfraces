/**
 * Crea (o promueve) el usuario administrador del sistema.
 *
 *   pnpm create-admin --email dueño@negocio.com --password "********" --nombre "Nombre Apellido"
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.
 * Si el email ya existe, lo deja como admin activo (y opcionalmente le cambia la contraseña).
 */
import { parseArgs } from "node:util"
import { config } from "dotenv"
import { createClient } from "@supabase/supabase-js"

import type { Database } from "../types/database.types"

config({ path: ".env.local" })
config()

function fail(message: string): never {
  console.error(`✘ ${message}`)
  process.exit(1)
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      password: { type: "string" },
      nombre: { type: "string" },
    },
  })

  const email = values.email?.trim().toLowerCase()
  const password = values.password
  const nombre = values.nombre?.trim() || email?.split("@")[0] || "Administrador"

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("Indicá un --email válido.")
  if (password !== undefined && password.length < 8) fail("La contraseña debe tener al menos 8 caracteres.")

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) fail("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.")

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Busca el usuario por email (paginando la API de administración).
  let userId: string | undefined
  for (let page = 1; page <= 50 && !userId; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) fail(`No se pudo listar usuarios: ${error.message}`)
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id
    if (data.users.length < 200) break
  }

  if (userId) {
    console.log(`• El usuario ${email} ya existe: se promueve a administrador.`)
    if (password) {
      const { error } = await supabase.auth.admin.updateUserById(userId, { password })
      if (error) fail(`No se pudo actualizar la contraseña: ${error.message}`)
    }
  } else {
    if (!password) fail("El usuario no existe: indicá --password para crearlo.")
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    })
    if (error || !data.user) fail(`No se pudo crear el usuario: ${error?.message}`)
    userId = data.user.id
    console.log(`• Usuario ${email} creado.`)
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ rol: "admin", activo: true, nombre })
    .eq("id", userId)
  if (profileError) fail(`No se pudo actualizar el perfil: ${profileError.message}`)

  console.log(`✔ ${email} es administrador activo.`)
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)))
