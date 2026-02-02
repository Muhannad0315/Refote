import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AuthForm from "./components/auth-form";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
// Note: AuthForm is used as the popup for both auth and account actions
import { useAuth } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { I18nProvider } from "@/lib/i18n";
import { BottomNav } from "@/components/bottom-nav";
import NotFound from "@/pages/not-found";
// Home intentionally disabled — root redirects to Discover
import Discover from "@/pages/discover";
import CheckIn from "@/pages/check-in";
import CafeDetail from "@/pages/cafe-detail";
import Activity from "@/pages/activity";
import Profile from "@/pages/profile";
import ProfileComplete from "@/pages/profile-complete";
import Signup from "@/pages/signup";
import UserPage from "@/pages/user";
import UserFollowers from "@/pages/user-followers";
import UserFollowing from "@/pages/user-following";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Discover} />
      <Route path="/discover" component={Discover} />
      <Route path="/cafe/:id" component={CafeDetail} />
      <Route path="/check-in" component={CheckIn} />
      <Route path="/activity" component={Activity} />
      <Route path="/profile/complete" component={ProfileComplete} />
      <Route path="/profile" component={Profile} />
      <Route path="/signup" component={Signup} />
      <Route path="/users/:id" component={UserPage} />
      <Route path="/users/:id/followers" component={UserFollowers} />
      <Route path="/users/:id/following" component={UserFollowing} />
      <Route component={NotFound} />
    </Switch>
  );
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
            <span className="text-sm">{displayName}</span>
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
          <TooltipProvider>
            <Toaster />
            <div style={{ position: "fixed", top: 12, right: 12, zIndex: 60 }}>
              <AuthOpener />
            </div>
            <Router />
            <BottomNav />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
