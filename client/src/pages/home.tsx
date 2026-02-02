import { useQuery } from "@tanstack/react-query";
import { CheckInCard } from "@/components/check-in-card";
import { FeedSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useI18n } from "@/lib/i18n";
import { Home as HomeIcon } from "lucide-react";
import type { CheckInWithDetails } from "@shared/schema";
// likes removed — queryClient/apiRequest not needed here

export default function Home() {
  const { t, isRTL } = useI18n();

  const { data: checkIns, isLoading } = useQuery<CheckInWithDetails[]>({
    queryKey: ["/api/check-ins"],
  });

  // Likes removed from UI.

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
            <div
              className={
                isRTL
                  ? "order-2 flex items-center gap-2"
                  : "order-1 flex items-center gap-2"
              }
            >
              <HomeIcon className="h-6 w-6 text-primary" />
              <h1 className="font-serif text-lg">{t("nav.home")}</h1>
            </div>
            <div
              className={
                isRTL
                  ? "order-1 flex items-center gap-1"
                  : "order-2 flex items-center gap-1"
              }
            >
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {isLoading ? (
          <FeedSkeleton />
        ) : checkIns && checkIns.length > 0 ? (
          <div className="space-y-4">
            {checkIns.map((checkIn) => (
              <CheckInCard key={checkIn.id} checkIn={checkIn} />
            ))}
          </div>
        ) : (
          <EmptyState type="feed" />
        )}
      </main>
    </div>
  );
}
