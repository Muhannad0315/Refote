import { Heart, UserPlus, Coffee } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useI18n } from "@/lib/i18n";
import LocalizedText from "@/components/LocalizedText";

type ActivityType = "like" | "follow" | "checkin";

interface ActivityItemProps {
  type: ActivityType;
  user: {
    displayName: string;
    avatarUrl?: string;
  };
  target?: string;
  timestamp: Date;
  onClick?: () => void;
}

const activityConfig = {
  like: {
    icon: Heart,
    iconClass: "text-red-500",
  },
  follow: {
    icon: UserPlus,
    iconClass: "text-primary",
  },
  checkin: {
    icon: Coffee,
    iconClass: "text-primary",
  },
  // badge removed
};

export function ActivityItem({
  type,
  user,
  target,
  timestamp,
  onClick,
}: ActivityItemProps) {
  const { t, isRTL } = useI18n();
  const config = activityConfig[type];
  const Icon = config.icon;

  // message rendering in JSX so we can apply localized font to dynamic targets

  return (
    <button
      onClick={onClick}
      className={`flex items-start ${isRTL ? "gap-2" : "gap-3"} w-full p-4 ${
        isRTL ? "text-right" : "text-left"
      } hover:bg-muted/50 transition-colors`}
      data-testid={`activity-${type}`}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.avatarUrl} alt={user.displayName} />
          <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div
          className={`absolute -bottom-1 -right-1 p-1 rounded-full bg-background border border-border`}
        >
          <Icon className={`h-3 w-3 ${config.iconClass}`} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <LocalizedText className="font-semibold" text={user.displayName} />{" "}
          <span className="text-muted-foreground">
            {type === "like" && t("activity.likedYour")}
            {type === "follow" && t("activity.followedYou")}
            {type === "checkin" && t("checkIn.title")}
            {target ? (
              <>
                {" "}
                <LocalizedText text={target} />
              </>
            ) : null}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}
