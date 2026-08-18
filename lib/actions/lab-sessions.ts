"use server"

import { cookies } from "next/headers"

import type { Lab, LabStep } from "@/lib/mock-data"
import type { Language } from "@/lib/languages"

// Override with DJANGO_BASE_URL for non-local backends (see .env.example).
const DJANGO_BASE = process.env.DJANGO_BASE_URL ?? "http://localhost:8000"

type ApiObjective = {
  id: string
  order: number
  title: string
  content: string
  hint: string | null
  starter_code: string | null
}

type ApiLab = {
  id: string
  title: string
  description: string | null
  language: Language
  status: string
  created_at: string
  objectives: ApiObjective[]
}

function toLab(apiLab: ApiLab): Lab {
  const steps: LabStep[] = apiLab.objectives
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((objective) => ({
      id: objective.id,
      order: objective.order,
      title: objective.title,
      content: objective.content,
      hint: objective.hint,
      // Empty string from the backend means no starter; normalize to null so
      // the editor renders blank instead of a comment-only buffer.
      starterCode: objective.starter_code || null,
    }))

  return {
    id: apiLab.id,
    title: apiLab.title,
    language: apiLab.language,
    // Backend has no category/difficulty fields; keep the UI shape stable so
    // consumers never depend on the API payload.
    category: "Practice Lab",
    difficulty: "guided",
    steps,
  }
}

export type GetLabSessionResult =
  | { ok: true; currentCode: string | null; status: string; lastActiveAt: string | null }
  | { ok: false; message: string }

export type SaveLabSessionResult =
  | { ok: true; status: string; lastActiveAt: string }
  | { ok: false; message: string }

// Mirror the token relay in lib/api.ts: read the JWT access_token cookie
// server-side and send it as a Bearer header to Django.
async function authHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies()
  const token = cookieStore.get("access_token")?.value
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// On a 401, exchange the refresh_token cookie for a fresh access token and
// retry once — same flow as the client-side djangoFetch helper.
async function djangoFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${DJANGO_BASE}${path}`, {
    ...options,
    headers: { ...(await authHeaders()), ...(options.headers ?? {}) },
  })

  if (res.status !== 401) return res

  const cookieStore = await cookies()
  const refreshToken = cookieStore.get("refresh_token")?.value
  if (!refreshToken) return res

  const refreshRes = await fetch(`${DJANGO_BASE}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  })
  if (!refreshRes.ok) return res

  const data = await refreshRes.json()
  cookieStore.set("access_token", data.access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })

  return fetch(`${DJANGO_BASE}${path}`, {
    ...options,
    headers: { ...(await authHeaders()), ...(options.headers ?? {}) },
  })
}

export async function getLabSession(labId: string): Promise<GetLabSessionResult> {
  try {
    const res = await djangoFetch(`/api/sessions/${labId}/`, { cache: "no-store" })
    if (!res.ok) {
      return { ok: false, message: `Session load failed (status ${res.status})` }
    }
    const data = await res.json()
    return {
      ok: true,
      currentCode: data.current_code ?? null,
      status: data.status,
      lastActiveAt: data.last_active_at ?? null,
    }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function saveLabSession(
  labId: string,
  currentCode: string,
  completedSteps?: number
): Promise<SaveLabSessionResult> {
  try {
    const res = await djangoFetch(`/api/sessions/${labId}/`, {
      method: "POST",
      body: JSON.stringify({ current_code: currentCode, completed_steps: completedSteps }),
    })
    if (!res.ok) {
      return { ok: false, message: `Save failed (status ${res.status})` }
    }
    const data = await res.json()
    return { ok: true, status: data.status, lastActiveAt: data.last_active_at }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function sendLabHeartbeat(labId: string): Promise<{ ok: boolean }> {
  try {
    const res = await djangoFetch(`/api/sessions/${labId}/heartbeat/`, { method: "POST" })
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}

export type GetLabResult =
  | { ok: true; lab: Lab }
  | { ok: false; status: number; message: string }

export async function getLab(labId: string): Promise<GetLabResult> {
  try {
    // Public endpoint, but reusing djangoFetch keeps auth consistent.
    const res = await djangoFetch(`/api/labs/${labId}/`, { cache: "no-store" })
    if (!res.ok) {
      return { ok: false, status: res.status, message: `Lab load failed (status ${res.status})` }
    }
    const apiLab: ApiLab = await res.json()
    return { ok: true, lab: toLab(apiLab) }
  } catch (err) {
    return { ok: false, status: 0, message: err instanceof Error ? err.message : "Unknown error" }
  }
}

export type GetLabsResult =
  | { ok: true; labs: Lab[] }
  | { ok: false; message: string }

export async function getLabs(): Promise<GetLabsResult> {
  try {
    const res = await djangoFetch(`/api/labs/`, { cache: "no-store" })
    if (!res.ok) {
      return { ok: false, message: `Lab list failed (status ${res.status})` }
    }
    const apiLabs: ApiLab[] = await res.json()
    return { ok: true, labs: apiLabs.map(toLab) }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" }
  }
}

export type ExecuteLabParams = {
  language: Language
  version: string
  filename: string
  code: string
}

export type ExecuteLabResult =
  | { ok: true; stdout: string; stderr: string; exitCode: number | null }
  | { ok: false; kind: "rate_limited"; message: string }
  | { ok: false; kind: "validation"; message: string }
  | { ok: false; kind: "timeout"; message: string }
  | { ok: false; kind: "piston_unreachable"; message: string }
  | { ok: false; kind: "network"; message: string }
  | { ok: false; kind: "unexpected"; message: string }

export async function executeLab(params: ExecuteLabParams): Promise<ExecuteLabResult> {
  let res: Response
  try {
    res = await djangoFetch("/api/execute/", {
      method: "POST",
      body: JSON.stringify(params),
    })
  } catch (err) {
    return {
      ok: false,
      kind: "network",
      message: err instanceof Error ? err.message : "Network request failed",
    }
  }

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}))
    return {
      ok: false,
      kind: "rate_limited",
      message: data.error || "Rate limit exceeded. Please wait before running again.",
    }
  }

  if (res.status === 400) {
    const data = await res.json().catch(() => ({}))
    return {
      ok: false,
      kind: "validation",
      message: data.error || "Invalid request — check language, version, filename, and code.",
    }
  }

  if (res.status === 504) {
    return { ok: false, kind: "timeout", message: "Execution timed out." }
  }

  if (res.status === 502) {
    const data = await res.json().catch(() => ({}))
    return {
      ok: false,
      kind: "piston_unreachable",
      message: data.error || "Could not reach the code execution service.",
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    return { ok: false, kind: "unexpected", message: `Status ${res.status}: ${text}` }
  }

  const data = await res.json().catch(() => null)
  if (!data || !data.run) {
    return { ok: false, kind: "unexpected", message: "Unexpected response format from execution API." }
  }

  return {
    ok: true,
    stdout: data.run.stdout || "",
    stderr: data.run.stderr || "",
    exitCode: data.run.code ?? null,
  }
}

export type CompleteLabResult =
  | { ok: true }
  | { ok: false; message: string }

export async function completeLab(labId: string): Promise<CompleteLabResult> {
  try {
    const res = await djangoFetch(`/api/sessions/${labId}/complete/`, { method: "POST" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, message: data.error || `Complete failed (status ${res.status})` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function uncompleteLab(labId: string): Promise<CompleteLabResult> {
  try {
    const res = await djangoFetch(`/api/sessions/${labId}/uncomplete/`, { method: "POST" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, message: data.error || `Uncomplete failed (status ${res.status})` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" }
  }
}

export type ResetLabSessionResult = { ok: true } | { ok: false; message: string }

export async function resetLabSession(labId: string): Promise<ResetLabSessionResult> {
  try {
    const res = await djangoFetch(`/api/sessions/${labId}/reset/`, { method: "POST" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, message: data.error || `Reset failed (status ${res.status})` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" }
  }
}
