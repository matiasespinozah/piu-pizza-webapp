import type { Metadata } from "next"

import { ServiceBoardView } from "@/components/features/service/service-board"
import { requireSection } from "@/server/auth/access"
import { listServiceBoard } from "@/server/reservations/service-desk"

export const instant = false

export const metadata: Metadata = {
  title: "Atención",
  robots: { index: false, follow: false },
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ServicePage({ searchParams }: PageProps) {
  const session = await requireSection("atencion")
  const params = await searchParams
  const selected = typeof params.id === "string" ? params.id : undefined
  const board = await listServiceBoard(session)
  return <ServiceBoardView initial={board} selectedId={selected} />
}
