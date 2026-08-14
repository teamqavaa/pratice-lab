"use client"

import { Lightbulb } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { LabStep } from "@/lib/mock-data"
import type { StepStatus } from "./lab-types"

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

export type LabStepsProps = {
  steps: LabStep[]
  stepStatus: Record<string, StepStatus>
  activeStepId: string
  openStepIds: string[]
  hintsRevealed: Record<string, boolean>
  onStepChange: (stepId: string) => void
  onOpenChange: (value: string[]) => void
  onToggleHint: (stepId: string) => void
  onToggleDone?: (stepId: string) => void
  className?: string
}

export function LabSteps({
  steps,
  stepStatus,
  activeStepId,
  openStepIds,
  hintsRevealed,
  onStepChange,
  onOpenChange,
  onToggleHint,
  onToggleDone,
  className,
}: LabStepsProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border bg-card/50",
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Steps</span>
        <span className="text-xs text-muted-foreground">{steps.length}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <Accordion
          value={openStepIds}
          onValueChange={onOpenChange}
          className="p-1.5"
        >
          {steps.map((step) => {
            const status = stepStatus[step.id]
            const locked = status === "locked"
            return (
              <AccordionItem
                key={step.id}
                value={step.id}
                disabled={locked}
                className={locked ? "opacity-60" : undefined}
              >
                <AccordionTrigger
                  onClick={() => !locked && onStepChange(step.id)}
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
                      className={cn("shrink-0", STATUS_BADGE_CLASS[status])}
                    >
                      {STATUS_LABEL[status]}
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3">
                  <p className="whitespace-pre-line text-muted-foreground">
                    {step.content}
                  </p>
                  {onToggleDone && (
                    <Button
                      size="xs"
                      variant={status === "done" ? "outline" : "default"}
                      className="mt-2"
                      onClick={() => onToggleDone(step.id)}
                    >
                      {status === "done" ? "Undo" : "Mark as done"}
                    </Button>
                  )}
                  {step.hint && (
                    <div className="mt-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => onToggleHint(step.id)}
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
            )
          })}
        </Accordion>
      </ScrollArea>
    </div>
  )
}