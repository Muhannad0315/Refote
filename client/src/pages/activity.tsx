import { useQuery } from "@tanstack/react-query";
import { ActivityItem } from "@/components/activity-item";
import { useLocation } from "wouter";
import { ActivityItemSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useI18n } from "@/lib/i18n";
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

  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activity"],
  });

  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="relative">
          <div className="absolute inset-x-0 flex justify-center pointer-events-none">
            <a
              href="/"
              className="pointer-events-auto font-serif text-xl font-bold"
            >
              Cafnote
            </a>
          </div>
          <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h1
                className="font-serif text-xl"
                data-testid="text-activity-title"
              >
                {t("activity.title")}
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <ActivityItemSkeleton key={i} />
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
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
