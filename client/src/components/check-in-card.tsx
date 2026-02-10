import { MapPin, Coffee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RatingStars } from "./rating-stars";
import { Link } from "wouter";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CheckInWithDetails, UserProfile } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatDistanceToNow } from "date-fns";
import { LocalizedText } from "./LocalizedText";

interface CheckInCardProps {
  checkIn: CheckInWithDetails;
}

export function CheckInCard({ checkIn }: CheckInCardProps) {
  const { language, t, isRTL } = useI18n();
  const requireAuth = useRequireAuth();
  const { user } = useAuth();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    // Do not fetch the canonical profile when unauthenticated to avoid 401s
    enabled: !!user,
  });
  const canEdit = profile?.id && profile.id === checkIn.user?.id;

  // Helper to format tasting notes: "note.silky" or "silky" → "Silky"
  const formatTastingNote = (note: string): string => {
    // Strip "note." prefix if present
    const key = note.startsWith("note.") ? note.substring(5) : note;
    // Try i18n lookup first
    const translated = t(`note.${key}`);
    // If translation differs from key, it was found; otherwise capitalize
    if (translated && translated !== `note.${key}`) return translated;
    // Fallback: capitalize first letter
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  const handleDelete = async () => {
    // legacy — replaced by in-app dialog. Kept for compatibility.
  };

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeleteConfirmed = async () => {
    try {
      const ok = await requireAuth();
      if (!ok) {
        setConfirmOpen(false);
        return;
      }
      await apiRequest("DELETE", `/api/check-ins/${checkIn.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmOpen(false);
    }
  };

  const cafeName = checkIn.cafe
    ? language === "ar"
      ? checkIn.cafe.nameAr
      : checkIn.cafe.nameEn
    : undefined;
  const cafeCity = checkIn.cafe
    ? language === "ar"
      ? checkIn.cafe.cityAr
      : checkIn.cafe.cityEn
    : undefined;

  const locationName = cafeName || cafeCity || "Unknown Location";
  const locationCity = cafeName ? cafeCity : "";

  return (
    <Card
      dir={isRTL ? "rtl" : "ltr"}
      className="overflow-hidden border-card-border"
      data-testid={`card-checkin-${checkIn.id}`}
    >
      {checkIn.photoUrl && (
        <div className="aspect-square w-full overflow-hidden bg-muted">
          <img
            src={checkIn.photoUrl}
            alt={checkIn.drink.name}
            className="w-full h-full object-cover"
            data-testid={`img-checkin-${checkIn.id}`}
          />
        </div>
      )}

      <CardContent className="p-4">
        <div
          className={`flex items-start gap-3 mb-3 ${
            isRTL ? "justify-end" : "justify-start"
          }`}
        >
          <div className={`${isRTL ? "ml-auto" : ""} flex items-center gap-3`}>
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage
                src={checkIn.user.avatarUrl || undefined}
                alt={checkIn.user.displayName}
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                {checkIn.user.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className={`min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="font-semibold text-sm"
                  data-testid={`text-username-${checkIn.id}`}
                >
                  <LocalizedText>{checkIn.user.displayName}</LocalizedText>
                </span>
                <span className="text-muted-foreground text-xs">
                  {checkIn.createdAt &&
                    formatDistanceToNow(new Date(checkIn.createdAt), {
                      addSuffix: true,
                    })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                <LocalizedText>{t("checkIn.isDrinking")}</LocalizedText>
              </p>
            </div>
          </div>
        </div>

        <h3
          className="text-xl font-medium mb-2"
          data-testid={`text-drink-${checkIn.id}`}
        >
          <LocalizedText>{checkIn.drink.name}</LocalizedText>
          {(checkIn as any).temperature && (
            <span className="text-sm text-muted-foreground ml-2">
              ({(checkIn as any).temperature})
            </span>
          )}
        </h3>

        <div className="flex items-center gap-2 mb-3">
          <RatingStars rating={checkIn.rating} size="sm" />
          <span className="text-sm font-medium text-muted-foreground">
            ({checkIn.rating.toFixed(1)})
          </span>
        </div>

        <div
          className={`w-full mb-3 ${
            isRTL ? "flex justify-end" : "flex justify-start"
          }`}
        >
          {checkIn.cafe ? (
            <Link
              href={`/cafe/${(checkIn.cafe as any).placeId || checkIn.cafe.id}`}
              className={`flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors ${
                isRTL ? "flex-row-reverse mr-auto" : "ml-auto"
              }`}
              data-testid={`button-location-${checkIn.id}`}
            >
              <MapPin className="h-4 w-4" />
              <span>
                <LocalizedText>{locationName}</LocalizedText>
              </span>
              {locationCity && (
                <span className="text-xs">
                  · <LocalizedText>{locationCity}</LocalizedText>
                </span>
              )}
            </Link>
          ) : (
            <button
              className={`flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors ${
                isRTL ? "flex-row-reverse mr-auto" : "ml-auto"
              }`}
              data-testid={`button-location-${checkIn.id}`}
            >
              <MapPin className="h-4 w-4" />
              <LocalizedText>{locationName}</LocalizedText>
              {locationCity && (
                <span className="text-xs">
                  · <LocalizedText>{locationCity}</LocalizedText>
                </span>
              )}
            </button>
          )}
        </div>

        {checkIn.tastingNotes && checkIn.tastingNotes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {checkIn.tastingNotes.map((note, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs"
                data-testid={`badge-tasting-${checkIn.id}-${index}`}
              >
                <Coffee className={`h-3 w-3 ${isRTL ? "ml-1" : "mr-1"}`} />
                <LocalizedText>{formatTastingNote(note)}</LocalizedText>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div
            className={`flex items-center gap-1 ${
              isRTL ? "flex-row-reverse" : ""
            }`}
          >
            {/* Likes temporarily removed */}

            {/* Comment button removed */}
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Link href={`/check-in?editId=${checkIn.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`button-edit-${checkIn.id}`}
                    onClick={async (e) => {
                      const ok = await requireAuth();
                      if (!ok) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    <LocalizedText>{t("common.edit")}</LocalizedText>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                  data-testid={`button-delete-${checkIn.id}`}
                >
                  <LocalizedText>{t("common.delete")}</LocalizedText>
                </Button>
              </>
            )}
          </div>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  <LocalizedText>{t("confirm.deleteCheckIn")}</LocalizedText>
                </DialogTitle>
                <DialogDescription>
                  <LocalizedText>
                    {t("confirm.deleteCheckInDescription")}
                  </LocalizedText>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmOpen(false)}
                  >
                    <LocalizedText>{t("common.cancel")}</LocalizedText>
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteConfirmed}>
                    <LocalizedText>{t("common.delete")}</LocalizedText>
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
