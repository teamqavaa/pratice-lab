"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

// Client boundary around the lab workspace; reset() re-renders the segment and
// router.refresh() refetches the server data so the student can retry after a
// transient failure.
export default function LabError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background p-8 text-center">
      <AlertCircle className="size-8 text-destructive" />
      <p className="text-sm font-medium text-foreground">The lab failed to load.</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <Button
        onClick={() => {
          reset()
          router.refresh()
        }}
      >
        Try again
      </Button>
    </div>
  )
}