export type StepStatus = "done" | "in_progress" | "locked"

export type SaveStatus = "idle" | "saving" | "saved" | "failed"

export type RunOutput = {
  text: string
  status: "idle" | "running" | "success" | "error"
}