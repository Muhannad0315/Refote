import { Coffee, Search, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import LocalizedText from "@/components/LocalizedText";

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
    title: undefined,
    description: undefined,
    actionLabel: undefined,
    actionHref: undefined,
  },
  search: {
    icon: <Search className="h-12 w-12" />,
    title: undefined,
    description: undefined,
    actionLabel: undefined,
    actionHref: undefined,
  },
  activity: {
    icon: <Bell className="h-12 w-12" />,
    title: undefined,
    description: undefined,
    actionLabel: undefined,
    actionHref: undefined,
  },
  profile: {
    icon: <User className="h-12 w-12" />,
    title: undefined,
    description: undefined,
    actionLabel: undefined,
    actionHref: undefined,
  },
  custom: {
    icon: <Coffee className="h-12 w-12" />,
    title: undefined,
    description: undefined,
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
      : type === "custom"
      ? t("empty.nothingHere")
      : config.title);

  const finalDescription =
    description ||
    (type === "profile"
      ? t("home.noCheckInsDescription")
      : type === "feed"
      ? t("feed.emptyDescription")
      : type === "custom"
      ? t("empty.checkBackLater")
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
      <h3 className="text-xl font-medium mb-2">
        <LocalizedText>{finalTitle}</LocalizedText>
      </h3>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        <LocalizedText>{finalDescription}</LocalizedText>
      </p>

      {finalActionLabel && finalActionHref && (
        <Link href={finalActionHref}>
          <Button data-testid="button-empty-action">
            <LocalizedText>{finalActionLabel}</LocalizedText>
          </Button>
        </Link>
      )}
    </div>
  );
}
