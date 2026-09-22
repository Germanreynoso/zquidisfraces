"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

import "./calendario.css"

// FullCalendar depende del DOM: se carga solo en el cliente.
const CalendarioBoard = dynamic(() => import("./calendario-board"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-7 w-full max-w-xl" />
      <Skeleton className="h-[36rem] w-full rounded-xl" />
    </div>
  ),
})

export function CalendarioView() {
  return <CalendarioBoard />
}
