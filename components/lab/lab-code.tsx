"use client"

import { FileCode, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CodeEditor from "@/components/lab/code-editor"
import { cn } from "@/lib/utils"
import type { Language } from "@/lib/languages"
import type { SaveStatus } from "./lab-types"

export type LabCodeProps = {
  language: Language
  filename: string
  value: string
  saveStatus: SaveStatus
  isRunning: boolean
  onChange: (value: string) => void
  onRun: () => void
  className?: string
}

export function LabCode({
  language,
  filename,
  value,
  saveStatus,
  isRunning,
  onChange,
  onRun,
  className,
}: LabCodeProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border bg-muted/30",
        className
      )}
    >
      <Tabs defaultValue={filename} className="flex h-full flex-col gap-0">
        <div className="flex shrink-0 items-center justify-between border-b bg-muted/50 pr-2">
<TabsList
              variant="line"
              className="h-9 min-w-0 flex-1 justify-start rounded-none px-1"
            >
            <TabsTrigger value={filename}>
              <FileCode />
              {filename}
            </TabsTrigger>
          </TabsList>
          <div className="flex shrink-0 items-center gap-2">
            {saveStatus === "saving" && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-status-done">Saved</span>
            )}
            {saveStatus === "failed" && (
              <span className="text-xs text-destructive">Save failed</span>
            )}
            <Button size="sm" onClick={onRun} disabled={isRunning}>
              <Play />
              {isRunning ? "Running..." : "Run"}
            </Button>
          </div>
        </div>
        <TabsContent
          value={filename}
          className="flex min-h-0 flex-1 flex-col"
        >
          <CodeEditor
            language={language}
            value={value}
            onChange={onChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}