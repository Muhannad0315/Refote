import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

export default function NotFound() {
  const { language, isRTL } = useI18n();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <div className="absolute top-4 end-4 flex gap-1">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">
              {language === "ar" ? "404 الصفحة غير موجودة" : "404 Page Not Found"}
            </h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {language === "ar" 
              ? "الصفحة التي تبحث عنها غير موجودة." 
              : "The page you're looking for doesn't exist."}
          </p>

          <Link href="/">
            <Button className="mt-4 w-full" data-testid="button-go-home">
              {language === "ar" ? "العودة للرئيسية" : "Go to Home"}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
