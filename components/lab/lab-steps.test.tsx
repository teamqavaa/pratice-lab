import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { LabStep } from "@/lib/mock-data"
import { LabSteps } from "./lab-steps"
import type { StepStatus } from "./lab-types"

const steps: LabStep[] = [
  { id: "s1", order: 1, title: "Create the list", content: "Build a list.", hint: null },
  { id: "s2", order: 2, title: "Loop it", content: "Loop over it.", hint: "Use a for loop." },
  { id: "s3", order: 3, title: "Find the max", content: "Scan it.", hint: "Track a running max." },
]

const status: Record<string, StepStatus> = {
  s1: "done",
  s2: "in_progress",
  s3: "locked",
}

function renderSteps(overrides: Partial<Parameters<typeof LabSteps>[0]> = {}) {
  const onStepChange = vi.fn()
  const onOpenChange = vi.fn()
  const onToggleHint = vi.fn()
  const onToggleDone = vi.fn()
  render(
    <LabSteps
      steps={steps}
      stepStatus={status}
      activeStepId="s2"
      openStepIds={["s2"]}
      hintsRevealed={{ s2: false }}
      onStepChange={onStepChange}
      onOpenChange={onOpenChange}
      onToggleHint={onToggleHint}
      onToggleDone={onToggleDone}
      {...overrides}
    />
  )
  return { onStepChange, onOpenChange, onToggleHint, onToggleDone }
}

describe("LabSteps", () => {
  it("shows the status label for each step", () => {
    renderSteps()
    expect(screen.getByText("Done")).toBeInTheDocument()
    expect(screen.getByText("In Progress")).toBeInTheDocument()
    expect(screen.getByText("Locked")).toBeInTheDocument()
  })

  it("disables the locked step trigger", () => {
    renderSteps()
    expect(
      screen.getByRole("button", { name: /Find the max/ })
    ).toHaveAttribute("aria-disabled", "true")
  })

  it("keeps unlocked triggers interactive", () => {
    renderSteps()
    expect(screen.getByRole("button", { name: /Create the list/ })).toBeEnabled()
  })

  it("marks a step done through the toggle", async () => {
    const user = userEvent.setup()
    const { onToggleDone } = renderSteps()
    await user.click(screen.getByRole("button", { name: "Mark as done" }))
    expect(onToggleDone).toHaveBeenCalledWith("s2")
  })

  it("reveals a hint through its button", async () => {
    const user = userEvent.setup()
    const { onToggleHint } = renderSteps()
    await user.click(screen.getByRole("button", { name: /Show hint/ }))
    expect(onToggleHint).toHaveBeenCalledWith("s2")
  })
})