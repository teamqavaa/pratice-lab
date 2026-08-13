import Link from "next/link"
import type { Metadata } from "next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getLabs } from "@/lib/actions/lab-sessions"

export const metadata: Metadata = {
  title: "My Labs",
}

const LANGUAGE_LABEL: Record<string, string> = {
  python: "Python",
  php: "PHP",
  typescript: "TypeScript",
}

export default async function LabsPage() {
  const result = await getLabs()

  if (!result.ok) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm font-medium text-foreground/70">Could not load labs</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {result.message} Make sure the backend is running.
        </p>
      </div>
    )
  }

  if (result.labs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm font-medium text-foreground/70">No labs available</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Publish a lab in the backend to see it here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Labs</h1>
        <p className="text-sm text-muted-foreground">
          Choose a lab to continue your practice.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.labs.map((lab) => (
          <Card key={lab.id} className="flex flex-col">
            <CardHeader className="flex-1">
              <div className="flex items-center gap-2">
                <Badge>{LANGUAGE_LABEL[lab.language] ?? lab.language}</Badge>
                <Badge variant="outline">{lab.difficulty}</Badge>
              </div>
              <CardTitle className="text-base">{lab.title}</CardTitle>
              <CardDescription>
                {lab.steps.length} step{lab.steps.length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button render={<Link href={`/labs/${lab.id}`} />} size="sm">
                Open lab
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
