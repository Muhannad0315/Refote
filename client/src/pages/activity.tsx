import { useQuery } from "@tanstack/react-query";
import { ActivityItem } from "@/components/activity-item";
import { useLocation } from "wouter";
import { ActivityItemSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import TopHeader from "@/components/top-header";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

interface Activity {
  id: string;
  type: "like" | "follow" | "checkin";
  user: {
    displayName: string;
    avatarUrl?: string;
  };
  target?: string;
  timestamp: string;
}

export default function Activity() {
  const { t, isRTL } = useI18n();

  const {
    data: activities,
    isLoading,
    error: activitiesError,
    refetch: refetchActivities,
  } = useQuery<Activity[]>({
    queryKey: ["/api/activity"],
  });

  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <TopHeader
        title={t("activity.title")}
        leftIcon={<Bell className="h-5 w-5 text-primary" />}
      />

      <main className="max-w-2xl mx-auto">
        {/* Service unavailable error state */}
        {activitiesError && (
          <div className="m-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-900 dark:text-amber-100 mb-3">
              We're having trouble connecting right now. Please check your
              internet connection or try again in a moment.
            </p>
            <Button
              onClick={() => refetchActivities()}
              className="w-full"
              size="sm"
            >
              Retry
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <ActivityItemSkeleton key={i} />
            ))}
          </div>
        ) : !activitiesError && activities && activities.length > 0 ? (
          <div className="divide-y divide-border">
            {activities
              .filter((a) => (a.type as string) !== "badge")
              .map((activity) => (
                <ActivityItem
                  key={activity.id}
                  type={activity.type}
                  user={activity.user}
                  target={activity.target}
                  timestamp={new Date(activity.timestamp)}
                  onClick={() => {
                    const u = activity.user as any;
                    if (u && u.username) setLocation(`/users/${u.username}`);
                  }}
                />
              ))}
          </div>
        ) : (
          <EmptyState type="activity" />
        )}
      </main>
    </div>
  );
}
