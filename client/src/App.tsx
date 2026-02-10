import { Switch, Route } from "wouter";
import { queryClient, setSessionInvalidHandler } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AuthForm from "./components/auth-form";
import { SupabaseUnreachableBoundary } from "./components/supabase-unreachable-boundary";
import React, { useState, useEffect } from "react";
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
import { setSeoMeta } from "@/lib/seo";
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
      <Route component={NotFound} />
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

function SeoDefaults() {
  const { t, language } = useI18n();
  const [location] = useLocation();

  useEffect(() => {
    setSeoMeta({
      title: t("seo.title.default"),
      description: t("seo.description.default"),
      keywords: t("seo.keywords.default"),
    });
  }, [language, location, t]);

  return null;
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
              <SeoDefaults />
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
            </TooltipProvider>
          </SupabaseUnreachableBoundary>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
