"use client"

import { useEffect, useState } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // SSR renders the desktop branch first; this effect syncs after hydration.
    const mediaQuery = window.matchMedia(query)
    const onChange = () => setMatches(mediaQuery.matches)

    onChange()
    mediaQuery.addEventListener("change", onChange)
    return () => mediaQuery.removeEventListener("change", onChange)
  }, [query])

  return matches
}
