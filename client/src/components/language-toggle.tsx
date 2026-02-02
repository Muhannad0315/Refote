import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage } = useI18n();
  
  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      data-testid="button-language-toggle"
      className="relative"
    >
      <Globe className="h-5 w-5" />
      <span className="absolute -bottom-0.5 -right-0.5 text-xs font-bold bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
        {language === "ar" ? "ع" : "En"}
      </span>
      <span className="sr-only">Toggle language</span>
    </Button>
  );
}
