import React from "react";
import { useI18n } from "@/lib/i18n";
import TopHeader from "@/components/top-header";
import { FileText } from "lucide-react";

export default function TermsPage() {
  const { t, isRTL } = useI18n();

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <TopHeader
        titleKey="terms.title"
        leftIcon={<FileText className="h-5 w-5" />}
      />
      <main className="max-w-2xl mx-auto px-4 py-4">
        <p className="mb-4">{t("terms.lastUpdated")}</p>

        <section className="prose dark:prose-invert">
          <p>{t("terms.intro")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("terms.eligibility.title")}
          </h2>
          <p>{t("terms.eligibility.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("terms.accounts.title")}
          </h2>
          <p>{t("terms.accounts.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("terms.userContent.title")}
          </h2>
          <p>{t("terms.userContent.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("terms.acceptableUse.title")}
          </h2>
          <p>{t("terms.acceptableUse.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("terms.intellectual.title")}
          </h2>
          <p>{t("terms.intellectual.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("terms.termination.title")}
          </h2>
          <p>{t("terms.termination.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("terms.disclaimer.title")}
          </h2>
          <p>{t("terms.disclaimer.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("terms.liability.title")}
          </h2>
          <p>{t("terms.liability.content")}</p>

          <h2 className="text-xl font-semibold mb-4">
            {t("terms.changes.title")}
          </h2>
          <p>{t("terms.changes.content")}</p>
        </section>
      </main>
    </div>
  );
}
