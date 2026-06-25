import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero card skeleton */}
      <div className="panel p-6 sm:p-10 space-y-4">
        <Skeleton className="h-4 w-24 bg-primary/5" />
        <Skeleton className="h-12 w-2/3 bg-primary/10" />
        <Skeleton className="h-6 w-full bg-primary/5" />
        <Skeleton className="h-6 w-3/4 bg-primary/5" />
        <div className="flex gap-4 pt-4">
          <Skeleton className="h-10 w-32 rounded-full bg-primary/10" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="panel p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <Skeleton className="h-32 w-full rounded-lg bg-primary/15" />
              <Skeleton className="h-6 w-3/4 bg-primary/10" />
              <Skeleton className="h-4 w-full bg-primary/5" />
              <Skeleton className="h-4 w-2/3 bg-primary/5" />
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-border/40">
              <Skeleton className="h-4 w-20 bg-primary/5" />
              <Skeleton className="h-4 w-12 bg-primary/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Category filter pills skeleton */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full bg-primary/5" />
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="panel overflow-hidden flex flex-col h-full border border-border/60">
            <Skeleton className="h-44 w-full bg-primary/10" />
            <div className="p-5 flex-grow space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-5/6 bg-primary/10" />
                <Skeleton className="h-4 w-full bg-primary/5" />
                <Skeleton className="h-4 w-2/3 bg-primary/5" />
              </div>
              <div className="pt-4 border-t border-border/40 flex justify-between items-center mt-4">
                <Skeleton className="h-4 w-24 bg-primary/5" />
                <Skeleton className="h-4 w-12 bg-primary/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="panel overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-border/60 flex justify-between items-center">
        <Skeleton className="h-6 w-40 bg-primary/10" />
        <Skeleton className="h-8 w-24 bg-primary/5" />
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="h-10 w-10 rounded-full bg-primary/10 shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <Skeleton className="h-4 w-1/3 bg-primary/10" />
                <Skeleton className="h-3 w-1/4 bg-primary/5" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <Skeleton className="h-4 w-16 bg-primary/5 hidden sm:block" />
              <Skeleton className="h-6 w-20 rounded bg-primary/15" />
              <Skeleton className="h-8 w-8 rounded bg-primary/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContentDetailSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="panel p-5 sm:p-8 space-y-4">
        <Skeleton className="h-4 w-20 bg-primary/5" />
        <Skeleton className="h-10 w-3/4 bg-primary/10" />
        <div className="flex gap-4 items-center">
          <Skeleton className="h-8 w-8 rounded-full bg-primary/5" />
          <Skeleton className="h-4 w-28 bg-primary/5" />
          <Skeleton className="h-4 w-20 bg-primary/5" />
        </div>
      </div>
      
      <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
        <div className="panel p-6 space-y-4">
          <Skeleton className="h-64 w-full rounded-lg bg-primary/10" />
          <Skeleton className="h-4 w-full bg-primary/5" />
          <Skeleton className="h-4 w-full bg-primary/5" />
          <Skeleton className="h-4 w-5/6 bg-primary/5" />
          <Skeleton className="h-4 w-full bg-primary/5" />
          <Skeleton className="h-4 w-3/4 bg-primary/5" />
        </div>
        <div className="space-y-5">
          <div className="panel p-5 space-y-3">
            <Skeleton className="h-5 w-24 bg-primary/10" />
            <div className="divide-y divide-border/60">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="py-3 space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-primary/10" />
                  <Skeleton className="h-3 w-1/3 bg-primary/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="panel p-6 space-y-6">
        <div className="border-b border-border/60 pb-4">
          <Skeleton className="h-6 w-48 bg-primary/10" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28 bg-primary/5" />
              <Skeleton className="h-10 w-full bg-primary/10" />
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-4">
          <Skeleton className="h-10 w-32 bg-primary/10" />
        </div>
      </div>
    </div>
  );
}

export function AdminOverviewSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="dash-admin-kpi-grid">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="dash-admin-kpi">
            <Skeleton className="h-4 w-4 bg-white/5" />
            <Skeleton className="h-2.5 w-24 bg-white/5" />
            <Skeleton className="h-8 w-16 bg-white/5" />
            <Skeleton className="h-3 w-32 bg-white/5" />
            <Skeleton className="h-7 w-full bg-white/5" />
          </div>
        ))}
      </div>

      <div className="dash-card dash-card--hero p-6 space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 bg-white/5" />
            <Skeleton className="h-10 w-36 bg-white/10" />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-12 bg-white/5" />
            ))}
          </div>
        </div>
        <Skeleton className="h-44 w-full bg-white/10" />
      </div>
    </div>
  );
}
