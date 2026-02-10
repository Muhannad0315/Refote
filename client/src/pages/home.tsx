import { useEffect } from "react";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { setSeoMeta } from "@/lib/seo";
import TopHeader from "@/components/top-header";
import LocalizedText from "@/components/LocalizedText";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Coffee, Star } from "lucide-react";
import logo from "@/assets/logo.png";

export default function Home() {
  const { t, language, isRTL } = useI18n();
  const [, navigate] = useLocation();

  useEffect(() => {
    setSeoMeta({
      title: t("home.seo.title"),
      description: t("home.seo.description"),
      keywords: t("home.seo.keywords"),
    });
  }, [language, t]);

  const features = [
    {
      icon: Search,
      titleKey: "home.features.discover.title",
      descKey: "home.features.discover.description",
    },
    {
      icon: Coffee,
      titleKey: "home.features.checkin.title",
      descKey: "home.features.checkin.description",
    },
    {
      icon: Star,
      titleKey: "home.features.rate.title",
      descKey: "home.features.rate.description",
    },
  ];

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <TopHeader />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <section
          className="flex flex-col items-center text-center mb-10"
          data-testid="section-hero"
        >
          <img
            src={logo}
            alt={`${t("app.name")} logo`}
            className="h-20 w-20 mb-4"
            data-testid="img-home-logo"
          />
          <h1 className="text-3xl font-bold font-serif mb-2">
            <LocalizedText>{t("app.name")}</LocalizedText>
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            <LocalizedText>{t("home.hero.tagline")}</LocalizedText>
          </p>
          <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
            <LocalizedText>{t("home.hero.description")}</LocalizedText>
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/discover")}
            data-testid="button-cta-discover"
          >
            <LocalizedText>{t("home.cta")}</LocalizedText>
          </Button>
        </section>

        <section className="grid gap-4" data-testid="section-features">
          {features.map((f) => (
            <Card key={f.titleKey}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex-shrink-0 mt-1 text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-semibold mb-1">
                    <LocalizedText>{t(f.titleKey)}</LocalizedText>
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <LocalizedText>{t(f.descKey)}</LocalizedText>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
