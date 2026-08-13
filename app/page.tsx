import Link from "next/link"

import { Button } from "@/components/ui/button"

// Home page is a minimal entry point — real navigation lives under /labs.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="max-w-xl text-3xl font-semibold tracking-tight">
        Practice Lab
      </h1>
      <p className="max-w-md text-muted-foreground">
        Work through guided coding labs. Each lab has steps, hints, and live code
        execution.
      </p>
      <Button render={<Link href="/labs" />}>
        Browse labs
      </Button>
    </div>
  )
}
