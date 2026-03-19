"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Lock, Loader2, CheckCircle, XCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/lib/i18n/language-context";

const translations = {
  en: {
    title: "Reset Password",
    description: "Enter your new password below.",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    passwordPlaceholder: "Enter new password",
    confirmPlaceholder: "Confirm new password",
    resetButton: "Reset Password",
    resetting: "Resetting...",
    backToLogin: "Back to Login",
    success: "Password reset successfully! Redirecting to login...",
    error: "Failed to reset password. Please try again.",
    invalidLink: "This password reset link is invalid or has expired.",
    passwordMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 6 characters",
  },
  th: {
    title: "รีเซ็ตรหัสผ่าน",
    description: "กรุณากรอกรหัสผ่านใหม่ของคุณ",
    newPassword: "รหัสผ่านใหม่",
    confirmPassword: "ยืนยันรหัสผ่าน",
    passwordPlaceholder: "กรอกรหัสผ่านใหม่",
    confirmPlaceholder: "ยืนยันรหัสผ่านใหม่",
    resetButton: "รีเซ็ตรหัสผ่าน",
    resetting: "กำลังรีเซ็ต...",
    backToLogin: "กลับไปหน้าเข้าสู่ระบบ",
    success: "รีเซ็ตรหัสผ่านสำเร็จ! กำลังนำคุณไปหน้าเข้าสู่ระบบ...",
    error: "ไม่สามารถรีเซ็ตรหัสผ่านได้ กรุณาลองอีกครั้ง",
    invalidLink: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว",
    passwordMismatch: "รหัสผ่านไม่ตรงกัน",
    passwordTooShort: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
  },
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const t = translations[language] || translations["en"];

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Check if we have a valid session from the password reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      } else {
        // Try to get session from URL hash (Supabase puts tokens in URL hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (accessToken && type === "recovery") {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });
          if (!error) {
            setIsValidSession(true);
          } else {
            setIsValidSession(false);
          }
        } else {
          setIsValidSession(false);
        }
      }
    };

    checkSession();
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(t.error);
      } else {
        setSuccess(true);
        // Sign out and redirect to login after 2 seconds
        setTimeout(async () => {
          await supabase.auth.signOut();
          router.push("/login");
        }, 2000);
      }
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-purple-950 to-purple-900 text-white border-none shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-6 w-6 text-[#91C4E3]" />
            <CardTitle className="text-2xl">{t.title}</CardTitle>
          </div>
          <CardDescription className="text-white/70">
            {t.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isValidSession === false ? (
            <div className="text-center py-6">
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-300 mb-4">{t.invalidLink}</p>
              <Link href="/forgot-password">
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  {t.backToLogin}
                </Button>
              </Link>
            </div>
          ) : success ? (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <p className="text-green-300">{t.success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80">
                  {t.newPassword}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#91C4E3]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white/80">
                  {t.confirmPassword}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t.confirmPlaceholder}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.resetting}
                  </>
                ) : (
                  t.resetButton
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}