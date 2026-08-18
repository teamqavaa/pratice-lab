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

  // A missing lab id stays a clean 404; any other failure (backend down,
  // network) throws so the error boundary renders with a retry button.
  if (!result.ok) {
    if (result.status === 404) notFound()
    throw new Error(result.message)
  }

  return <LabWorkspace lab={result.lab} />
}