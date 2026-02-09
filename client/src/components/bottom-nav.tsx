import { Search, User, UserPlus } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function BottomNav() {
  const [location] = useLocation();
  const { t, isRTL } = useI18n();

  const { user } = useAuth();

  const navItems: Array<any> = [
    // Discover is always available
    { icon: Search, labelKey: "nav.discover", path: "/discover" },
    // When unauthenticated, show explicit Login and Sign up tabs
    ...(!user
      ? [
          { icon: User, labelKey: "auth.tabs.login", path: "/login" },
          { icon: UserPlus, labelKey: "auth.tabs.signup", path: "/signup" },
        ]
      : []),
  ];

  // Authenticated users see the Profile tab instead of auth tabs
  if (user) {
    navItems.push({ icon: User, labelKey: "nav.profile", path: "/profile" });
  }

  return (
    <nav
      className="fixed left-0 right-0 z-50 bg-background border-t border-border"
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        bottom:
          "calc(env(safe-area-inset-bottom) + var(--legal-footer-height, 48px))",
      }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          // Prefer an explicit literal label when provided (signup), else
          // fall back to the i18n key. This keeps existing i18n behavior.
          const label = t((item as any).labelKey);

          if ((item as any).isCenter) {
            return (
              <div
                key={item.path}
                className="flex items-center justify-center -mt-6"
              >
                <button
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-muted text-muted-foreground shadow disabled:opacity-60 cursor-not-allowed"
                  data-testid="button-check-in-nav"
                  aria-disabled={true}
                  disabled
                  title={label}
                >
                  <Icon className="h-6 w-6" />
                </button>
              </div>
            );
          }

          // Compute a stable test id fragment without assuming labelKey exists
          const testIdKey = (item as any).labelKey
            ? String((item as any).labelKey).split(".")[1]
            : (item as any).label
            ? String((item as any).label)
                .toLowerCase()
                .replace(/\s+/g, "-")
            : String(item.path).replace(/[^a-z0-9]/gi, "-");

          return (
            <Link key={item.path} href={item.path}>
              <button
                className={`flex flex-col items-center justify-center min-w-[60px] py-2 rounded-lg transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`button-nav-${testIdKey}`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "fill-current" : ""}`} />
                <span className="text-xs mt-1">{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
