import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { mockLabs } from "@/lib/mock-data"

const {
  saveLabSession,
  executeLab,
  getLabSession,
  sendLabHeartbeat,
  completeLab,
  uncompleteLab,
  resetLabSession,
} = vi.hoisted(() => ({
  saveLabSession: vi.fn(),
  executeLab: vi.fn(),
  getLabSession: vi.fn(),
  sendLabHeartbeat: vi.fn(),
  completeLab: vi.fn(),
  uncompleteLab: vi.fn(),
  resetLabSession: vi.fn(),
}))

vi.mock("@/lib/actions/lab-sessions", () => ({
  saveLabSession,
  executeLab,
  getLabSession,
  sendLabHeartbeat,
  completeLab,
  uncompleteLab,
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
  uncompleteLab.mockReset().mockResolvedValue({ ok: true })
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
  async function completeEveryStep(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("tab", { name: /Steps/ }))
    const titles = mockLabs[0].steps.map((step) => step.title)
    for (let i = 0; i < titles.length; i++) {
      if (i > 0) {
        await user.click(
          screen.getByRole("button", { name: new RegExp(titles[i]) })
        )
      }
      await user.click(screen.getByRole("button", { name: "Mark as done" }))
    }
  }

  it("auto-completes when the last step is marked done", async () => {
    const user = userEvent.setup()
    await renderWorkspace()

    await completeEveryStep(user)

    await waitFor(() =>
      expect(completeLab).toHaveBeenCalledWith(mockLabs[0].id)
    )
    expect(
      screen.getByRole("button", { name: /Completed/ })
    ).toBeDisabled()
  })

  it("re-enables the complete button after a done step is undone", async () => {
    const user = userEvent.setup()
    await renderWorkspace()

    await completeEveryStep(user)
    await waitFor(() => expect(completeLab).toHaveBeenCalled())

    await user.click(screen.getAllByRole("button", { name: "Undo" })[0])

    await waitFor(() =>
      expect(uncompleteLab).toHaveBeenCalledWith(mockLabs[0].id)
    )
    expect(
      screen.getByRole("button", { name: "Mark as Complete" })
    ).toBeEnabled()
  })
})

describe("LabWorkspace step order", () => {
  it("re-locks the following step when a done step is undone", async () => {
    const user = userEvent.setup()
    await renderWorkspace()

    await user.click(screen.getByRole("tab", { name: /Steps/ }))

    const secondTrigger = screen.getByRole("button", {
      name: /Index and slice/,
    })
    expect(secondTrigger).toHaveAttribute("aria-disabled", "true")

    await user.click(screen.getByRole("button", { name: "Mark as done" }))
    expect(secondTrigger).toHaveAttribute("aria-disabled", "false")

    await user.click(screen.getByRole("button", { name: "Undo" }))
    expect(secondTrigger).toHaveAttribute("aria-disabled", "true")
  })
})

describe("LabWorkspace per-step code", () => {
  async function openStep(user: ReturnType<typeof userEvent.setup>, stepTitle: RegExp) {
    await user.click(screen.getByRole("button", { name: stepTitle }))
  }

  it("loads the starter code of the step that becomes active", async () => {
    const user = userEvent.setup()
    await renderWorkspace()

    expect(screen.getByLabelText("editor")).toHaveValue(
      mockLabs[0].steps[0].starterCode
    )

    await user.click(screen.getByRole("tab", { name: /Steps/ }))
    await user.click(screen.getByRole("button", { name: "Mark as done" }))
    await openStep(user, /Index and slice/)

    await user.click(screen.getByRole("tab", { name: /Editor/ }))
    expect(screen.getByLabelText("editor")).toHaveValue(
      mockLabs[0].steps[1].starterCode
    )
  })

  it("keeps each step's edits when the student switches away and back", async () => {
    const user = userEvent.setup()
    await renderWorkspace()

    await user.click(screen.getByRole("tab", { name: /Steps/ }))
    await user.click(screen.getByRole("button", { name: "Mark as done" }))
    await openStep(user, /Index and slice/)

    await user.click(screen.getByRole("tab", { name: /Editor/ }))
    const step2Code = "print('step2 edited')"
    fireEvent.change(screen.getByLabelText("editor"), {
      target: { value: step2Code },
    })

    await user.click(screen.getByRole("tab", { name: /Steps/ }))
    await openStep(user, /Create your first list/)
    await user.click(screen.getByRole("tab", { name: /Editor/ }))
    expect(screen.getByLabelText("editor")).toHaveValue(
      mockLabs[0].steps[0].starterCode
    )

    await user.click(screen.getByRole("tab", { name: /Steps/ }))
    await openStep(user, /Index and slice/)
    await user.click(screen.getByRole("tab", { name: /Editor/ }))
    expect(screen.getByLabelText("editor")).toHaveValue(step2Code)
  })

  it("returns to the first step's starter code after a restart", async () => {
    const user = userEvent.setup()
    await renderWorkspace()

    fireEvent.change(screen.getByLabelText("editor"), {
      target: { value: "print(123)" },
    })

    await user.click(screen.getByRole("button", { name: /Restart lab/ }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Restart lab" }))
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )

    expect(screen.getByLabelText("editor")).toHaveValue(
      mockLabs[0].steps[0].starterCode
    )
  })
})