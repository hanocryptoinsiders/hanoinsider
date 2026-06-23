import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="panel p-5 sm:p-8 space-y-4">
        <Skeleton className="h-4 w-20 bg-primary/5" />
        <Skeleton className="h-10 w-2/3 bg-primary/10" />
      </div>
      
      <div className="grid lg:grid-cols-[260px_1fr] gap-5">
        {/* Left Side: Coin List */}
        <div className="panel p-3 space-y-2 h-fit">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-8 w-8 rounded-full bg-primary/10" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4 bg-primary/10" />
                <Skeleton className="h-3 w-1/2 bg-primary/5" />
              </div>
            </div>
          ))}
        </div>

        {/* Right Side: Main Chart Area */}
        <div className="panel p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32 bg-primary/10" />
              <Skeleton className="h-3 w-16 bg-primary/5" />
            </div>
            <Skeleton className="h-8 w-40 bg-primary/5" />
          </div>
          <Skeleton className="h-12 w-48 bg-primary/10" />
          <Skeleton className="h-80 w-full rounded-lg bg-primary/10" />
        </div>
      </div>
    </div>
  );
}
