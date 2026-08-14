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
import { getCurrentStepNumber, getStepProgress, translateRunError } from "@/lib/lab-utils"
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

type StoredProgress = {
  stepStatus: Record<string, StepStatus>
  hintsRevealed: Record<string, boolean>
  openStepIds: string[]
}

export default function LabWorkspace({ lab }: { lab: Lab }) {
  const language = lab.language
  const config = LANGUAGE_CONFIG[language]
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const progressStorageKey = `lab:${lab.id}:progress`

  const [activeStepId, setActiveStepId] = useState(lab.steps[0]?.id ?? "")
  const [openStepIds, setOpenStepIds] = useState<string[]>([lab.steps[0]?.id ?? ""])
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
  const [hasRun, setHasRun] = useState(false)
  const [runOutput, setRunOutput] = useState<RunOutput>({
    text: "Run your code to see logs appear here.",
    status: "idle",
  })

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const codeRef = useRef(code)

  useEffect(() => {
    codeRef.current = code
  }, [code])

  const readStoredProgress = (): StoredProgress | null => {
    if (typeof window === "undefined") return null
    try {
      const raw = window.localStorage.getItem(progressStorageKey)
      return raw ? (JSON.parse(raw) as StoredProgress) : null
    } catch {
      return null
    }
  }

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

  const flushSave = async () => {
    // Only send when a debounce is pending; a plain reload has nothing new.
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
      await triggerSave(codeRef.current)
    }
  }

  // Session load + local progress restore
  useEffect(() => {
    async function initSession() {
      const result = await getLabSession(lab.id)
      if (!result.ok) return
      if (result.currentCode) setCode(result.currentCode)
      if (result.status === "completed") {
        setSessionCompleted(true)
        setStepStatus(
          Object.fromEntries(lab.steps.map((step) => [step.id, "done"]))
        )
      } else {
        // Reloads kept earlier progress client-side; a completed session
        // takes precedence and overrides everything to done.
        const stored = readStoredProgress()
        if (stored) {
          setStepStatus((prev) => ({ ...prev, ...stored.stepStatus }))
          setHintsRevealed((prev) => ({ ...prev, ...stored.hintsRevealed }))
          if (stored.openStepIds.length > 0) setOpenStepIds(stored.openStepIds)
        }
      }
    }
    initSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lab.id])

  // Persist step progress every time it changes so a refresh keeps it.
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const payload: StoredProgress = { stepStatus, hintsRevealed, openStepIds }
      window.localStorage.setItem(progressStorageKey, JSON.stringify(payload))
    } catch {
      // Storage can throw in private mode; the in-memory state still works.
    }
  }, [stepStatus, hintsRevealed, openStepIds, progressStorageKey])

  // Heartbeat
  useEffect(() => {
    // Keep the backend session alive so last_active_at stays fresh while the
    // student is working; stops on unmount to avoid orphan intervals.
    const interval = setInterval(() => {
      sendLabHeartbeat(lab.id)
    }, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [lab.id])

  // Save pending edits when the tab hides or the component unmounts; the
  // debounce alone loses the final keystrokes if the student leaves within
  // the save window.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushSave()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      flushSave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    // Debounce autosave: firing on every keystroke would spam the backend.
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      triggerSave(newCode)
      saveTimeoutRef.current = null
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
      setRunOutput({ text: translateRunError(result), status: "error" })
    }

    setHasRun(true)
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
    setHasRun(false)
    setRestartOpen(false)

    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(progressStorageKey)
      } catch {
        // Ignore; storage errors do not block a restart.
      }
    }

    await resetLabSession(lab.id)
  }

  const toggleHint = (stepId: string) => {
    setHintsRevealed((prev) => ({ ...prev, [stepId]: !prev[stepId] }))
  }

  const toggleStepDone = (stepId: string) => {
    setStepStatus((prev) => {
      const next = { ...prev }
      const index = lab.steps.findIndex((step) => step.id === stepId)
      if (prev[stepId] === "done") {
        next[stepId] = "in_progress"
        return next
      }
      // Completing a step unlocks the following one so order stays enforced.
      next[stepId] = "done"
      const following = lab.steps[index + 1]
      if (following && prev[following.id] === "locked") {
        next[following.id] = "in_progress"
      }
      return next
    })
  }

  const handleOpenChange = (value: string[]) => {
    setOpenStepIds(value)
  }

  const handleStepChange = (stepId: string) => {
    setActiveStepId(stepId)
  }

  const currentStepNumber = getCurrentStepNumber(lab.steps, activeStepId)
  const progress = getStepProgress(currentStepNumber, lab.steps.length)

  // A lab without objectives cannot render a step list; show a clear message
  // instead of crashing on the missing first step.
  if (lab.steps.length === 0) {
    return (
      <div className="lab-theme flex h-dvh items-center justify-center bg-background text-center">
        <div>
          <p className="text-sm font-medium text-foreground">This lab has no steps.</p>
          <p className="text-sm text-muted-foreground">
            Add objectives in the backend to enable it.
          </p>
        </div>
      </div>
    )
  }

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
      onToggleDone={toggleStepDone}
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
        canComplete={hasRun}
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