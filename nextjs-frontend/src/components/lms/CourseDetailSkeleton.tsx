import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

export function CourseDetailSkeleton() {
  return (
    <main className="min-h-screen">
      <div className="relative min-h-[85vh] flex items-center pt-24 bg-dark">
        <div className="absolute inset-0 bg-linear-to-r from-dark via-dark/95 to-dark/85" />
        <div className="relative z-10 w-full max-w-360 mx-auto px-8 lg:px-16 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-8 space-y-6">
              <Skeleton className="h-3 w-28" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-10 w-1/2" />
              </div>
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-24" />
              <div className="space-y-2 pt-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-3 w-2/3" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 self-start">
              <div className="border border-border bg-muted-light/95 backdrop-blur-md rounded p-8 space-y-5">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-12 w-full" />
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-360 mx-auto px-8 lg:px-16 py-16 space-y-16">
        <div className="space-y-4">
          <Skeleton className="h-7 w-48" />
          <SkeletonText lines={3} />
          <SkeletonText lines={2} />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-7 w-56" />
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
