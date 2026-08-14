"use client"

import { useEffect, useRef, useState } from "react"
import { FileCode, ListChecks, Terminal } from "lucide-react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { LabCode } from "@/components/lab/lab-code"
import { LabOutput } from "@/components/lab/lab-output"
import { LabSteps } from "@/components/lab/lab-steps"
import { LabTopBar } from "@/components/lab/lab-topbar"
import type { RunOutput, SaveStatus, StepStatus } from "@/components/lab/lab-types"
import { useMediaQuery } from "@/lib/use-media-query"
import type { Lab } from "@/lib/mock-data"
import { LANGUAGE_CONFIG } from "@/lib/languages"
import {
  completeLab,
  executeLab,
  getLabSession,
  resetLabSession,
  saveLabSession,
  sendLabHeartbeat,
} from "@/lib/actions/lab-sessions"

const SAVE_DEBOUNCE_MS = 1000
const HEARTBEAT_INTERVAL_MS = 30000

export default function LabWorkspace({ lab }: { lab: Lab }) {
  const language = lab.language
  const config = LANGUAGE_CONFIG[language]
  const isDesktop = useMediaQuery("(min-width: 1024px)")

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

  const handleOpenChange = (value: string[]) => {
    setOpenStepIds(value)
  }

  const handleStepChange = (stepId: string) => {
    setActiveStepId(stepId)
  }

  const doneCount = lab.steps.filter((step) => stepStatus[step.id] === "done").length
  const progress = lab.steps.length === 0 ? 0 : Math.round((doneCount / lab.steps.length) * 100)
  const currentStepNumber = lab.steps.findIndex((step) => step.id === activeStepId) + 1

  const stepsPanel = (
    <LabSteps
      className="h-full"
      steps={lab.steps}
      stepStatus={stepStatus}
      activeStepId={activeStepId}
      openStepIds={openStepIds}
      hintsRevealed={hintsRevealed}
      onStepChange={handleStepChange}
      onOpenChange={handleOpenChange}
      onToggleHint={toggleHint}
    />
  )

  const codePanel = (
    <LabCode
      className="h-full"
      language={language}
      filename={config.filename}
      value={code}
      saveStatus={saveStatus}
      isRunning={isRunning}
      onChange={handleCodeChange}
      onRun={handleRun}
    />
  )

  const outputPanel = <LabOutput className="h-full" runOutput={runOutput} />

  const desktopLayout = (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize="22" minSize="18" className="min-h-0">
        {stepsPanel}
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize="78" minSize="40" className="min-h-0">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel defaultSize="65" minSize="20" className="min-h-0">
            {codePanel}
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="35" minSize="15" className="min-h-0">
            {outputPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  )

  const mobileLayout = (
    <Tabs defaultValue="editor" className="flex h-full flex-col gap-2">
      <TabsList className="w-full">
        <TabsTrigger value="steps">
          <ListChecks />
          Steps
        </TabsTrigger>
        <TabsTrigger value="editor">
          <FileCode />
          Editor
        </TabsTrigger>
        <TabsTrigger value="output">
          <Terminal />
          Output
        </TabsTrigger>
      </TabsList>

      <TabsContent value="steps" className="min-h-0 flex-1">
        {stepsPanel}
      </TabsContent>

      <TabsContent value="editor" className="min-h-0 flex-1">
        {codePanel}
      </TabsContent>

      <TabsContent value="output" className="min-h-0 flex-1">
        {outputPanel}
      </TabsContent>
    </Tabs>
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <LabTopBar
        lab={lab}
        sessionCompleted={sessionCompleted}
        progress={progress}
        currentStep={currentStepNumber}
        totalSteps={lab.steps.length}
        restartOpen={restartOpen}
        onRestartOpenChange={setRestartOpen}
        onComplete={handleComplete}
        onRestart={handleRestart}
      />

      <main className="lab-theme min-h-0 flex-1 bg-background p-3 pt-0 lg:p-4 lg:pt-0">
        {isDesktop ? desktopLayout : mobileLayout}
      </main>
    </div>
  )
}