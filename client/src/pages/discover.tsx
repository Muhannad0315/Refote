import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchBar } from "@/components/search-bar";
import { CafeCard } from "@/components/cafe-card";
// Roasters removed
import { CafeCardSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import TopHeader from "@/components/top-header";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { setSeoMeta } from "@/lib/seo";
import { localizedClassForText } from "@/components/LocalizedText";
import LocalizedText from "@/components/LocalizedText";
import {
  requestUserLocation,
  calculateHaversineDistance,
  type UserLocation,
} from "@/lib/location";
import { getLocationCell } from "../../../shared/locationCell";
import { DEFAULT_SEARCH_RADIUS_METERS } from "../../../shared/searchConstants";
import {
  Search as SearchIcon,
  Flame,
  MapPin,
  Navigation,
  ChevronDown,
} from "lucide-react";
import type { Cafe, CafeWithDistance } from "@shared/schema";
// city translations removed — filters not used

// Detect US locale; all others default to metric
const isUSLocale = () => {
  const lang = navigator.language || "en";
  return lang.toLowerCase().startsWith("en-us");
};

// Distance options: unified meter-primary labels with approx miles
const DISTANCE_OPTIONS = [
  { label: "discover.distance.500", meters: 500 },
  { label: "discover.distance.1000", meters: 1000 },
  { label: "discover.distance.1500", meters: 1500 },
  { label: "discover.distance.3000", meters: 3000 },
];

// Get default radius (500m for all locales)
const getDefaultRadius = () => {
  return 500;
};

export default function Discover() {
  const { t, language, isRTL } = useI18n();
  const [search, setSearch] = useState("");
  // City filters removed — Discover now uses nearby Places only
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "requesting" | "granted" | "denied" | "error"
  >("idle");
  const { user } = useAuth();
  const [devOverrideActive, setDevOverrideActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"cafes">("cafes");

  // Locale detection and distance selector
  const isUS = isUSLocale();

  // Initialize radius from localStorage or use default
  // Only accept stored values if they match current DISTANCE_OPTIONS
  const [radiusMeters, setRadiusMeters] = useState<number>(() => {
    const stored = localStorage.getItem("discover-radius");
    if (stored) {
      const parsed = parseInt(stored, 10);
      // Only use stored value if it's a valid option in current DISTANCE_OPTIONS
      if (!isNaN(parsed) && DISTANCE_OPTIONS.some((o) => o.meters === parsed)) {
        return parsed;
      }
      // Clear invalid stored value
      localStorage.removeItem("discover-radius");
    }
    return getDefaultRadius();
  });

  // Persist radius to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("discover-radius", String(radiusMeters));
  }, [radiusMeters]);

  // Compute a coarse location cell for caching/de-duplication. The server
  // uses the same cell logic; including these values in the query key ensures
  // cached results are keyed by location cell and radius.
  const RADIUS_METERS = radiusMeters;
  const { latCell, lngCell } = userLocation
    ? getLocationCell(userLocation.latitude, userLocation.longitude)
    : { latCell: null as number | null, lngCell: null as number | null };

  const {
    data: cafes,
    isLoading: cafesLoading,
    error: cafesError,
    refetch: refetchCafes,
  } = useQuery<Cafe[]>({
    // Query key includes location cell + radius so different coarse locations
    // have separate cache entries. Using a stable key prevents refetches when
    // UI interactions (clicks) happen elsewhere on the page.
    queryKey: ["/api/cafes", language, latCell, lngCell, RADIUS_METERS],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("lang", language === "ar" ? "ar" : "en");
      params.set("radius_m", String(RADIUS_METERS));
      // Include lat/lng only when we have userLocation. If dev override is
      // active and client has no geolocation, omit lat/lng so server will use
      // the server-side override.
      if (userLocation) {
        params.set("lat", String(userLocation.latitude));
        params.set("lng", String(userLocation.longitude));
      }

      const url = `/api/cafes?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch cafes");
      return res.json();
    },
    // Do not treat data as stale for at least 10 minutes to avoid UI-driven
    // refetches when users click around. Server-side caching (nearbySearchCache)
    // is the primary protection against unnecessary Google API calls; the
    // client keeps data fresh enough for interactive use.
    staleTime: 1000 * 60 * 10, // 10 minutes
    // UI interactions like switching tabs or focusing the window should NOT
    // trigger refetches for Discover — rely on cache and explicit invalidation
    // when user actions genuinely change data.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Only enable the query when the browser has granted geolocation OR the
    // server-side dev override is active. This prevents accidental calls when
    // the client does not have coords and the server will reject the request.
    enabled: !!userLocation || devOverrideActive,
  });

  // roasters removed

  const requestLocation = useCallback(async () => {
    setLocationStatus("requesting");
    try {
      const location = await requestUserLocation();
      setUserLocation(location);
      setLocationStatus("granted");
    } catch {
      // Try to detect whether the failure was a permission denial
      try {
        await new Promise((_, reject) => {
          navigator.geolocation.getCurrentPosition(
            () => reject(new Error("unexpected-success")),
            (err) => reject(err),
            { timeout: 5000 },
          );
        });
      } catch (err: any) {
        const code = err?.code;
        if (code === 1) setLocationStatus("denied");
        else setLocationStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const cityFromCafes = useMemo(() => {
    if (!cafes || cafes.length === 0) return "";
    for (const cafe of cafes) {
      const cityName =
        language === "ar"
          ? (cafe as any).cityAr
          : (cafe as any).cityEn || (cafe as any).city;
      if (typeof cityName === "string" && cityName.trim()) {
        return cityName.trim();
      }
    }
    return "";
  }, [cafes, language]);

  useEffect(() => {
    if (!cityFromCafes) return;
    setSeoMeta({
      title: t("seo.title.city").replace("{city}", cityFromCafes),
      description: t("seo.description.city").replace("{city}", cityFromCafes),
      keywords: `${t("seo.keywords.default")}, ${t("seo.keywords.city").replace(
        "{city}",
        cityFromCafes,
      )}`,
    });
  }, [cityFromCafes, language, t]);

  // Check server dev override status so Discover can run when temp_location
  // is enabled on the server even if the browser has no geolocation.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/dev-location-status");
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setDevOverrideActive(!!json?.enabled);
      } catch (_) {
        if (mounted) setDevOverrideActive(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const cafesWithDistance = useMemo((): CafeWithDistance[] => {
    if (!cafes) return [];

    return cafes
      .map((cafe) => {
        let distance: number | undefined;
        if (userLocation && cafe.latitude && cafe.longitude) {
          distance = calculateHaversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            cafe.latitude,
            cafe.longitude,
          );
        }
        return { ...cafe, distance };
      })
      .sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        if (a.distance !== undefined) return -1;
        if (b.distance !== undefined) return 1;
        return 0;
      });
  }, [cafes, userLocation]);

  const safeStr = (v: any) => (typeof v === "string" ? v : "");
  const getCafeName = (cafe: any) => {
    if (language === "ar")
      return safeStr(cafe.nameAr) || safeStr(cafe.name) || safeStr(cafe.nameEn);
    return safeStr(cafe.nameEn) || safeStr(cafe.name) || safeStr(cafe.nameAr);
  };
  const getCafeAddress = (cafe: any) =>
    safeStr(language === "ar" ? cafe.addressAr : cafe.addressEn) ||
    safeStr(cafe.address) ||
    "";
  // city translations left for future use

  const filteredCafes = useMemo(() => {
    if (!search) return cafesWithDistance;
    const searchLower = search.toLowerCase();
    return cafesWithDistance.filter((cafe: any) => {
      const nameAr = safeStr(cafe.nameAr);
      const nameEn = safeStr(cafe.nameEn);
      const name = safeStr(cafe.name);
      const addrAr = safeStr(cafe.addressAr);
      const addrEn = safeStr(cafe.addressEn);
      const addr = safeStr(cafe.address);
      return (
        nameAr.toLowerCase().includes(searchLower) ||
        nameEn.toLowerCase().includes(searchLower) ||
        name.toLowerCase().includes(searchLower) ||
        addrAr.toLowerCase().includes(searchLower) ||
        addrEn.toLowerCase().includes(searchLower) ||
        addr.toLowerCase().includes(searchLower)
      );
    });
  }, [cafesWithDistance, search]);

  // No additional filters applied — use search results only
  const filteredAndFiltered = filteredCafes;

  // roasters removed

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <TopHeader
        titleKey="nav.discover"
        leftIcon={<SearchIcon className="h-4 w-4 text-primary" />}
      />

      <main className="max-w-2xl mx-auto px-4 py-4">
        {/* Location access banner — always visible, two states:
            Red: location not granted (denied / error / idle / requesting)
            Green: location granted with valid coordinates */}
        {(() => {
          const granted = locationStatus === "granted" && !!userLocation;
          const messageKey = granted
            ? "discover.locationEnabled"
            : "discover.locationRequired";

          return (
            <div
              className={`mb-4 p-3 rounded-md bg-muted text-sm flex items-center gap-2 ${
                granted
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
              data-testid="banner-location-status"
            >
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>
                <LocalizedText>{t(messageKey)}</LocalizedText>
              </span>
              {!granted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={requestLocation}
                  disabled={locationStatus === "requesting"}
                  className="ms-auto"
                  data-testid="button-request-location"
                >
                  <LocalizedText>{t("discover.enableLocation")}</LocalizedText>
                </Button>
              )}
            </div>
          );
        })()}

        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "cafes" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setActiveTab("cafes")}
            data-testid="tab-cafes"
          >
            <SearchIcon className="h-4 w-4 me-2" />
            <LocalizedText>{t("discover.cafes")}</LocalizedText>
          </Button>
          {/* roasters tab removed */}
        </div>

        <div className="mb-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t("discover.searchPlaceholder")}
          />
        </div>

        {/* Distance Selector */}
        <div className="mb-4 flex items-center gap-2">
          <label htmlFor="distance-select" className="text-sm font-medium">
            <LocalizedText>{t("discover.distance")}</LocalizedText>:
          </label>
          <div className="relative">
            <select
              id="distance-select"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
              className={`appearance-none bg-background border border-border rounded-md px-3 py-2 text-sm pr-8 cursor-pointer hover:bg-muted/50 transition-colors ${localizedClassForText(
                t(
                  DISTANCE_OPTIONS.find((o) => o.meters === radiusMeters)
                    ?.label || "",
                ),
              )}`}
              data-testid="distance-selector"
            >
              {DISTANCE_OPTIONS.map((option) => (
                <option
                  key={option.meters}
                  value={option.meters}
                  className={localizedClassForText(t(option.label))}
                >
                  {t(option.label)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
          </div>
        </div>

        {activeTab === "cafes" && (
          <>
            {userLocation && (
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Navigation className="h-4 w-4 text-primary" />
                <span>
                  <LocalizedText>{t("discover.nearYou")}</LocalizedText>
                </span>
              </div>
            )}

            {/* Service unavailable error state */}
            {cafesError && (
              <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-900 dark:text-amber-100 mb-3">
                  We're having trouble connecting right now. Please check your
                  internet connection or try again in a moment.
                </p>
                <Button
                  onClick={() => refetchCafes()}
                  className="w-full"
                  size="sm"
                >
                  Retry
                </Button>
              </div>
            )}

            {cafesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <CafeCardSkeleton key={i} />
                ))}
              </div>
            ) : !cafesError && filteredCafes && filteredCafes.length > 0 ? (
              <div className="space-y-3">
                {/*
                  Pagination is purely client-side and works on the already-
                  fetched results only. We intentionally slice the full result
                  set here to avoid additional network requests while the user
                  scrolls or interacts with the UI. Google API calls are only
                  performed at the initial discovery/query step handled by the
                  server; pagination must NOT trigger new Google requests.
                */}
                {filteredCafes.slice(0, 50).map((cafe: any) => (
                  <CafeCard
                    key={
                      cafe.id ??
                      cafe.placeId ??
                      (cafe.placeId ? cafe.placeId : Math.random())
                    }
                    cafe={cafe}
                    displayName={getCafeName(cafe)}
                    displayAddress={getCafeAddress(cafe)}
                    distance={cafe.distance}
                    language={language}
                  />
                ))}
                {filteredCafes.length > 50 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    {language === "ar"
                      ? `عرض 50 من ${filteredCafes.length} مقهى`
                      : `Showing 50 of ${filteredCafes.length} cafes`}
                  </p>
                )}
              </div>
            ) : (
              <EmptyState type="search" />
            )}
          </>
        )}

        {/* roasters UI removed */}
      </main>
    </div>
  );
}
