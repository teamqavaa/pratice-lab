"use client"

import { useCallback, useEffect, useSyncExternalStore, useState } from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

// Single-hint model: one boolean per step replaces the old hints counter.
type StepProgress = {
  hintRevealed: boolean
  status: "not_started" | "in_progress" | "completed"
}

// TODO: pull steps from the lab definition once one exists.
const STEPS = [
  { id: "intro", label: "Getting started" },
  { id: "setup", label: "Environment setup" },
  { id: "analysis", label: "Run the analysis" },
]

// Namespaced per lab so one lab's progress can't bleed into another.
const progressKey = (labId: string) => `lab-progress:${labId}`

// No external store to watch yet — just flips rendering between server and client.
const subscribe = () => () => {}

export default function LabWorkspace({ labId }: { labId: string }) {
  // Load saved progress once in the initializer: server stays empty, client hydrates without a mismatch.
  const [progress, setProgress] = useState<Record<string, StepProgress>>(() => {
    if (typeof window === "undefined") return {}
    try {
      return JSON.parse(localStorage.getItem(progressKey(labId)) ?? "{}")
    } catch {
      // Legacy or corrupt payload — start fresh.
      return {}
    }
  })

  // False on the server so SSR HTML stays identical; step rows appear only after mount.
  const isHydrated = useSyncExternalStore(subscribe, () => true, () => false)

  // Write-through persistence — skipped until mount so defaults never clobber saved progress.
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(progressKey(labId), JSON.stringify(progress))
    }
  }, [isHydrated, labId, progress])

  // Hints are single-use: re-clicking an already-shown hint is a no-op.
  const revealHint = useCallback((stepId: string) => {
    setProgress((prev) => {
      if (prev[stepId]?.hintRevealed) return prev
      return {
        ...prev,
        [stepId]: {
          status: prev[stepId]?.status ?? "not_started",
          hintRevealed: true,
        },
      }
    })
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5">
        {/* TODO: real Links once /dashboard and /labs routes exist — keep spans until then. */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<span />}>Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<span />}>My Labs</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Lab name placeholder</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex shrink-0 items-center gap-2">
          <Badge>Python</Badge>
          <Badge variant="secondary">Data Literacy</Badge>
          <Badge variant="outline">Guided</Badge>
        </div>
      </header>

      <div className="shrink-0 px-4 py-3">
        <Progress value={60}>
          <ProgressLabel>Course progress</ProgressLabel>
          <ProgressValue />
        </Progress>
      </div>

      <main className="min-h-0 flex-1 p-4 pt-0">
        {/* Shell only. TODO: Step sidebar -> Accordion; Editor -> file Tabs + CodeMirror; Output -> Logs/Results/Tests/History Tabs. */}
        {/* Sizes are strings: v4 reads bare numbers as pixels, strings as percentages. */}
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize="20" minSize="15" className="min-h-0">
            <div className="flex h-full flex-col gap-2 overflow-hidden rounded-lg border border-dashed bg-muted/30 p-3">
              <p className="text-sm font-medium text-muted-foreground">Step sidebar</p>
              {/* TODO: swap placeholder step rows for an Accordion once the real curriculum lands. */}
              {isHydrated &&
                STEPS.map((step) => {
                  const hintRevealed = progress[step.id]?.hintRevealed ?? false
                  return (
                    <div
                      key={step.id}
                      className="flex items-center justify-between gap-2 rounded-md bg-background/60 px-2 py-1.5"
                    >
                      <span className="truncate text-xs">{step.label}</span>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={hintRevealed}
                        onClick={() => revealHint(step.id)}
                      >
                        {hintRevealed ? "Hint shown" : "Reveal hint"}
                      </Button>
                    </div>
                  )
                })}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="80" minSize="40" className="min-h-0">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel
                defaultSize="60"
                minSize="20"
                className="min-h-0"
              >
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm font-medium text-muted-foreground">
                  Editor
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel
                defaultSize="40"
                minSize="15"
                className="min-h-0"
              >
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm font-medium text-muted-foreground">
                  Output panel
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  )
}
