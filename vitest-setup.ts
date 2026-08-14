import { afterEach, beforeAll } from "vitest"
import "@testing-library/jest-dom/vitest"

// Base UI measures layout in jsdom; stub the browser-only APIs it polls.
beforeAll(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false }))
  globalThis.ResizeObserver =
    globalThis.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  // ScrollArea polls element animations on a timer; jsdom has none.
  if (!Element.prototype.getAnimations) {
    Object.defineProperty(Element.prototype, "getAnimations", {
      configurable: true,
      value: () => [],
    })
  }
})

afterEach(() => {
  document.body.innerHTML = ""
  window.localStorage.clear()
})