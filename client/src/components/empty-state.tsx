import { Coffee, Search, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";

interface EmptyStateProps {
  type: "feed" | "search" | "activity" | "profile" | "custom";
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}

const defaultConfigs = {
  feed: {
    icon: <Coffee className="h-12 w-12" />,
    title: "Your feed is empty",
    description:
      "Start by checking in your first drink or follow other coffee lovers!",
    actionLabel: "Check In Now",
    actionHref: "/check-in",
  },
  search: {
    icon: <Search className="h-12 w-12" />,
    title: "No results found",
    description:
      "Try adjusting your search or filters to find what you're looking for.",
    actionLabel: undefined,
    actionHref: undefined,
  },
  activity: {
    icon: <Bell className="h-12 w-12" />,
    title: "No activity yet",
    description:
      "When people interact with your check-ins, you'll see it here.",
    actionLabel: "Explore Cafés",
    actionHref: "/discover",
  },
  profile: {
    icon: <User className="h-12 w-12" />,
    title: "No check-ins yet",
    description: "Start your coffee journey by checking in your first drink!",
    actionLabel: "Check In Now",
    actionHref: "/check-in",
  },
  custom: {
    icon: <Coffee className="h-12 w-12" />,
    title: "Nothing here",
    description: "Check back later for updates.",
    actionLabel: undefined,
    actionHref: undefined,
  },
};

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: EmptyStateProps) {
  const { t } = useI18n();
  const config = defaultConfigs[type];
  const finalTitle =
    title ||
    (type === "profile"
      ? t("home.noCheckIns")
      : type === "feed"
      ? t("feed.emptyTitle")
      : type === "activity"
      ? t("activity.noActivity")
      : type === "search"
      ? t("common.noResults")
      : config.title);

  const finalDescription =
    description ||
    (type === "profile"
      ? t("home.noCheckInsDescription")
      : type === "feed"
      ? t("feed.emptyDescription")
      : config.description);

  const finalActionLabel =
    actionLabel ||
    (type === "profile" || type === "feed"
      ? t("home.checkInNow")
      : type === "activity"
      ? t("discover.title")
      : config.actionLabel);
  const finalActionHref = actionHref || config.actionHref;
  const finalIcon = icon || config.icon;

  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      data-testid="empty-state"
    >
      <div className="p-6 rounded-full bg-muted/50 text-muted-foreground mb-4">
        {finalIcon}
      </div>
      <h3 className="font-serif text-xl font-medium mb-2">{finalTitle}</h3>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        {finalDescription}
      </p>

      {finalActionLabel && finalActionHref && (
        <Link href={finalActionHref}>
          <Button data-testid="button-empty-action">{finalActionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
