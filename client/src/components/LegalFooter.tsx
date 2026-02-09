import React from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";

/**
 * LegalFooter
 * Fixed to the bottom of the viewport (above the safe-area inset)
 * Sits below the BottomNav which will be offset upward via CSS.
 */
export default function LegalFooter() {
  const { t, isRTL } = useI18n();

  return (
    <div
      role="contentinfo"
      dir={isRTL ? "rtl" : "ltr"}
      className="w-full left-0 right-0 bottom-0 fixed z-40"
      style={{
        bottom: "env(safe-area-inset-bottom)",
        height: "var(--legal-footer-height, 48px)",
      }}
    >
      <div className="w-full bg-background border-t border-border">
        <div className="max-w-lg w-full mx-auto px-4 h-12 flex items-center justify-center text-sm text-muted-foreground">
          <Link href="/privacy">
            <a className="underline-offset-2 hover:underline">
              {t("nav.privacy")}
            </a>
          </Link>
          <span aria-hidden className="mx-2 opacity-50">
            •
          </span>
          <Link href="/terms">
            <a className="underline-offset-2 hover:underline">
              {t("nav.terms")}
            </a>
          </Link>
          <span aria-hidden className="mx-2 opacity-50">
            •
          </span>
          <Link href="/feedback">
            <a className="underline-offset-2 hover:underline">
              {t("nav.feedback")}
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
