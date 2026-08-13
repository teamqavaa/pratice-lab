"use client"

import { useEffect, useRef, useState } from "react"

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
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, FileCode, Lightbulb, Play, RotateCcw, Terminal } from "lucide-react"
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import CodeEditor from "@/components/lab/code-editor"
import type { Lab } from "@/lib/mock-data"
import { LANGUAGE_CONFIG } from "@/lib/languages"
import { cn } from "@/lib/utils"
import {
  completeLab,
  executeLab,
  getLabSession,
  resetLabSession,
  saveLabSession,
  sendLabHeartbeat,
} from "@/lib/actions/lab-sessions"

type StepStatus = "done" | "in_progress" | "locked"

const STATUS_LABEL: Record<StepStatus, string> = {
  done: "Done",
  in_progress: "In Progress",
  locked: "Locked",
}

const STATUS_BADGE_CLASS: Record<StepStatus, string> = {
  done: "border-status-done/30 bg-status-done/10 text-status-done",
  in_progress:
    "border-status-in-progress/30 bg-status-in-progress/10 text-status-in-progress",
  locked: "border-border bg-muted text-muted-foreground",
}

const LANGUAGE_LABEL: Record<Lab["language"], string> = {
  python: "Python",
  php: "PHP",
  typescript: "TypeScript",
}

type SaveStatus = "idle" | "saving" | "saved" | "failed"
type RunOutput = { text: string; status: "idle" | "running" | "success" | "error" }

const SAVE_DEBOUNCE_MS = 1000
const HEARTBEAT_INTERVAL_MS = 30000

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
      <p className="text-sm font-medium text-foreground/70">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export default function LabWorkspace({ lab }: { lab: Lab }) {
  const language = lab.language
  const config = LANGUAGE_CONFIG[language]

  const [activeStepId, setActiveStepId] = useState(lab.steps[0].id)
  const [openStepIds, setOpenStepIds] = useState<string[]>([lab.steps[0].id])
  const [stepStatus, setStepStatus] = useState<Record<string, StepStatus>>(() => {
    const initial: Record<string, StepStatus> = {}
    lab.steps.forEach((step, index) => {
      initial[step.id] = index === 0 ? "in_progress" : "locked"
    })
    return initial
  })
  const [hintsRevealed, setHintsRevealed] = useState<Record<string, boolean>>({})
  const [code, setCode] = useState(lab.starterCode ?? config.sample)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [sessionCompleted, setSessionCompleted] = useState(false)
  const [restartOpen, setRestartOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runOutput, setRunOutput] = useState<RunOutput>({
    text: "Run your code to see logs appear here.",
    status: "idle",
  })

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Session load
  useEffect(() => {
    async function initSession() {
      // Restore the student's saved code and completion state on entry so a
      // refresh doesn't wipe their work.
      const result = await getLabSession(lab.id)
      if (!result.ok) return
      if (result.currentCode) setCode(result.currentCode)
      if (result.status === "completed") {
        setSessionCompleted(true)
        setStepStatus(
          Object.fromEntries(lab.steps.map((step) => [step.id, "done"]))
        )
      }
    }
    initSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lab.id])

  // Heartbeat
  useEffect(() => {
    // Keep the backend session alive so last_active_at stays fresh while the
    // student is working; stops on unmount to avoid orphan intervals.
    const interval = setInterval(() => {
      sendLabHeartbeat(lab.id)
    }, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [lab.id])

  const triggerSave = async (currentCode: string) => {
    setSaveStatus("saving")
    const result = await saveLabSession(lab.id, currentCode)
    if (result.ok) {
      setSaveStatus("saved")
      // Reset the chip back to idle so the next keystroke shows "Saving..." again.
      setTimeout(() => setSaveStatus("idle"), 1500)
    } else {
      setSaveStatus("failed")
    }
  }

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    // Debounce autosave: firing on every keystroke would spam the backend.
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      triggerSave(newCode)
    }, SAVE_DEBOUNCE_MS)
  }

  const handleRun = async () => {
    setIsRunning(true)
    setRunOutput({ text: "Running...", status: "running" })

    const result = await executeLab({
      language,
      version: config.version,
      filename: config.filename,
      code,
    })

    if (result.ok) {
      let out = ""
      if (result.stdout) out += result.stdout
      if (result.stderr) out += (result.stdout ? "\n[stderr]:\n" : "[stderr]:\n") + result.stderr
      if (!result.stdout && !result.stderr) out = "Code executed successfully with no output."
      if (result.exitCode !== 0 && result.exitCode !== null) out += `\n[Exited with code ${result.exitCode}]`
      setRunOutput({ text: out, status: "success" })
    } else {
      // Translate the typed error kinds into student-facing copy — raw status
      // codes mean nothing to a learner.
      let message = result.message
      switch (result.kind) {
        case "rate_limited":
          message = `Rate limit reached: ${result.message}`
          break
        case "validation":
          message = `Runtime error: ${result.message}`
          break
        case "timeout":
          message = "Execution timed out. Try simplifying your code or check for infinite loops."
          break
        case "piston_unreachable":
          message = "Code execution service is unavailable. Please try again shortly."
          break
        case "network":
          message = "Network error — check your connection and make sure the server is running."
          break
        case "unexpected":
          message = `Unexpected error: ${result.message}`
          break
      }
      setRunOutput({ text: message, status: "error" })
    }

    setIsRunning(false)
  }

  const handleComplete = async () => {
    const result = await completeLab(lab.id)
    if (result.ok) {
      setSessionCompleted(true)
      setStepStatus(
        Object.fromEntries(lab.steps.map((step) => [step.id, "done"]))
      )
    }
  }

  const handleRestart = async () => {
    // Wipe every piece of per-attempt state so the lab looks brand new. The
    // API call runs after so a reload keeps the cleared state.
    setSessionCompleted(false)
    setCode(lab.starterCode ?? config.sample)
    setStepStatus(
      Object.fromEntries(lab.steps.map((step, index) => [step.id, index === 0 ? "in_progress" : "locked"]))
    )
    setActiveStepId(lab.steps[0].id)
    setOpenStepIds([lab.steps[0].id])
    setHintsRevealed({})
    setRunOutput({ text: "Run your code to see logs appear here.", status: "idle" })
    setSaveStatus("idle")
    setRestartOpen(false)

    await resetLabSession(lab.id)
  }

  const toggleHint = (stepId: string) => {
    setHintsRevealed((prev) => ({ ...prev, [stepId]: !prev[stepId] }))
  }

  const doneCount = lab.steps.filter((step) => stepStatus[step.id] === "done").length
  const progress = lab.steps.length === 0 ? 0 : Math.round((doneCount / lab.steps.length) * 100)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/labs">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/labs">My Labs</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{lab.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex shrink-0 items-center gap-2">
          {sessionCompleted && <Badge variant="secondary">Completed</Badge>}
          <Badge>{LANGUAGE_LABEL[lab.language]}</Badge>
          <Badge variant="secondary">{lab.category}</Badge>
          <Badge variant="outline">{lab.difficulty}</Badge>
          <AlertDialog open={restartOpen} onOpenChange={setRestartOpen}>
            <AlertDialogTrigger
              render={
                <Button size="sm" variant="outline">
                  <RotateCcw />
                  Restart lab
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restart lab?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears your saved code, resets the lab progress, and returns
                  the editor to its starter code. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogClose
                  render={<Button variant="outline">Cancel</Button>}
                />
                <Button variant="destructive" onClick={handleRestart}>
                  Restart lab
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            size="sm"
            variant={sessionCompleted ? "outline" : "default"}
            disabled={sessionCompleted}
            onClick={handleComplete}
          >
            {sessionCompleted ? (
              <>
                <Check />
                Completed
              </>
            ) : (
              "Mark as Complete"
            )}
          </Button>
        </div>
      </header>

      <div className="shrink-0 px-4 py-3">
        <Progress value={progress}>
          <ProgressLabel>Lab progress</ProgressLabel>
          <ProgressValue />
        </Progress>
      </div>

      <main className="min-h-0 flex-1 p-4 pt-0">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize="22" minSize="18" className="min-h-0">
            <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-card/50">
              <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-medium">Steps</span>
                <span className="text-xs text-muted-foreground">{lab.steps.length}</span>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <Accordion
                  value={openStepIds}
                  onValueChange={(value) => setOpenStepIds(value)}
                  className="p-1.5"
                >
                  {lab.steps.map((step) => (
                    <AccordionItem key={step.id} value={step.id}>
                      <AccordionTrigger
                        onClick={() => setActiveStepId(step.id)}
                        className={cn(
                          "gap-2 px-3",
                          activeStepId === step.id && "bg-primary/10"
                        )}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs tabular-nums text-muted-foreground">
                            {step.order}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{step.title}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0",
                              STATUS_BADGE_CLASS[stepStatus[step.id]]
                            )}
                          >
                            {STATUS_LABEL[stepStatus[step.id]]}
                          </Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-3">
                        <p className="whitespace-pre-line text-muted-foreground">
                          {step.content}
                        </p>
                        {step.hint && (
                          <div className="mt-2">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => toggleHint(step.id)}
                            >
                              <Lightbulb />
                              {hintsRevealed[step.id] ? "Hide hint" : "Show hint"}
                            </Button>
                            {hintsRevealed[step.id] && (
                              <div className="mt-2 rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                                {step.hint}
                              </div>
                            )}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="78" minSize="40" className="min-h-0">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize="65" minSize="20" className="min-h-0">
                <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-muted/30">
                  <Tabs defaultValue={config.filename} className="flex h-full flex-col gap-0">
                    <div className="flex shrink-0 items-center justify-between border-b bg-muted/50 pr-2">
                      <TabsList
                        variant="line"
                        className="h-9 w-full justify-start rounded-none px-1"
                      >
                        <TabsTrigger value={config.filename}>
                          <FileCode />
                          {config.filename}
                        </TabsTrigger>
                      </TabsList>
                      <div className="flex shrink-0 items-center gap-2">
                        {saveStatus === "saving" && (
                          <span className="text-xs text-muted-foreground">Saving...</span>
                        )}
                        {saveStatus === "saved" && (
                          <span className="text-xs text-status-done">Saved</span>
                        )}
                        {saveStatus === "failed" && (
                          <span className="text-xs text-destructive">Save failed</span>
                        )}
                        <Button size="sm" onClick={handleRun} disabled={isRunning}>
                          <Play />
                          {isRunning ? "Running..." : "Run"}
                        </Button>
                      </div>
                    </div>
                    <TabsContent
                      value={config.filename}
                      className="flex min-h-0 flex-1 flex-col"
                    >
                      <CodeEditor
                        language={language}
                        value={code}
                        onChange={handleCodeChange}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize="35" minSize="15" className="min-h-0">
                <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-muted/30">
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
                              "whitespace-pre-wrap rounded-md border bg-zinc-950 p-3 font-mono text-sm text-zinc-100",
                              runOutput.status === "error" && "text-red-400"
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
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  )
}
