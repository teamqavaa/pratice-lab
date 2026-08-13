"use client"

import { Terminal } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { RunOutput } from "./lab-types"

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
      <p className="text-sm font-medium text-foreground/70">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

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
      <Tabs defaultValue="logs" className="flex h-full flex-col gap-0">
        <TabsList
          variant="line"
          className="h-9 w-full justify-start rounded-none border-b px-1"
        >
          <TabsTrigger value="logs">
            <Terminal />
            Logs
          </TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="min-h-0 flex-1 p-3">
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
        </TabsContent>

        <TabsContent value="results" className="min-h-0 flex-1 p-3">
          <ScrollArea className="h-full">
            <EmptyState
              title="No results yet"
              description="Completed runs will show up here."
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="tests" className="min-h-0 flex-1 p-3">
          <ScrollArea className="h-full">
            <EmptyState
              title="No tests run"
              description="Tests will show up here once you run your code."
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="min-h-0 flex-1 p-3">
          <ScrollArea className="h-full">
            <EmptyState
              title="No run history"
              description="Past executions will appear here."
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}