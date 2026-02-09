import React, { useEffect, useState } from "react";
import BackButton from "@/components/back-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import TopHeader from "@/components/top-header";
import { Mail } from "lucide-react";

export default function FeedbackPage() {
  const { t, isRTL } = useI18n();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      setEmail(user.email ?? "");
      const meta = user.user_metadata ?? {};
      setName(meta.name || meta.full_name || "");
    } catch (_) {}
  }, [user]);

  function validateEmail(value: string) {
    if (!value) return true;
    return /^\S+@\S+\.\S+$/.test(value);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    // reset errors
    setError(null);
    setNameError(null);
    setEmailError(null);
    setMessageError(null);

    // Client-side validation before sending (per-field)
    let hasError = false;
    if (!name.trim()) {
      setNameError(t("feedback.validation.name"));
      hasError = true;
    }
    if (!email.trim()) {
      setEmailError(t("feedback.validation.email"));
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError(t("feedback.validation.email"));
      hasError = true;
    }
    if (!message.trim()) {
      setMessageError(t("feedback.validation.message"));
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/feedback", {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(result.error || t("feedback.error"));
        return;
      }
      setSuccess(true);
      setMessage("");
      setTimeout(() => setLocation("/"), 1200);
    } catch (err) {
      console.error("feedback send failed", err);
      setError(t("feedback.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-background pb-20"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <TopHeader
        titleKey="feedback.title"
        leftIcon={<Mail className="h-5 w-5" />}
      />
      <main className="max-w-2xl mx-auto p-4">
        <div className="py-2">
          <BackButton href="/" />
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t("feedback.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm mb-1 block">{t("feedback.name")}</label>
            <Input
              placeholder={t("feedback.name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={nameError ? "border-red-600" : undefined}
              aria-invalid={!!nameError}
            />
            {nameError && (
              <div className="text-sm text-red-600 mt-1">{nameError}</div>
            )}
          </div>
          <div>
            <label className="text-sm mb-1 block">{t("feedback.email")}</label>
            <Input
              placeholder={t("feedback.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={emailError ? "border-red-600" : undefined}
              aria-invalid={!!emailError}
            />
            {emailError && (
              <div className="text-sm text-red-600 mt-1">{emailError}</div>
            )}
          </div>
          <div>
            <label className="text-sm mb-1 block">
              {t("feedback.message")}
            </label>
            <Textarea
              placeholder={t("feedback.message")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={messageError ? "border-red-600" : undefined}
              aria-invalid={!!messageError}
            />
            {messageError && (
              <div className="text-sm text-red-600 mt-1">{messageError}</div>
            )}
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {success && (
            <div className="text-sm text-green-600">
              {t("feedback.success")}
            </div>
          )}

          <div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("feedback.sending") : t("feedback.send")}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
