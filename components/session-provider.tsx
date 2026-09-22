"use client"

import { createContext, useContext } from "react"

import type { Profile } from "@/types/domain"

type SessionValue = {
  profile: Profile
  email: string | null
  isAdmin: boolean
}

const SessionContext = createContext<SessionValue | null>(null)

/**
 * Expone el perfil del usuario a Client Components (para mostrar u ocultar acciones).
 * Es solo UX: la autorización real la hacen las Server Actions y RLS.
 */
export function SessionProvider({
  profile,
  email,
  children,
}: {
  profile: Profile
  email: string | null
  children: React.ReactNode
}) {
  return (
    <SessionContext.Provider value={{ profile, email, isAdmin: profile.rol === "admin" }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error("useSession debe usarse dentro de <SessionProvider>")
  return value
}
