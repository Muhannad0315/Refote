import React, { ReactNode } from "react";

interface LocalizedTextProps {
  children?: ReactNode;
  text?: string;
  className?: string;
}

/**
 * LocalizedText: Script-based font detection component
 *
 * Detects Arabic script in text and applies appropriate font-family:
 * - Arabic script (U+0600-U+06FF) → IBM Plex Sans Arabic
 * - Latin/other scripts → Inter (system default)
 *
 * Renders as <span> by default with optional className pass-through.
 * Does NOT translate content, does NOT depend on app language.
 *
 * Usage:
 * <LocalizedText>مقهى</LocalizedText>
 * <LocalizedText className="font-semibold">Café Name</LocalizedText>
 * <LocalizedText text={dynamicContent} />
 */
export const LocalizedText: React.FC<LocalizedTextProps> = ({
  children,
  text,
  className = "",
}) => {
  // Use children if provided, otherwise fall back to text prop
  const content = children !== undefined ? children : text;

  if (!content) {
    return <span className={className} />;
  }

  // Convert content to string for detection
  const contentStr = typeof content === "string" ? content : String(content);

  // Detect Arabic script: Unicode range U+0600-U+06FF
  const hasArabic = /[\u0600-\u06FF]/.test(contentStr);

  // Determine direction: RTL for Arabic, LTR otherwise
  const direction = hasArabic ? "rtl" : "ltr";

  // Choose localized font utility class (uses CSS variables in typography.css)
  const fontClass = hasArabic
    ? "localized-font-arabic"
    : "localized-font-latin";

  return (
    <span className={`${fontClass} ${className}`.trim()} dir={direction}>
      {content}
    </span>
  );
};

export default LocalizedText;

// Utility: expose script detection for other components (inputs/placeholders/selects)
export function isArabic(text?: string | null) {
  if (!text) return false;
  const s = typeof text === "string" ? text : String(text);
  return /[\u0600-\u06FF]/.test(s);
}

export function localizedClassForText(text?: string | null) {
  return isArabic(text) ? "localized-font-arabic" : "localized-font-latin";
}
