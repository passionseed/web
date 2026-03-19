"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

const translations = {
  en: {
    title: "Forgot Password",
    description: "Enter your email address and we'll send you a link to reset your password.",
    email: "Email",
    emailPlaceholder: "you@example.com",
    sendLink: "Send Reset Link",
    sending: "Sending...",
    backToLogin: "Back to Login",
    success: "Check your email for a password reset link!",
    error: "Failed to send reset email. Please try again.",
  },
  th: {
    title: "ลืมรหัสผ่าน",
    description: "กรุณากรอกอีเมลของคุณ เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านให้คุณ",
    email: "อีเมล",
    emailPlaceholder: "you@example.com",
    sendLink: "ส่งลิงก์รีเซ็ต",
    sending: "กำลังส่ง...",
    backToLogin: "กลับไปหน้าเข้าสู่ระบบ",
    success: "กรุณาตรวจสอบอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน",
    error: "ไม่สามารถส่งอีเมลได้ กรุณาลองอีกครั้ง",
  },
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language] || translations["en"];

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || t.error);
      }
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-purple-950 to-purple-900 text-white border-none shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-6 w-6 text-[#91C4E3]" />
            <CardTitle className="text-2xl">{t.title}</CardTitle>
          </div>
          <CardDescription className="text-white/70">
            {t.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center py-6">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
                <p className="text-green-300">{t.success}</p>
              </div>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => router.push("/login")}
              >
                {t.backToLogin}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">
                  {t.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#91C4E3]"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-[#9D81AC] hover:bg-[#8B6F9B] text-white"
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.sending}
                  </>
                ) : (
                  t.sendLink
                )}
              </Button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-white/60 hover:text-white transition-colors mt-4"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.backToLogin}
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}