"use client"

import { Terminal } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { RunOutput } from "./lab-types"

export type LabOutputProps = {
  runOutput: RunOutput
  className?: string
}

export function LabOutput({ runOutput, className }: LabOutputProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border bg-muted/30",
        className
      )}
    >
      <div className="flex shrink-0 items-center gap-1.5 border-b px-3 py-2">
        <Terminal className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Output</span>
      </div>

      <div className="min-h-0 flex-1 p-3">
        <ScrollArea className="h-full">
          {runOutput.status === "idle" ? (
            <Alert>
              <Terminal />
              <AlertTitle>No output yet</AlertTitle>
              <AlertDescription>{runOutput.text}</AlertDescription>
            </Alert>
          ) : (
            <pre
              className={cn(
                "whitespace-pre-wrap rounded-md border bg-background p-3 font-mono text-sm text-foreground",
                runOutput.status === "error" && "text-destructive"
              )}
            >
              {runOutput.text}
            </pre>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}