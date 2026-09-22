import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ShieldAlert } from "lucide-react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { SessionProvider } from "@/components/session-provider"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { signOut } from "@/lib/actions/auth"
import { getSession } from "@/lib/auth"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")

  if (!session.profile.activo) {
    return (
      <main className="grid min-h-svh place-items-center p-6">
        <Empty className="max-w-md border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldAlert />
            </EmptyMedia>
            <EmptyTitle>Usuario pendiente de habilitación</EmptyTitle>
            <EmptyDescription>
              Tu cuenta ({session.email}) todavía no fue habilitada. Pedile a un administrador que la active.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <form action={signOut}>
              <Button variant="outline" type="submit">
                Cerrar sesión
              </Button>
            </form>
          </EmptyContent>
        </Empty>
      </main>
    )
  }

  const cookieStore = await cookies()
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <SessionProvider profile={session.profile} email={session.email}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  )
}
