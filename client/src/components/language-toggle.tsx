import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Globe } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useState, useEffect } from "react";

export function LanguageToggle() {
  const { language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<"en" | "ar">(language);

  const confirm = () => {
    if (pending !== language) {
      setLanguage(pending);
    }
    setOpen(false);
  };

  useEffect(() => {
    setPending(language);
  }, [language]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-language-toggle"
          className="relative"
        >
          <Globe className="h-5 w-5" />
          <span className="absolute -bottom-0.5 -right-0.5 text-xs font-bold bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
            {language === "ar" ? "ع" : "En"}
          </span>
          <span className="sr-only">Toggle language</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-40 p-2">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <button
              className={`w-full text-left px-3 py-2 rounded ${
                pending === "en" ? "bg-muted" : ""
              }`}
              onClick={() => setPending("en")}
              aria-pressed={pending === "en"}
            >
              English
            </button>

            <button
              className={`w-full text-left px-3 py-2 rounded ${
                pending === "ar" ? "bg-muted" : ""
              }`}
              onClick={() => setPending("ar")}
              aria-pressed={pending === "ar"}
            >
              العربية
            </button>
          </div>

          <div className="pt-1">
            <Button className="w-full" onClick={confirm}>
              {pending === "ar" ? "تغيير اللغة" : "Change Language"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
