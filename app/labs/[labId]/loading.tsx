// Skeleton while the lab payload streams in; the real top bar and panels
// replace it once getLab resolves.
export default function LabLoading() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <div className="border-b px-3 pt-1.5 pb-1.5 lg:px-4">
        <div className="h-5 w-64 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-1.5 lg:px-4">
        <div className="flex gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded-4xl bg-muted" />
          <div className="h-5 w-24 animate-pulse rounded-4xl bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded-4xl bg-muted" />
        </div>
        <div className="h-5 w-36 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="lab-theme grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[1fr_2fr] lg:p-4">
        <div className="animate-pulse rounded-lg border bg-muted/30" />
        <div className="grid min-h-0 grid-rows-2 gap-3">
          <div className="animate-pulse rounded-lg border bg-muted/30" />
          <div className="animate-pulse rounded-lg border bg-muted/30" />
        </div>
      </div>
    </div>
  )
}