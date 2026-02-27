import { Switch, Route } from "wouter";
import { queryClient, setSessionInvalidHandler } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AuthForm from "./components/auth-form";
import { SupabaseUnreachableBoundary } from "./components/supabase-unreachable-boundary";
import React, { useState, useEffect, useLayoutEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
// Note: AuthForm is used as the popup for both auth and account actions
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { BottomNav } from "@/components/bottom-nav";
import LegalFooter from "@/components/LegalFooter";
import { LocalizedText } from "@/components/LocalizedText";
import {
  HeadManager,
  SeoDefaults,
  type SeoDocument,
  type SeoOverridePayload,
  normalizeCanonicalUrl,
  registerSeoOverrideSetter,
} from "@/lib/seo";
import { trackPageView } from "@/lib/analytics";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Discover from "@/pages/discover";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Feedback from "@/pages/feedback";
import CheckIn from "@/pages/check-in";
import CafeDetail from "@/pages/cafe-detail";
import Activity from "@/pages/activity";
import Profile from "@/pages/profile";
import ProfileComplete from "@/pages/profile-complete";
import Signup from "@/pages/signup";
import Login from "@/pages/login";
import AuthReset from "@/pages/auth-reset";
import Settings from "@/pages/settings";
import UserPage from "@/pages/user";
import UserFollowers from "@/pages/user-followers";
import UserFollowing from "@/pages/user-following";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/discover" component={Discover} />
      <Route path="/cafe/:id" component={CafeDetail} />
      <Route path="/check-in" component={CheckIn} />
      <Route path="/activity" component={Activity} />
      <Route path="/profile/complete" component={ProfileComplete} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/auth/reset" component={AuthReset} />
      <Route path="/signup" component={Signup} />
      <Route path="/login" component={Login} />
      <Route path="/users/:id" component={UserPage} />
      <Route path="/users/:id/followers" component={UserFollowers} />
      <Route path="/users/:id/following" component={UserFollowing} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/feedback" component={Feedback} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

// Component that sets up SESSION_INVALID handler
function SessionInvalidHandler() {
  const [, setLocation] = useLocation();
  const { signOut } = useAuth();

  useEffect(() => {
    // Set up handler for SESSION_INVALID errors
    setSessionInvalidHandler(async () => {
      try {
        // Clear auth state by signing out
        await signOut();
      } catch (e) {
        // Ignore errors during signOut (user may already be logged out)
      }
      // Redirect to login after auth state is cleared
      setLocation("/login");
    });
  }, [setLocation, signOut]);

  return null;
}

function AnalyticsTracker() {
  const [location] = useLocation();

  useEffect(() => {
    const path = `${window.location.pathname}${window.location.search}`;
    trackPageView(path);
  }, [location]);

  return null;
}

function prettifyCity(citySlug: string) {
  const raw = decodeURIComponent(String(citySlug || "")).trim();
  if (!raw) return "City";
  return raw
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildBaseSeoDocument(
  pathname: string,
  t: (key: string) => string,
): SeoDocument {
  const canonicalUrl = normalizeCanonicalUrl(
    typeof window !== "undefined"
      ? window.location.href
      : `https://www.refote.com${pathname}`,
  );
  const image = SeoDefaults.openGraph.image;
  const defaultTitle = t("seo.title.default") || SeoDefaults.title;
  const defaultDescription =
    t("seo.description.default") || SeoDefaults.description;

  let title = defaultTitle;
  let description = defaultDescription;
  let robots = "index,follow";
  let jsonLd: SeoDocument["jsonLd"] = undefined;

  if (pathname === "/") {
    title = t("home.seo.title") || defaultTitle;
    description = t("home.seo.description") || defaultDescription;
    jsonLd = [
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            name: "Refote",
            url: "https://www.refote.com/",
            logo: "https://www.refote.com/android-chrome-512x512.png",
          },
          {
            "@type": "WebSite",
            name: "Refote",
            url: "https://www.refote.com/",
          },
        ],
      },
    ];
  } else if (pathname.startsWith("/discover")) {
    title = defaultTitle;
    description = defaultDescription;
    robots = "noindex,follow";
  } else if (pathname.startsWith("/cafe/")) {
    title = defaultTitle;
    description = defaultDescription;
  } else if (pathname.startsWith("/users/")) {
    title = defaultTitle;
    description = defaultDescription;
  } else if (pathname.startsWith("/city/")) {
    const slug = pathname.split("/")[2] || "";
    const city = prettifyCity(slug);
    title = (t("seo.title.city") || "Best Cafes in {city} – Refote").replace(
      "{city}",
      city,
    );
    description = (
      t("seo.description.city") ||
      "Discover the best cafes and coffee shops in {city} with Refote. Check in, rate drinks, and explore tasting notes."
    ).replace("{city}", city);
  }

  return {
    title: title || SeoDefaults.title,
    description: description || SeoDefaults.description,
    canonicalUrl,
    robots,
    openGraph: {
      title: title || SeoDefaults.openGraph.title,
      description: description || SeoDefaults.openGraph.description,
      url: canonicalUrl,
      type: "website",
      siteName: "Refote",
      image,
    },
    twitter: {
      card: "summary_large_image",
      title: title || SeoDefaults.twitter.title,
      description: description || SeoDefaults.twitter.description,
      image,
    },
    jsonLd,
  };
}

function mergeSeoDocument(
  base: SeoDocument,
  override: SeoOverridePayload | null,
): SeoDocument {
  const selectedTitle =
    String(override?.title ?? "").trim() ||
    String(base.title || "").trim() ||
    SeoDefaults.title;
  const selectedDescription =
    String(override?.description ?? "").trim() ||
    String(base.description || "").trim() ||
    SeoDefaults.description;

  const canonicalUrl = normalizeCanonicalUrl(
    override?.canonicalUrl || override?.openGraph?.url || base.canonicalUrl,
  );

  const robots =
    String(override?.robots ?? "").trim() ||
    String(base.robots || "").trim() ||
    "index,follow";

  const openGraph: SeoDocument["openGraph"] = {
    title:
      String(override?.openGraph?.title ?? "").trim() ||
      selectedTitle ||
      SeoDefaults.openGraph.title,
    description:
      String(override?.openGraph?.description ?? "").trim() ||
      selectedDescription ||
      SeoDefaults.openGraph.description,
    url: canonicalUrl,
    type:
      String(override?.openGraph?.type ?? "").trim() ||
      String(base.openGraph.type || "").trim() ||
      "website",
    siteName:
      String(override?.openGraph?.siteName ?? "").trim() ||
      String(base.openGraph.siteName || "").trim() ||
      "Refote",
    image:
      String(override?.openGraph?.image ?? "").trim() ||
      String(base.openGraph.image || "").trim() ||
      SeoDefaults.openGraph.image,
  };

  const twitter: SeoDocument["twitter"] = {
    card:
      String(override?.twitter?.card ?? "").trim() ||
      String(base.twitter.card || "").trim() ||
      "summary_large_image",
    title:
      String(override?.twitter?.title ?? "").trim() ||
      selectedTitle ||
      SeoDefaults.twitter.title,
    description:
      String(override?.twitter?.description ?? "").trim() ||
      selectedDescription ||
      SeoDefaults.twitter.description,
    image:
      String(override?.twitter?.image ?? "").trim() ||
      String(base.twitter.image || "").trim() ||
      SeoDefaults.twitter.image,
  };

  const result: SeoDocument = {
    title: selectedTitle,
    description: selectedDescription,
    canonicalUrl,
    robots,
    openGraph: {
      ...openGraph,
      url: canonicalUrl,
    },
    twitter,
    jsonLd: override?.jsonLd ?? base.jsonLd,
    pagination: override?.pagination ?? base.pagination,
  };

  if (robots.toLowerCase().includes("noindex")) {
    result.jsonLd = undefined;
  }

  return result;
}

function SeoProvider({ children }: { children: React.ReactNode }) {
  const { t, language } = useI18n();
  const [location] = useLocation();
  const [override, setOverride] = useState<SeoOverridePayload | null>(null);

  useEffect(() => {
    const unregister = registerSeoOverrideSetter((next) => {
      setOverride(next);
    });
    return unregister;
  }, []);

  useEffect(() => {
    setOverride(null);
  }, [location, language]);

  const pathname = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.pathname || "/";
    }
    return location || "/";
  }, [location]);

  const baseDocument = useMemo(() => {
    return buildBaseSeoDocument(pathname, t);
  }, [pathname, t, language]);

  const finalDocument = useMemo(() => {
    return mergeSeoDocument(baseDocument, override);
  }, [baseDocument, override]);

  useLayoutEffect(() => {
    HeadManager.apply(finalDocument);
  }, [finalDocument]);

  return <>{children}</>;
}

function AuthOpener() {
  const [showAuth, setShowAuth] = useState(false);
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/profile");
      return res.json();
    },
    enabled: !!user,
    initialData: () => queryClient.getQueryData(["/api/profile"] as any),
  });

  const displayName =
    profile?.username ||
    profile?.displayName ||
    profile?.name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split("@")[0] : "");

  const avatarUrl =
    (profile && profile.avatarUrl) ||
    user?.user_metadata?.avatarUrl ||
    user?.user_metadata?.avatar ||
    null;

  const avatarSrc = (() => {
    if (!avatarUrl) return "/favicon.ico";
    if (avatarUrl.startsWith("data:")) return avatarUrl;
    const cb = profile?.__cacheBust;
    if (!cb) return avatarUrl;
    return `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${cb}`;
  })();

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {!showAuth && (
          <button
            onClick={() => setShowAuth((s) => !s)}
            aria-haspopup="dialog"
            aria-expanded={showAuth}
            className="inline-flex items-center gap-2"
          >
            <img
              key={String(profile?.__cacheBust ?? avatarUrl)}
              src={avatarSrc}
              alt={displayName}
              className="h-6 w-6 rounded-full object-cover"
            />
            <LocalizedText className="text-sm">{displayName}</LocalizedText>
          </button>
        )}
        <AuthForm open={showAuth} onOpenChange={setShowAuth} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!showAuth && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAuth((s) => !s)}
          aria-haspopup="dialog"
          aria-expanded={showAuth}
        >
          Signup/Login
        </Button>
      )}
      <div>
        <AuthForm
          open={showAuth}
          onOpenChange={setShowAuth}
          initialMode="login"
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <SupabaseUnreachableBoundary>
            <TooltipProvider>
              <Toaster />
              <SeoProvider>
                <AnalyticsTracker />
                <SessionInvalidHandler />
                {/* Top-right Signup/Login opener temporarily disabled; re-enable when needed */}
                {/*
                <div style={{ position: "fixed", top: 12, right: 12, zIndex: 60 }}>
                  <AuthOpener />
                </div>
                */}
                <div
                  className="min-h-screen"
                  style={{
                    // Reserve space so page content is never hidden behind
                    // the bottom navigation and the legal footer.
                    paddingBottom:
                      "calc(env(safe-area-inset-bottom) + var(--legal-footer-height, 48px) + 4rem)",
                    // Define the footer height CSS variable (can be tuned)
                    ["--legal-footer-height" as any]: "48px",
                  }}
                >
                  <Router />
                </div>
                <LegalFooter />
                <BottomNav />
              </SeoProvider>
            </TooltipProvider>
          </SupabaseUnreachableBoundary>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
