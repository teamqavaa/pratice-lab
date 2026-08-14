import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { LabOutput } from "./lab-output"

describe("LabOutput", () => {
  it("shows the idle state before any run", () => {
    render(<LabOutput runOutput={{ text: "Run your code to see logs appear here.", status: "idle" }} />)
    expect(screen.getByText("No output yet")).toBeInTheDocument()
    expect(screen.getByText(/Run your code/)).toBeInTheDocument()
  })

  it("renders a successful run without the error color", () => {
    const { container } = render(<LabOutput runOutput={{ text: "hello world", status: "success" }} />)
    const pre = container.querySelector("pre")
    expect(pre).toHaveTextContent("hello world")
    expect(pre).not.toHaveClass("text-destructive")
  })

  it("marks a failed run with the destructive color", () => {
    const { container } = render(<LabOutput runOutput={{ text: "Traceback", status: "error" }} />)
    const pre = container.querySelector("pre")
    expect(pre).toHaveTextContent("Traceback")
    expect(pre).toHaveClass("text-destructive")
  })
})