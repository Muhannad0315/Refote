import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import LocalizedText from "@/components/LocalizedText";

interface BackButtonProps {
  href?: string;
  onClick?: () => void;
  testId?: string;
}

export function BackButton({ href, onClick, testId }: BackButtonProps) {
  const { t, isRTL } = useI18n();
  const arrow = isRTL ? (
    <ArrowRight className="h-4 w-4" aria-hidden />
  ) : (
    <ArrowLeft className="h-4 w-4" aria-hidden />
  );

  const content = (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      data-testid={testId || "button-back"}
      className="inline-flex items-center gap-2 cursor-pointer text-white"
    >
      {arrow}
      <span>
        <LocalizedText>{t("common.back")}</LocalizedText>
      </span>
    </Button>
  );

  return (
    <div className="px-4 max-w-2xl mx-auto py-2">
      <div className="flex items-center justify-start">
        {href ? (
          <Link href={href}>
            <a className="inline-flex items-center gap-2 text-sm text-white cursor-pointer">
              {arrow}
              <span>
                <LocalizedText>{t("common.back")}</LocalizedText>
              </span>
            </a>
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  );
}

export default BackButton;
