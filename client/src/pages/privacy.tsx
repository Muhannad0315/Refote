import React from "react";
import { useI18n } from "@/lib/i18n";
import { LocalizedText } from "@/components/LocalizedText";
import TopHeader from "@/components/top-header";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  const { t, isRTL } = useI18n();

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <TopHeader
        titleKey="privacy.title"
        leftIcon={<Shield className="h-5 w-5" />}
      />
      <main className="max-w-2xl mx-auto px-4 py-4">
        <p className="mb-4">{t("privacy.lastUpdated")}</p>
        <section className="prose dark:prose-invert">
          <p>{t("privacy.intro")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("privacy.collect.title")}
          </h2>
          <p>{t("privacy.collect.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("privacy.use.title")}
          </h2>
          <p>{t("privacy.use.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("privacy.location.title")}
          </h2>
          <p>{t("privacy.location.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("privacy.sharing.title")}
          </h2>
          <p>{t("privacy.sharing.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("privacy.retention.title")}
          </h2>
          <p>{t("privacy.retention.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("privacy.rights.title")}
          </h2>
          <p>{t("privacy.rights.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("privacy.security.title")}
          </h2>
          <p>{t("privacy.security.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("privacy.changes.title")}
          </h2>
          <p>{t("privacy.changes.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("privacy.contact.title")}
          </h2>
          <p>{t("privacy.contact.content")}</p>
        </section>
      </main>
    </div>
  );
}
