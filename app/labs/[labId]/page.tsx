import { notFound } from "next/navigation"
import type { Metadata } from "next"

import LabWorkspace from "@/components/lab/lab-workspace"
import { getLab } from "@/lib/actions/lab-sessions"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ labId: string }>
}): Promise<Metadata> {
  const { labId } = await params
  const result = await getLab(labId)
  if (!result.ok) return { title: "Practice Lab" }
  return { title: result.lab.title }
}

export default async function LabPage({
  params,
}: {
  params: Promise<{ labId: string }>
}) {
  const { labId } = await params
  const result = await getLab(labId)

  if (!result.ok) notFound()

  return <LabWorkspace lab={result.lab} />
}