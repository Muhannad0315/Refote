import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import LocalizedText from "@/components/LocalizedText";
import TopHeader from "@/components/top-header";

export default function NotFound() {
  const { t, isRTL } = useI18n();

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <TopHeader />

      <main className="max-w-2xl mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2 items-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <h1 className="text-2xl font-bold">
                <LocalizedText>{t("notfound.title")}</LocalizedText>
              </h1>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              <LocalizedText>{t("notfound.description")}</LocalizedText>
            </p>

            <Link href="/">
              <Button className="mt-4 w-full" data-testid="button-go-home">
                <LocalizedText>{t("notfound.goHome")}</LocalizedText>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
