import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Edit2, LogOut, Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import type { UserProfile } from "@shared/schema";
import { LocalizedText } from "@/components/LocalizedText";

interface UserProfileHeaderProps {
  user: UserProfile;
  isOwnProfile?: boolean;
  isFollowing?: boolean;
  onFollow?: () => void;
  onEdit?: () => void;
}

export function UserProfileHeader({
  user,
  isOwnProfile = false,
  isFollowing = false,
  onFollow,
  onEdit,
}: UserProfileHeaderProps) {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const [, setLocation] = useLocation();
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };
  const displayName = user.displayName || "";
  const username = user.username || "";
  const avatarUrl = user.avatarUrl || undefined;
  const stats = [
    {
      key: "profile.checkIns",
      label: t("profile.checkIns"),
      value: user.checkInsCount ?? 0,
    },
    {
      key: "profile.uniqueDrinks",
      label: t("profile.uniqueDrinks"),
      value: user.uniqueDrinksCount ?? 0,
    },
  ];

  return (
    <div className="relative" data-testid={`profile-header-${user.id || ""}`}>
      <div className="px-4 pb-4">
        <div className="flex items-end justify-between -mt-8 mb-4">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg z-50">
            <AvatarImage src={avatarUrl} alt={displayName || username} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {(
                displayName?.charAt(0) ||
                username?.charAt(0) ||
                "?"
              ).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col items-center gap-2 mt-12">
            {isOwnProfile ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  className="min-w-[140px]"
                  onClick={() => signOut()}
                  data-testid="button-signout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <LocalizedText>
                    {tr("common.signOut", "Sign Out")}
                  </LocalizedText>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-[140px]"
                  onClick={onEdit}
                  data-testid="button-edit-profile"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  <LocalizedText>
                    {tr("profile.editProfile", "Edit Profile")}
                  </LocalizedText>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-[140px]"
                  onClick={() => setLocation("/settings")}
                  data-testid="button-settings"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  <LocalizedText>
                    {tr("settings.title", "Settings")}
                  </LocalizedText>
                </Button>
              </>
            ) : (
              // optional follow button for other users; `onFollow` may be undefined
              <Button
                variant={isFollowing ? "default" : "secondary"}
                onClick={onFollow}
                data-testid="button-follow"
              >
                <LocalizedText>
                  {isFollowing ? t("common.following") : t("common.follow")}
                </LocalizedText>
              </Button>
            )}
          </div>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-bold" data-testid="text-display-name">
            <LocalizedText>{displayName}</LocalizedText>
          </h1>
          <p
            className="text-muted-foreground text-sm"
            data-testid="text-username"
          >
            @<LocalizedText>{username}</LocalizedText>
          </p>
          {user.bio && (
            <p className="mt-2 text-sm" data-testid="text-bio">
              <LocalizedText>{user.bio}</LocalizedText>
            </p>
          )}
        </div>

        <div className="flex items-center justify-around py-4 border-y border-border">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-bold text-lg">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
