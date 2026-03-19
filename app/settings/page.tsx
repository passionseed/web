"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  User,
  Bell,
  Shield,
  Palette,
  ChevronRight,
  Globe,
  Moon,
  Sun,
  Laptop,
  Lock,
  Loader2,
  Key,
} from "lucide-react";
import { LanguagePicker } from "@/components/language-picker";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";

import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/lib/i18n/language-context";

const translations = {
  en: {
    headerTitle: "Settings",
    headerDesc: "Manage your account settings and preferences.",
    preferences: "Preferences",
    preferencesDesc: "Customize your experience.",
    language: "Language",
    languageDesc: "Select your preferred language.",
    appearance: "Appearance",
    appearanceDesc: "Switch between light and dark mode.",
    sections: {
      profile: {
        title: "Profile",
        desc: "Manage your public profile and personal details",
      },
      account: {
        title: "Account",
        desc: "Change your password and manage security settings",
      },
      notifications: {
        title: "Notifications",
        desc: "Manage your alerts (Coming Soon)",
      },
    },
    changePassword: {
      title: "Change Password",
      description: "Enter your new password below.",
      currentPassword: "Current Password",
      newPassword: "New Password",
      confirmPassword: "Confirm New Password",
      currentPlaceholder: "Enter current password",
      newPlaceholder: "Enter new password",
      confirmPlaceholder: "Confirm new password",
      submit: "Update Password",
      submitting: "Updating...",
      success: "Password updated successfully!",
      error: "Failed to update password. Please try again.",
      passwordMismatch: "Passwords do not match",
      passwordTooShort: "Password must be at least 6 characters",
      incorrectPassword: "Current password is incorrect",
    },
  },
  th: {
    headerTitle: "ตั้งค่า",
    headerDesc: "จัดการการตั้งค่าบัญชีและความชอบของคุณ",
    preferences: "ความชอบ",
    preferencesDesc: "ปรับแต่งประสบการณ์การใช้งานของคุณ",
    language: "ภาษา",
    languageDesc: "เลือกภาษาที่คุณต้องการ",
    appearance: "รูปลักษณ์",
    appearanceDesc: "เปลี่ยนระหว่างโหมดสว่างและโหมดมืด",
    sections: {
      profile: {
        title: "โปรไฟล์",
        desc: "จัดการโปรไฟล์สาธารณะและข้อมูลส่วนตัว",
      },
      account: {
        title: "บัญชี",
        desc: "เปลี่ยนรหัสผ่านและจัดการการตั้งค่าความปลอดภัย",
      },
      notifications: {
        title: "การแจ้งเตือน",
        desc: "จัดการการแจ้งเตือนของคุณ (เร็วๆ นี้)",
      },
    },
    changePassword: {
      title: "เปลี่ยนรหัสผ่าน",
      description: "กรุณากรอกรหัสผ่านใหม่ของคุณ",
      currentPassword: "รหัสผ่านปัจจุบัน",
      newPassword: "รหัสผ่านใหม่",
      confirmPassword: "ยืนยันรหัสผ่านใหม่",
      currentPlaceholder: "กรอกรหัสผ่านปัจจุบัน",
      newPlaceholder: "กรอกรหัสผ่านใหม่",
      confirmPlaceholder: "ยืนยันรหัสผ่านใหม่",
      submit: "อัปเดตรหัสผ่าน",
      submitting: "กำลังอัปเดต...",
      success: "อัปเดตรหัสผ่านสำเร็จ!",
      error: "ไม่สามารถอัปเดตรหัสผ่านได้ กรุณาลองอีกครั้ง",
      passwordMismatch: "รหัสผ่านไม่ตรงกัน",
      passwordTooShort: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
      incorrectPassword: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
    },
  },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();
  const t = translations[language] || translations["en"];
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, theme: newTheme });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError(t.changePassword.passwordTooShort);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t.changePassword.passwordMismatch);
      return;
    }

    setPasswordLoading(true);

    try {
      // Update password directly (user is already authenticated)
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordError(t.changePassword.error);
      } else {
        setPasswordSuccess(true);
        setTimeout(() => {
          setPasswordDialogOpen(false);
          setPasswordSuccess(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }, 2000);
      }
    } catch {
      setPasswordError(t.changePassword.error);
    } finally {
      setPasswordLoading(false);
    }
  };

  const settingsSections = [
    {
      title: t.sections.profile.title,
      description: t.sections.profile.desc,
      icon: User,
      href: "/profile",
      color: "text-blue-500",
    },
  ];

  return (
    <div className="container max-w-4xl py-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback>
            {user?.email?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.headerTitle}</h1>
          <p className="text-muted-foreground">{t.headerDesc}</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t.preferences}</CardTitle>
            <CardDescription>{t.preferencesDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4" /> {t.language}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t.languageDesc}
                </p>
              </div>
              <LanguagePicker />
            </div>

            {/* Theme */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4" /> {t.appearance}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t.appearanceDesc}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                <Button
                  variant={mounted && theme === "light" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleThemeChange("light")}
                  className="w-8 h-8 p-0"
                >
                  <Sun className="h-4 w-4" />
                </Button>
                <Button
                  variant={mounted && theme === "dark" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleThemeChange("dark")}
                  className="w-8 h-8 p-0"
                >
                  <Moon className="h-4 w-4" />
                </Button>
                <Button
                  variant={mounted && theme === "system" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleThemeChange("system")}
                  className="w-8 h-8 p-0"
                >
                  <Laptop className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {settingsSections.map((section) => (
            <Link key={section.title} href={section.href}>
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer border-2 hover:border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-medium">
                    <div className="flex items-center gap-2">
                      <section.icon className={`h-5 w-5 ${section.color}`} />
                      {section.title}
                    </div>
                  </CardTitle>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {section.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Account - Password Change */}
          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer border-2 hover:border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-500" />
                      {t.sections.account.title}
                    </div>
                  </CardTitle>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {t.sections.account.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  {t.changePassword.title}
                </DialogTitle>
                <DialogDescription>
                  {t.changePassword.description}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t.changePassword.newPassword}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder={t.changePassword.newPlaceholder}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t.changePassword.confirmPassword}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t.changePassword.confirmPlaceholder}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPasswordDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={passwordLoading || !newPassword || !confirmPassword}
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t.changePassword.submitting}
                      </>
                    ) : (
                      t.changePassword.submit
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Placeholder for Notifications */}
          <Card className="h-full opacity-60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-medium">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  {t.sections.notifications.title}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                {t.sections.notifications.desc}
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Dialog */}
      <AlertDialog open={passwordSuccess} onOpenChange={setPasswordSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.changePassword.success}</AlertDialogTitle>
            <AlertDialogDescription>
              Your password has been updated successfully.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setPasswordSuccess(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}