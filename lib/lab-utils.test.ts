import { describe, expect, it } from "vitest"

import type { StepStatus } from "@/components/lab/lab-types"
import {
  computeProgress,
  getCurrentStepNumber,
  translateRunError,
  type RunError,
} from "./lab-utils"

function runError(kind: RunError["kind"], message: string): RunError {
  return { ok: false, kind, message }
}

describe("translateRunError", () => {
  it("prepends a hint for rate limiting", () => {
    expect(translateRunError(runError("rate_limited", "slow down"))).toBe(
      "Rate limit reached: slow down"
    )
  })

  it("labels validation failures as runtime errors", () => {
    expect(translateRunError(runError("validation", "bad request"))).toBe(
      "Runtime error: bad request"
    )
  })

  it("uses fixed copy for a timeout", () => {
    expect(translateRunError(runError("timeout", "n/a"))).toBe(
      "Execution timed out. Try simplifying your code or check for infinite loops."
    )
  })

  it("uses fixed copy when Piston is down", () => {
    expect(translateRunError(runError("piston_unreachable", "n/a"))).toBe(
      "Code execution service is unavailable. Please try again shortly."
    )
  })

  it("uses fixed copy for network failures", () => {
    expect(translateRunError(runError("network", "n/a"))).toContain(
      "Network error"
    )
  })

  it("passes through unexpected errors", () => {
    expect(translateRunError(runError("unexpected", "boom"))).toBe(
      "Unexpected error: boom"
    )
  })
})

describe("getCurrentStepNumber", () => {
  const steps = [{ id: "a" }, { id: "b" }, { id: "c" }]

  it("returns the 1-based position of the active step", () => {
    expect(getCurrentStepNumber(steps, "b")).toBe(2)
  })

  it("falls back to 1 for an unknown id", () => {
    expect(getCurrentStepNumber(steps, "nope")).toBe(1)
  })

  it("falls back to 1 for an empty list", () => {
    expect(getCurrentStepNumber([], "a")).toBe(1)
  })
})

describe("computeProgress", () => {
  const steps = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }]

  function status(done: string[]): Record<string, StepStatus> {
    const map: Record<string, StepStatus> = {}
    steps.forEach((step) => {
      map[step.id] = done.includes(step.id) ? "done" : "in_progress"
    })
    return map
  }

  it("returns 0 for an empty lab", () => {
    expect(computeProgress([], status([]))).toBe(0)
  })

  it("returns 0 when no step is done", () => {
    expect(computeProgress(steps, status([]))).toBe(0)
  })

  it("fills by the number of done steps", () => {
    expect(computeProgress(steps, status(["a"]))).toBe(20)
    expect(computeProgress(steps, status(["a", "b", "c"]))).toBe(60)
  })

  it("fills fully when every step is done", () => {
    expect(computeProgress(steps, status(["a", "b", "c", "d", "e"]))).toBe(100)
  })
})