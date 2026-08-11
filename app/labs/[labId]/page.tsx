import type { Metadata } from "next"

import LabWorkspace from "@/components/lab/lab-workspace"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ labId: string }>
}): Promise<Metadata> {
  const { labId } = await params

  return {
    title: `Lab ${labId}`,
  }
}

export default function LabPage() {
  return <LabWorkspace />
}
