import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function CheckInCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function CafeCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </Card>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div>
      <Skeleton className="h-32 md:h-48 w-full" />
      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-12 mb-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 mt-12" />
        </div>
        <Skeleton className="h-7 w-40 mb-1" />
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-4 w-full max-w-xs" />
        <div className="flex justify-around py-4 border-y border-border mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center space-y-1">
              <Skeleton className="h-5 w-8 mx-auto" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <CheckInCardSkeleton key={i} />
      ))}
    </div>
  );
}
