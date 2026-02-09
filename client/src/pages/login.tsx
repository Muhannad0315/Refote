import AuthForm from "@/components/auth-form";
import TopHeader from "@/components/top-header";
import { useI18n } from "@/lib/i18n";
import { LocalizedText } from "@/components/LocalizedText";

export default function LoginPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopHeader titleKey="auth.login.title" />

      <main className="max-w-2xl mx-auto p-4">
        <h2 className="text-xl font-semibold mb-4">
          <LocalizedText>{t("auth.login.welcome")}</LocalizedText>
        </h2>
        <AuthForm
          initialMode="login"
          allowCollapse={false}
          hideModeSwitch={true}
        />
      </main>
    </div>
  );
}
