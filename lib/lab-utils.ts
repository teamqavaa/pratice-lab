import type { ExecuteLabResult } from "@/lib/actions/lab-sessions"

export type RunError = Extract<ExecuteLabResult, { ok: false }>

// Map the typed error kinds to student-facing copy. Raw status codes mean
// nothing to a learner, so each diagnostic gets a human-readable message.
export function translateRunError(result: RunError): string {
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
  return message
}

// 1-based position of the active step. Falls back to the first step so an
// unknown id still yields a sane label instead of "Step 0".
export function getCurrentStepNumber(steps: { id: string }[], activeStepId: string): number {
  const index = steps.findIndex((step) => step.id === activeStepId)
  return index === -1 ? 1 : index + 1
}

// Bar fill tracks the active step position so it matches the "Step N of M"
// label; completed steps stay visible in their badges.
export function getStepProgress(currentStepNumber: number, totalSteps: number): number {
  if (totalSteps === 0) return 0
  const position = Math.max(1, Math.min(currentStepNumber, totalSteps))
  return Math.round(((position - 1) / totalSteps) * 100)
}