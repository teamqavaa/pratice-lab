"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

export default function LabWorkspace() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<span />}>Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<span />}>My Labs</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Lab name placeholder</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex shrink-0 items-center gap-2">
          <Badge>Python</Badge>
          <Badge variant="secondary">Data Literacy</Badge>
          <Badge variant="outline">Guided</Badge>
        </div>
      </header>

      <div className="shrink-0 px-4 py-3">
        <Progress value={60}>
          <ProgressLabel>Course progress</ProgressLabel>
          <ProgressValue />
        </Progress>
      </div>

      <main className="min-h-0 flex-1 p-4 pt-0">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize="20" minSize="15" className="min-h-0">
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm font-medium text-muted-foreground">
              Step sidebar
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="80" minSize="40" className="min-h-0">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel
                defaultSize="60"
                minSize="20"
                className="min-h-0"
              >
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm font-medium text-muted-foreground">
                  Editor
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel
                defaultSize="40"
                minSize="15"
                className="min-h-0"
              >
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm font-medium text-muted-foreground">
                  Output panel
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  )
}
