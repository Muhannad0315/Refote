import { MapPin, Star, Coffee, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { Cafe, CafeWithDistance } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { useRequireAuthAndProfile } from "@/lib/useRequireAuthAndProfile";
import type { Language } from "@/lib/i18n";
import { LocalizedText } from "@/components/LocalizedText";
import { formatDistance } from "@/utils/distance";

interface CafeCardProps {
  cafe: Cafe | CafeWithDistance;
  displayName?: string;
  displayAddress?: string;
  distance?: number;
  language?: Language;
  averageRating?: number;
  totalCheckIns?: number;
}

export function CafeCard({
  cafe,
  displayName,
  displayAddress,
  distance,
  language = "en",
  averageRating,
  totalCheckIns,
}: CafeCardProps) {
  const requireAuthAndProfile = useRequireAuthAndProfile();
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const name =
    displayName ||
    (language === "ar"
      ? (cafe as any).nameAr || (cafe as any).nameEn || (cafe as any).name || ""
      : (cafe as any).nameEn ||
        (cafe as any).name ||
        (cafe as any).nameAr ||
        "");
  const address =
    displayAddress ||
    (language === "ar"
      ? (cafe as any).addressAr ||
        (cafe as any).addressEn ||
        (cafe as any).address ||
        ""
      : (cafe as any).addressEn ||
        (cafe as any).address ||
        (cafe as any).addressAr ||
        "");
  const cityName =
    language === "ar" ? (cafe as any).cityAr : (cafe as any).cityEn;
  const rating = averageRating ?? (cafe as any).rating ?? null;

  // Use server-provided distance (meters) when present. Do NOT recalculate
  // distance on the client — the server is the source of truth.

  return (
    <Card
      dir={language === "ar" ? "rtl" : "ltr"}
      className="overflow-hidden border-card-border hover-elevate"
      data-testid={`card-cafe-${(cafe as any).id}`}
    >
      <div className="flex gap-3 p-3">
        <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
          {(cafe as any).imageUrl ? (
            <img
              src={
                (cafe as any).imageUrl.includes("maps.googleapis.com")
                  ? `/api/proxy?url=${encodeURIComponent(
                      (cafe as any).imageUrl,
                    )}`
                  : (cafe as any).imageUrl
              }
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <Coffee className="h-8 w-8 text-primary/40" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`text-base font-medium truncate ${
                language === "ar" ? "text-right" : ""
              }`}
              data-testid={`text-cafe-name-${(cafe as any).id}`}
            >
              <Link
                href={`/cafe/${(cafe as any).placeId || (cafe as any).id}`}
                className="inline-block"
              >
                <LocalizedText>{name}</LocalizedText>
              </Link>
            </h3>

            {/* rating moved below next to Google attribution */}
          </div>

          <div className="mt-1">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              {(cafe as any).placeId ? (
                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(
                    (cafe as any).placeId,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-primary hover:underline truncate ${
                    language === "ar" ? "text-right" : ""
                  }`}
                  data-testid={`link-directions-${(cafe as any).id}`}
                >
                  <LocalizedText>{t("cafe.viewOnMaps")}</LocalizedText>
                </a>
              ) : (cafe as any).latitude && (cafe as any).longitude ? (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    `${(cafe as any).latitude},${(cafe as any).longitude}`,
                  )}&travelmode=driving`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                  data-testid={`link-directions-${(cafe as any).id}`}
                >
                  <LocalizedText>{t("cafe.directions")}</LocalizedText>
                </a>
              ) : (
                <span className="text-muted-foreground truncate">
                  <LocalizedText>{cityName}</LocalizedText>
                </span>
              )}
            </div>

            {/* Google attribution required when showing Places data */}
            {(cafe as any).placeId && (
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {rating !== null && rating !== undefined && rating > 0 ? (
                    <>
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium">
                        {(rating as number).toFixed(1)}
                      </span>
                      {typeof (cafe as any).reviews === "number" && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({(cafe as any).reviews})
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      <LocalizedText>{t("cafe.noRatings")}</LocalizedText>
                    </span>
                  )}
                </div>

                <span className="text-xs text-muted-foreground">·</span>

                <span className="text-xs text-muted-foreground">
                  <LocalizedText>{t("cafe.providedByGoogle")}</LocalizedText>
                </span>
              </div>
            )}

            {(cafe as any).latitude && (cafe as any).longitude && (
              <div
                className={`text-muted-foreground text-sm mt-1 truncate ${
                  language === "ar" ? "text-right" : ""
                }`}
              >
                <LocalizedText>{cityName}</LocalizedText>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            {(typeof distance === "number" && Number.isFinite(distance)) ||
            (typeof (cafe as any).distance === "number" &&
              Number.isFinite((cafe as any).distance)) ? (
              <Badge variant="secondary" className="text-xs">
                <Navigation className="h-3 w-3 me-1" />
                {formatDistance(
                  (typeof distance === "number" && Number.isFinite(distance)
                    ? distance
                    : (cafe as any).distance) as number,
                )}
              </Badge>
            ) : null}
            {(cafe as any).specialty && (
              <Badge variant="outline" className="text-xs">
                <LocalizedText>{(cafe as any).specialty}</LocalizedText>
              </Badge>
            )}
            {totalCheckIns !== undefined && totalCheckIns > 0 && (
              <span className="text-xs text-muted-foreground">
                {totalCheckIns}{" "}
                <LocalizedText>{t("cafe.checkIns")}</LocalizedText>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">
        <Button
          className="w-full"
          size="sm"
          data-testid={`button-checkin-cafe-${(cafe as any).id}`}
          onClick={async () => {
            const ok = await requireAuthAndProfile();
            if (ok) {
              // User is authenticated and profile is complete, redirect to check-in page
              setLocation(
                `/check-in?cafeId=${
                  (cafe as any).placeId || (cafe as any).id
                }&cafeName=${encodeURIComponent(name)}`,
              );
            }
            // If not authenticated or profile incomplete, requireAuthAndProfile will handle redirect
          }}
        >
          <LocalizedText>{t("cafe.checkInHere")}</LocalizedText>
        </Button>
      </div>
    </Card>
  );
}
