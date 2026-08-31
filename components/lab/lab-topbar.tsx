"use client"

import Link from "next/link"
import { ArrowLeft, Check, RotateCcw } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Progress, ProgressLabel } from "@/components/ui/progress"
import type { Lab } from "@/lib/mock-data"

const LANGUAGE_LABEL: Record<Lab["language"], string> = {
  python: "Python",
  php: "PHP",
  typescript: "TypeScript",
}

export type LabTopBarProps = {
  lab: Lab
  sessionCompleted: boolean
  canComplete: boolean
  progress: number
  currentStep: number
  totalSteps: number
  restartOpen: boolean
  onRestartOpenChange: (open: boolean) => void
  onComplete: () => void
  onRestart: () => void
}

// The light chrome above the dark workspace. It inherits the app's default
// (white) theme so it reads as the same header used across the Dashboard.
export function LabTopBar({
  lab,
  sessionCompleted,
  canComplete,
  progress,
  currentStep,
  totalSteps,
  restartOpen,
  onRestartOpenChange,
  onComplete,
  onRestart,
}: LabTopBarProps) {
  return (
    <div className="lab-topbar shrink-0">
      <header className="border-b">
        <div className="flex items-center justify-between gap-2 px-3 pt-1.5 lg:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/labs"
              className="flex min-w-0 items-center gap-1 text-sm font-medium text-foreground/70 lg:hidden"
            >
              <ArrowLeft className="size-4 shrink-0" />
              <span className="truncate">{lab.title}</span>
            </Link>
            <Breadcrumb className="hidden lg:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <span>Home</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
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
          </div>
          <div className="flex shrink-0 items-center gap-1.5 lg:gap-2 flex-wrap">
            {sessionCompleted && <Badge variant="secondary">Completed</Badge>}
            <AlertDialog open={restartOpen} onOpenChange={onRestartOpenChange}>
              <AlertDialogTrigger
                render={
                  <Button size="sm" variant="outline">
                    <RotateCcw />
                    <span className="hidden sm:inline">Restart lab</span>
                    <span className="sr-only sm:hidden">Restart lab</span>
                  </Button>
                }
              />
              <AlertDialogContent className="lab-theme-surface">
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
                  <Button variant="destructive" onClick={onRestart}>
                    Restart lab
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          <Button
            size="sm"
            variant={sessionCompleted ? "outline" : "default"}
            disabled={sessionCompleted || !canComplete}
            onClick={onComplete}
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
        </div>

        <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-1.5 lg:px-4">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {LANGUAGE_LABEL[lab.language]}
            </Badge>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {lab.difficulty}
            </Badge>
          </div>
          <Progress value={progress} className="w-36 shrink-0 items-center">
            <ProgressLabel>
              Step {currentStep} of {totalSteps}
            </ProgressLabel>
          </Progress>
        </div>
      </header>
    </div>
  )
}
