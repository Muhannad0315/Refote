import React from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n } from "@/lib/i18n";
import LocalizedText from "@/components/LocalizedText";
// Use bundled asset from src/assets — falls back to Vite asset handling
import logo from "@/assets/logo.png";

interface TopHeaderProps {
  titleKey?: string;
  title?: string;
  leftIcon?: React.ReactNode;
}

export default function TopHeader({
  titleKey,
  title,
  leftIcon,
}: TopHeaderProps) {
  const { t } = useI18n();

  const renderedTitle = title ?? (titleKey ? t(titleKey) : "");

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div>
        <div className="flex items-center px-4 h-14 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 flex-1 justify-start">
            {leftIcon}
            <h1 className="text-lg">
              <LocalizedText>{renderedTitle}</LocalizedText>
            </h1>
          </div>

          <div className="flex items-center justify-center">
            <a
              href="/"
              aria-label={t("app.name")}
              className="pointer-events-auto"
            >
              {/* Use public asset at /logo.png so swapping is file-only */}
              <img
                src={logo}
                alt={`${t("app.name")} logo`}
                className="app-logo"
              />
            </a>
          </div>

          <div className="flex items-center gap-1 flex-1 justify-end">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
