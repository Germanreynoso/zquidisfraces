import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { UsuariosView } from "@/components/usuarios/usuarios-view"
import { getSession } from "@/lib/auth"

export const metadata: Metadata = { title: "Usuarios" }

export default async function UsuariosPage() {
  const session = await getSession()
  if (!session || !session.profile.activo || session.profile.rol !== "admin") notFound()
  return <UsuariosView currentUserId={session.userId} />
}
