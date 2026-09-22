import type { Metadata } from "next"
import { Suspense } from "react"
import { CalendarCheck2, PackageCheck, ShieldCheck } from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"
import { BrandMark, BrandName } from "@/components/brand"

export const metadata: Metadata = { title: "Ingresar" }

const HIGHLIGHTS = [
  { icon: PackageCheck, text: "Stock por talle y estado, siempre cuadrado." },
  { icon: CalendarCheck2, text: "Reservas sin superposiciones ni sobreventa." },
  { icon: ShieldCheck, text: "Accesos por rol y datos protegidos." },
]

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[oklch(0.2_0.06_292)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-32 size-[34rem] rounded-full bg-[oklch(0.55_0.22_292)] opacity-40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-48 size-[30rem] rounded-full bg-[oklch(0.63_0.22_345)] opacity-30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]"
        />

        <div className="relative flex items-center gap-2.5">
          <BrandMark className="size-9" />
          <BrandName className="text-lg text-white [&_span]:text-[oklch(0.82_0.12_300)]" />
        </div>

        <div className="relative max-w-md space-y-8">
          <h1 className="font-heading text-4xl leading-[1.1] font-semibold tracking-tight xl:text-5xl">
            Cada disfraz, en el lugar y la fecha correctos.
          </h1>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/80">
                <span className="grid size-8 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/50">© {new Date().getFullYear()} ZquiDisfraces</p>
      </aside>

      <main className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <BrandName />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold">Bienvenido de nuevo</h2>
            <p className="text-sm text-muted-foreground">Ingresá con tu cuenta para gestionar el negocio.</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="text-center text-xs text-muted-foreground">
            ¿No tenés acceso? Pedile a un administrador que te cree un usuario.
          </p>
        </div>
      </main>
    </div>
  )
}
