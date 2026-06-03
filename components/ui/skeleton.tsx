import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-card/50",
        className
      )}
    />
  );
}

export function TrackCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function TrackRowSkeleton() {
  return (
    <div className="glass-card flex items-center gap-4 rounded-2xl p-4">
      <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="text-right space-y-1">
        <Skeleton className="h-4 w-20 ml-auto" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
    </div>
  );
}

export function TrackDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-full rounded-xl" />
            <Skeleton className="h-5 w-full rounded-xl" />
            <Skeleton className="h-5 w-3/4 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
