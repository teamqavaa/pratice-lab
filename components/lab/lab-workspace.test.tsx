import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { mockLabs } from "@/lib/mock-data"

const {
  saveLabSession,
  executeLab,
  getLabSession,
  sendLabHeartbeat,
  completeLab,
  resetLabSession,
} = vi.hoisted(() => ({
  saveLabSession: vi.fn(),
  executeLab: vi.fn(),
  getLabSession: vi.fn(),
  sendLabHeartbeat: vi.fn(),
  completeLab: vi.fn(),
  resetLabSession: vi.fn(),
}))

vi.mock("@/lib/actions/lab-sessions", () => ({
  saveLabSession,
  executeLab,
  getLabSession,
  sendLabHeartbeat,
  completeLab,
  resetLabSession,
}))

vi.mock("@/components/lab/code-editor", () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string
    onChange: (value: string) => void
  }) => (
    <textarea
      aria-label="editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}))

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mobile layout keeps the DOM small and skips the resizable-panel setup.
vi.mock("@/lib/use-media-query", () => ({
  useMediaQuery: () => false,
}))

import LabWorkspace from "./lab-workspace"

const SAVE_DEBOUNCE_MS = 1000

beforeEach(() => {
  saveLabSession.mockReset().mockResolvedValue({
    ok: true,
    status: "in_progress",
    lastActiveAt: "",
  })
  executeLab.mockReset().mockResolvedValue({
    ok: true,
    stdout: "",
    stderr: "",
    exitCode: 0,
  })
  getLabSession.mockReset().mockResolvedValue({
    ok: true,
    currentCode: null,
    status: "in_progress",
    lastActiveAt: null,
  })
  sendLabHeartbeat.mockReset().mockResolvedValue({ ok: true })
  completeLab.mockReset().mockResolvedValue({ ok: true })
  resetLabSession.mockReset().mockResolvedValue({ ok: true })
})

async function renderWorkspace() {
  render(<LabWorkspace lab={mockLabs[0]} />)
  await act(async () => {})
}

describe("LabWorkspace autosave", () => {
  it("debounces edits into a single save after the idle window", async () => {
    vi.useFakeTimers()
    try {
      await renderWorkspace()
      fireEvent.change(screen.getByLabelText("editor"), {
        target: { value: "print(1)" },
      })
      expect(saveLabSession).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS)

      expect(saveLabSession).toHaveBeenCalledTimes(1)
      expect(saveLabSession).toHaveBeenCalledWith(
        mockLabs[0].id,
        expect.stringContaining("print(1)")
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it("flushes pending edits when the workspace unmounts", async () => {
    const { unmount } = render(
      <LabWorkspace lab={mockLabs[0]} />
    )
    await act(async () => {})

    fireEvent.change(screen.getByLabelText("editor"), {
      target: { value: "print(2)" },
    })
    expect(saveLabSession).not.toHaveBeenCalled()

    unmount()

    expect(saveLabSession).toHaveBeenCalledTimes(1)
    expect(saveLabSession).toHaveBeenCalledWith(
      mockLabs[0].id,
      expect.stringContaining("print(2)")
    )
  })
})

describe("LabWorkspace completion", () => {
  it("blocks completion until the student runs the code", async () => {
    await renderWorkspace()

    const completeButton = screen.getByRole("button", {
      name: "Mark as Complete",
    })
    expect(completeButton).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: /^Run$/ }))

    await waitFor(() => expect(completeButton).toBeEnabled())
    expect(executeLab).toHaveBeenCalled()
  })
})